#!/usr/bin/env python3

# Author: Maciej Dobrzynski, Instutute of Cell Biology, University of Bern, Switzerland
# Date: May 2020
#
# For a given plate geometry (params -p, -w):
# - find images corresponding to individual FOVs in a specified folder,
# - combine them into a large montage,
# - make a DeepZoom pyramid tiling.
#
# INPUT
# The script searches for images in a specified folder
# given the plate geometry. It does not loop through all images in the folder!
# If an image is missing, the script inserts an empty image to the montage.
#
# Names of image files need to follow the convention:
# A02f23d2.ext
#
# where:
# xxxx - some text
# A02 - well
# f23 - fov
# d2 - channel
# ext - extension, e.g. TIFF
#
# OUTPUT
# A DZI file and corresponding tiles are saved in a specified output folder
# (-o). The core name of the DZI file is based on the input (-f).
#
# Script's input params allow to specify the format of the plate,
# e.g. for the 384-well format with 16 images per well use
# -p 24 16 -w 4 4


import os
import argparse
from PIL import Image, ImageDraw, ImageFont
import imageio
import numpy as np
import time  # time the execution
# import concurrent.futures  # try to accomplish this the second way
from joblib import Parallel, delayed

####
# This section contains the code from: https://github.com/openzoom/deepzoom.py
##
# Python Deep Zoom Tools
##
# Copyright (c) 2008-2019, Daniel Gasienica <daniel@gasienica.ch>
# Copyright (c) 2008-2011, OpenZoom <http://openzoom.org/>
# Copyright (c) 2010, Boris Bluntschli <boris@bluntschli.ch>
# Copyright (c) 2008, Kapil Thangavelu <kapil.foss@gmail.com>
# All rights reserved.

import io
import math
import os
import shutil
from urllib.parse import urlparse
import sys
import time
import urllib.request
import warnings
import xml.dom.minidom

from collections import deque


NS_DEEPZOOM = "http://schemas.microsoft.com/deepzoom/2008"

DEFAULT_RESIZE_FILTER = Image.ANTIALIAS
DEFAULT_IMAGE_FORMAT = "png"

RESIZE_FILTERS = {
    "cubic": Image.CUBIC,
    "bilinear": Image.BILINEAR,
    "bicubic": Image.BICUBIC,
    "nearest": Image.NEAREST,
    "antialias": Image.ANTIALIAS,
}

IMAGE_FORMATS = {
    "jpg": "jpg",
    "png": "png",
}


class DeepZoomImageDescriptor(object):
    def __init__(
        self,
        width=None,
        height=None,
        tile_size=254,
        tile_overlap=1,
        tile_format="png"
    ):
        self.width = width
        self.height = height
        self.tile_size = tile_size
        self.tile_overlap = tile_overlap
        self.tile_format = tile_format
        self._num_levels = None

    def save(self, destination):
        """Save descriptor file."""
        file = open(destination, "wb")
        doc = xml.dom.minidom.Document()
        image = doc.createElementNS(NS_DEEPZOOM, "Image")
        image.setAttribute("xmlns", NS_DEEPZOOM)
        image.setAttribute("TileSize", str(self.tile_size))
        image.setAttribute("Overlap", str(self.tile_overlap))
        image.setAttribute("Format", str(self.tile_format))
        size = doc.createElementNS(NS_DEEPZOOM, "Size")
        size.setAttribute("Width", str(self.width))
        size.setAttribute("Height", str(self.height))
        image.appendChild(size)
        doc.appendChild(image)
        descriptor = doc.toxml(encoding="UTF-8")
        file.write(descriptor)
        file.close()

    @classmethod
    def remove(self, filename):
        """Remove descriptor file (DZI) and tiles folder."""
        _remove(filename)

    @property
    def num_levels(self):
        """Number of levels in the pyramid."""
        if self._num_levels is None:
            max_dimension = max(self.width, self.height)
            self._num_levels = int(math.ceil(math.log(max_dimension, 2))) + 1
        return self._num_levels

    def get_scale(self, level):
        """Scale of a pyramid level."""
        assert 0 <= level and level < self.num_levels, "Invalid pyramid level"
        max_level = self.num_levels - 1
        return math.pow(0.5, max_level - level)

    def get_dimensions(self, level):
        """Dimensions of level (width, height)"""
        assert 0 <= level and level < self.num_levels, "Invalid pyramid level"
        scale = self.get_scale(level)
        width = int(math.ceil(self.width * scale))
        height = int(math.ceil(self.height * scale))
        return (width, height)

    def get_num_tiles(self, level):
        """Number of tiles (columns, rows)"""
        assert 0 <= level and level < self.num_levels, "Invalid pyramid level"
        w, h = self.get_dimensions(level)
        return (
            int(math.ceil(float(w) / self.tile_size)),
            int(math.ceil(float(h) / self.tile_size)),
        )

    def get_tile_bounds(self, level, column, row):
        """Bounding box of the tile (x1, y1, x2, y2)"""
        assert 0 <= level and level < self.num_levels, "Invalid pyramid level"
        offset_x = 0 if column == 0 else self.tile_overlap
        offset_y = 0 if row == 0 else self.tile_overlap
        x = (column * self.tile_size) - offset_x
        y = (row * self.tile_size) - offset_y
        level_width, level_height = self.get_dimensions(level)
        w = self.tile_size + (1 if column == 0 else 2) * self.tile_overlap
        h = self.tile_size + (1 if row == 0 else 2) * self.tile_overlap
        w = min(w, level_width - x)
        h = min(h, level_height - y)
        return (x, y, x + w, y + h)


class ImageCreator(object):
    """Creates Deep Zoom images."""

    def __init__(
        self,
        tile_size=254,
        tile_overlap=1,
        tile_format="png",
        image_quality=0.8,
        resize_filter=None,
        copy_metadata=False,
    ):
        self.tile_size = int(tile_size)
        self.tile_format = tile_format
        self.tile_overlap = _clamp(int(tile_overlap), 0, 10)
        self.image_quality = _clamp(image_quality, 0, 1.0)

        if not tile_format in IMAGE_FORMATS:
            self.tile_format = DEFAULT_IMAGE_FORMAT
        self.resize_filter = resize_filter
        self.copy_metadata = copy_metadata

    def get_image(self, level):
        """Returns the bitmap image at the given level."""
        assert (
            0 <= level and level < self.descriptor.num_levels
        ), "Invalid pyramid level"
        width, height = self.descriptor.get_dimensions(level)
        # don't transform to what we already have
        if self.descriptor.width == width and self.descriptor.height == height:
            return self.image
        if (self.resize_filter is None) or (self.resize_filter not in RESIZE_FILTERS):
            return self.image.resize((width, height), Image.ANTIALIAS)
        return self.image.resize((width, height), RESIZE_FILTERS[self.resize_filter])

    def tiles(self, level):
        """Iterator for all tiles in the given level. Returns (column, row) of a tile."""
        columns, rows = self.descriptor.get_num_tiles(level)
        for column in range(columns):
            for row in range(rows):
                yield (column, row)

    def tiles_list(self, level):
        """returns the entire list of tiles at the given level, useful for multithreading"""
        result = []
        columns, rows = self.descriptor.get_num_tiles(level)
        for column in range(columns):
            for row in range(rows):
                result.append((column, row))
        return result

    def create_helper2(self, level):
        """helper function used to resize the image at the given level and then crop
        colxrow times"""
        if (DEB):
            print("Pyramid level %d" % level)

        level_dir = _get_or_create_path(
            os.path.join(self.image_files, str(level)))
        level_image = self.get_image(level)
        get_tile_bounds = self.descriptor.get_tile_bounds
        for (column, row) in self.tiles(level):

            if (DEB):
                print("Pyramid col x row: %d %d" % (column, row))

            bounds = get_tile_bounds(level, column, row)
            tile = level_image.crop(bounds)
            format = self.descriptor.tile_format
            tile_path = os.path.join(level_dir, "%s_%s.%s" %
                                     (column, row, format))
            tile_file = open(tile_path, "wb")

            if self.descriptor.tile_format == "jpg":
                jpeg_quality = int(self.image_quality * 100)
                tile.save(tile_file, "JPEG", quality=jpeg_quality)
            else:
                png_compress = round((1 - self.image_quality)*10)
                tile.save(tile_file, compress_level=png_compress)

    def create(self, source, destination,cores):
        """Creates Deep Zoom image from source file and saves it to destination."""

        # Open the source image for DZI tiling from a file
        # self.image = Image.open(safe_open(source))

        # The source image for DZI tiling is a PIL.Image objects
        # cores specify the number of threads used in parallelization
        self.image = source
        width, height = self.image.size

        self.descriptor = DeepZoomImageDescriptor(
            width=width,
            height=height,
            tile_size=self.tile_size,
            tile_overlap=self.tile_overlap,
            tile_format=self.tile_format,
        )

        # Create tiles
        self.image_files = _get_or_create_path(_get_files_path(destination))
        # create a list of levels to put in as argument for multithreading
        Parallel(n_jobs=cores,backend="threading")(delayed(self.create_helper2)(level)
                           for level in range(self.descriptor.num_levels-3)) # last 2-3 levels are heavily dominated by the io procedures
        # iterate over the last few levels and parallelize the cropping
        with Parallel(n_jobs=6,backend="threading") as parallel: #by trial and error 6threads gave the optimal spead for cropping
            for level in range(self.descriptor.num_levels-3, self.descriptor.num_levels):
                if (DEB):
                    print("Pyramid level %d" % level)
                self.level = level
                self.level_dir = _get_or_create_path(
                    os.path.join(self.image_files, str(level)))
                self.level_image = self.get_image(level)
                dims = self.tiles_list(level)
                parallel(delayed(self.create_helper)(dim)
                                for dim in dims)

        # Create descriptor
        self.descriptor.save(destination)

    def create_helper(self, dim):
        """helper function to create tiles at the given level, used when multithreading is applied to cropping"""
        if (DEB):
            print("Pyramid col x row: %d %d" % (dim[0], dim[1]))
        bounds = self.descriptor.get_tile_bounds(self.level, dim[0], dim[1])
        tile = self.level_image.crop(bounds)
        format = self.descriptor.tile_format
        tile_path = os.path.join(self.level_dir, "%s_%s.%s" %
                                 (dim[0], dim[1], format))
        tile_file = open(tile_path, "wb")
        if self.descriptor.tile_format == "jpg":
            jpeg_quality = int(self.image_quality * 100)
            tile.save(tile_file, "JPEG", quality=jpeg_quality)
        else:
            png_compress = round((1 - self.image_quality)*10)
            tile.save(tile_file, compress_level=png_compress)


def _get_or_create_path(path):
    if not os.path.exists(path):
        os.makedirs(path)
    return path


def _get_files_path(path):
    return os.path.splitext(path)[0] + "_files"


def _clamp(val, min, max):
    if val < min:
        return min
    elif val > max:
        return max
    return val

# end of section from: https://github.com/openzoom/deepzoom.py
####


def parseArguments():
    # Create argument parser
    parser = argparse.ArgumentParser()

    # Positional mandatory arguments
    parser.add_argument(
        'indir',
        help='Input folder with images. Mandatory!',
        type=str)

    # Optional arguments
    parser.add_argument(
        '-v',
        '--verbose',
        help='Verbose, more output.',
        default=False,
        action="store_true")

    parser.add_argument(
        '-i',
        '--inv',
        help='Inverse the output image.',
        default=False,
        action="store_true")

    parser.add_argument(
        '-f',
        '--outfile',
        help='Name of the output DZI file, default \"dzi\"',
        type=str,
        default='dzi')

    parser.add_argument(
        '-o',
        '--outdir',
        help='Output folder to put DZI tiling, default dzi',
        type=str,
        default='dzi')

    parser.add_argument(
        '-p',
        '--platedim',
        help='Plate dimensions. Provide two integers separated by a white space; default 24x16',
        nargs=2,
        type=int,
        default=(24, 16))

    parser.add_argument(
        '-w',
        '--welldim',
        help='Well dimensions. Provide two integers separated by a white space; default 4x4',
        nargs=2,
        type=int,
        default=(4, 4))

    parser.add_argument(
        '-m',
        '--imdim',
        help='Image dimensions. Provide two integers separated by a white space; default 1104x1104',
        nargs=2,
        type=int,
        default=(1104, 1104))

    parser.add_argument(
        '-I',
        '--imint',
        help='Image intensities for rescaling. Provide two integers separated by a white space; default (250, 3000)',
        nargs=2,
        type=int,
        default=(250, 3000))

    parser.add_argument(
        '-c',
        '--imch',
        help='Channel of the image to process, default 0',
        type=int,
        default=0)

    parser.add_argument(
        '-x',
        '--imext',
        help='File extension of the image to process, default TIFF',
        type=str,
        default='TIFF')

    parser.add_argument(
        '-r',
        '--cores',
        help='Number of cores for multiprocessing, default 4',
        type=int,
        default=4)

    parser.add_argument(
        '-t',
        '--tilesz',
        help='Size of DeepZoom tiles, default 254',
        type=int,
        default=254)

    parser.add_argument(
        '-q',
        '--imquality',
        help='Image quality (0.1 - 1) for JPG or compression level for PNG, default 0.8.',
        type=float,
        default=0.8)

    # Parse arguments
    args = parser.parse_args()
    args.platedim = tuple(args.platedim)
    args.welldim = tuple(args.welldim)
    args.imdim = tuple(args.imdim)

    return args


def processWell(inRow, inCol):
    # create canvas for the montage
    locImWell = Image.new(imMode, (imWellWidth, imWellHeight), bgEmptyWell)

    locIrow = inRow
    locIcol = inCol

    # Read images of FOVs of a single well
    # Assumption: image files are named according to a convetion xxxx_A01f00d1
    # A01 - well
    # f00 - fov
    # d1 - channel

    for locIfov in wellFOVs:

        #        locImPath = "%s%02df%02dd%d.%s" % (imDir + '/' + imCore + locIrow, locIcol, locIfov, imCh, imExt)
        locImPath = "%s%02df%02dd%d.%s" % (
            imDir + '/' + locIrow, locIcol, locIfov, imCh, imExt)
        if(DEB):
            print("\nChecking:", locImPath)

        # Handle errors if the image file is inaccessible/corrupt
        flagFileExists = os.path.isfile(
            locImPath) and os.access(locImPath, os.R_OK)
        flagFileOK = True

        try:
            locImFOV = imageio.imread(locImPath)
        except (IOError, SyntaxError, IndexError, ValueError) as e:
            print('Corrupted file:', locImPath)
            flagFileOK = False

        if flagFileExists and flagFileOK:
            if(DEB):
                print("File exists and is readable")

            # Image stats
            if (DEB):
                locImMean, locImSD, locImMin, locImMax = locImFOV.mean(
                ), locImFOV.std(), locImFOV.min(), locImFOV.max()
                print("Raw mean=%.2f\tsd=%.2f\tmin=%d\tmax=%d" %
                      (locImMean, locImSD, locImMin, locImMax))

            # Clip intensities;
            # has to be done before rescaling, to avoid overflow of uint16
            locImFOVclip = np.clip(locImFOV, imIntMin, imIntMax)

            # Rescale to max range of the input bit depth (working with integers!)
            locImFOVresc = np.round((locImFOVclip - imIntMin) * imRescFac)
            locImFOVresc = locImFOVresc.astype('uint16')

            # convert to 8-bit
            locIm8 = (locImFOVresc >> 8).astype('uint8')

            # Invert the final image if imInv = True
            if(imInv):
                locIm8 = (~locIm8)

            if (DEB):
                locImMean, locImSD, locImMin, locImMax = locIm8.mean(
                ), locIm8.std(), locIm8.min(), locIm8.max()
                print("New mean=%.2f\tsd=%.2f\tmin=%d\tmax=%d" %
                      (locImMean, locImSD, locImMin, locImMax))

            locIm8fin = Image.fromarray(locIm8, imMode)

        else:
            if(DEB):
                print("Either the file is missing or not readable; creating blank")

            # create an empty file
            locIm8fin = Image.new(imMode, (imWidth, imHeight), bgEmptyFOV)
            locImDraw = ImageDraw.Draw(locIm8fin)

            locMyLabel = "f%02d missing" % locIfov

            locImDraw.text((labelFOVposX, labelFOVposY),
                           locMyLabel, labelFOVcol, font=myFontFOV)

        # Add image to montage canvas

        locWellCol = locIfov % wellWidth
        locWellRow = locIfov // wellWidth

        locWellPosW = locWellCol * (imWidth + paddingFOV)
        locWellPosE = locWellPosW + imWidth
        locWellPosN = locWellRow * (imHeight + paddingFOV)
        locWellPosS = locWellPosN + imHeight

        # bounding box for inserting the image into the canvas
        locBbox = (locWellPosW, locWellPosN, locWellPosE, locWellPosS)

        if (DEB):
            print('Bounding box for inserting FOV image into Well canvas:')
            print(locBbox)

        locImWell.paste(locIm8fin, locBbox)

    # Add well label to the montage
    locImDrawWell = ImageDraw.Draw(locImWell)
    locMyLabelWell = "%s%02d" % (locIrow, locIcol)
    locImDrawWell.text((labelWellPosX, labelWellPosY), locMyLabelWell,
                       labelWellCol, font=myFontWell, align='left')

    return(locImWell)


if __name__ == "__main__":
    args = parseArguments()
    # Global constants
    if args.verbose:
        DEB = 1
    else:
        DEB = 0

    # Dimensions of a plate
    plateWidth, plateHeight = args.platedim

    # FOVs in a well
    wellWidth, wellHeight = args.welldim

    # dimensions of the blank image
    imWidth, imHeight = args.imdim

    # channel: 0-2
    imCh = args.imch

    # extension of the image file
    imExt = args.imext

    # directory with image files
    imDir = args.indir

    # Values for clipping image intensities
    imIntMin, imIntMax = args.imint

    # flag for image inversion
    imInv = args.inv

    # number of cores for multiprocessing
    cores = args.cores

    # Raw print arguments
    if (DEB):
        print("You are running the script with arguments: ")
        for a in args.__dict__:
            print(str(a) + ': ' + str(args.__dict__[a]))

        print('')

    paddingFOV = 5  # pixels; padding between FOV in a well
    paddingWell = 30  # pixels; padding between wells in a plate

    # Parameters of the input image
    imDepthIn = 2**16-1

    # Rescaling factor based on image depth and upper clipping intensity
    imRescFac = imDepthIn / (imIntMax - imIntMin)

    # Parameters of the output image
    imDepthOut = 2**8-1
    # 8-bit pixels, black and white (https://pillow.readthedocs.io/en/stable/handbook/concepts.html#concept-modes)
    imMode = 'L'

    # Initialisation

    plateCol = range(0, plateWidth)
    plateRow = list(map(chr, range(65, 65 + plateHeight)))
    wellFOVs = range(0, wellWidth*wellHeight)

    imWellWidth = int(imWidth*wellWidth + paddingFOV*(wellWidth-1))
    imWellHeight = int(imHeight*wellHeight + paddingFOV*(wellHeight-1))

    imPlateWidth = int(imWellWidth*plateWidth + paddingWell*(plateWidth-1))
    imPlateHeight = int(imWellHeight*plateHeight + paddingWell*(plateHeight-1))

    labelFOVposX = int(round(imWidth * 0.05))
    labelFOVposY = int(round(imHeight * 0.4))

    labelWellPosX = round(imWellWidth * 0.46)
    labelWellPosY = 20

    if (imInv):
        labelFOVcol = 10
        labelWellCol = 10
        bgEmptyFOV = int(imDepthOut * 0.7)  # color of empty FOV
        bgEmptyWell = 100  # color of empty canvas for well montage
        bgEmptyPlate = 10  # color of empty canvas for plate montage
    else:
        labelFOVcol = 10
        labelWellCol = 250
        bgEmptyFOV = int(imDepthOut * 0.7)  # color of empty FOV
        bgEmptyWell = imDepthOut  # color of empty canvas for well montage
        bgEmptyPlate = imDepthOut  # color of empty canvas for plate montage

    myFontFOV = ImageFont.truetype(font='fonts/arial.ttf', size=200)
    myFontWell = ImageFont.truetype(font='fonts/arial.ttf', size=300)

    # Work

    if (DEB):
        print("Making montage of individual FOVs\n")

    # create canvas for montage of the entire plate
    imPlate = Image.new(imMode, (imPlateWidth, imPlateHeight), bgEmptyPlate)

    for iRow in range(0, plateHeight):
        for iCol in plateCol:
            # Add image to montage canvas

            platePosW = iCol * (imWellWidth + paddingWell)
            platePosE = platePosW + imWellWidth
            platePosN = iRow * (imWellHeight + paddingWell)
            platePosS = platePosN + imWellHeight
            bbox = (platePosW, platePosN, platePosE, platePosS)

            if (DEB):
                print('\nBounding box for inserting Well image into Plate canvas:')
                print(bbox)

            imWell = processWell(plateRow[iRow], iCol+1)
            imPlate.paste(imWell, bbox)

    imPathDir = '%s/%s.dzi' % (args.outdir, args.outfile)
    if (DEB):
        print("\nMaking DeepZoom tiling in:\n" + imPathDir)

    creator = ImageCreator(
        tile_size=args.tilesz,
        tile_format='png',
        image_quality=args.imquality,
        resize_filter=None,
    )
    start = time.time()
    creator.create(imPlate, imPathDir,cores)
    print("Execution time of the creator function is:", time.time()-start)
    if(DEB):
        print("\nAnalysis finished!\n")
