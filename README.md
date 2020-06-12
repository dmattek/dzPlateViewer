# Deep Zoom Plate Viewer

An html-based plate viewer for microscopy images using [DeepZoom](https://en.wikipedia.org/wiki/Deep_Zoom) technology.

## Big demo

A demo web-viewer of a **6 gigapixel** image montage created out of 12'300 1024x1024 pixel images. The montage comes from imaging of an 384-well plate (24x16 wells, 4x4 FOVs per well, 2 channels). The demo can be accessed [here](http://macdobry.net/deepzoomdemo/demoscreen/index.html).

## Small demo

A demo web-viewer with 2x2 wells, 4x4 FOVs per well can be accessed [here](http://macdobry.net/deepzoomdemo/demosite2x2/index.html).

A `zip` archive with a dataset used to produce that demo can be downloaded from [here](https://www.dropbox.com/s/5cmejgy9x21434n/demodata2x2.zip?dl=0).

A `zip` archive with a full demo website can be downloaded from [here](https://www.dropbox.com/s/lwycuvlqdtirvr8/demosite2x2.zip?dl=0).


## Building blocks

* [Python Deep Zoom Tools](https://github.com/openzoom/deepzoom.py) to generate an image montage and the `dzi` pyramid file/folder structure with png image tiles.
* [OpenSeadragon](https://openseadragon.github.io), an open-source, web-based viewer for high-resolution zoomable images, implemented in pure JavaScript, for desktop and mobile.
* [OpenSeadragon Filtering](https://github.com/usnistgov/OpenSeadragonFiltering) plugin with image filters to adjust contrast, brightness, levels in real time.
* [Flat Design Icon](https://github.com/peterthomet/openseadragon-flat-toolbar-icons) set for the viewer.
* [Python Imaging Library](https://en.wikipedia.org/wiki/Python_Imaging_Library) and [imageio](https://pypi.org/project/imageio/) to read/write images.

## Content

* `scripts/makePlateMontageDZI.py`\
A Python script to convert individual `TIFF` image files into a `dzi` pyramid.
* `HTML-template`\
HTML template files with a basic single-channel viewer and a multi-channel viewer with real time image adjustments.
* `demosite2x2/openseadragon`\
OpenSeadragon Java Script viewer of `dzi` pyramids.
* `demosite2x2/openseadragonsiltering`\
An OpenSeadragon plugin with image filters.

## Usage

Image files should follow the following naming convention:

```
A01f00d0.TIFF
A01f00d1.TIFF
...
B12f13d2.TIFF
```

Where:
* `A01, A02, ... B12, ...` is the well name,
* `f00, f01, ...` is the field of view,
* `d01, d02, ...` is the channel number.

The parameters `-p` and `-w` of the `scripts/makePlateMontageDZI.py` script prescribe the geometry of the plate and the well, respectively. For example, `-p 2 2 -w 4 4` define 2x2 wells and 4x4 FOVs per well. With this definition, the script assumes 64 images per channel. If an image is missing, the script will fill the gap with an empty image with an appropriate label.

The script adds grid lines to the composite image; thin lines are added between FOVs, thicker lines are added between wells. In addition, wells are labeled with well names.

To generate `dzi` image pyramids for both channels in the `../demosite2x2` folder from data in `../demodata2x2`, execute:

```
./makePlateMontageDZI.py -v -p 2 2 -w 4 4 -c 0 -f dzi_c0 -o ../demosite2x2 ../demodata2x2
./makePlateMontageDZI.py -v -p 2 2 -w 4 4 -c 1 -f dzi_c1 -o ../demosite2x2 ../demodata2x2
```
