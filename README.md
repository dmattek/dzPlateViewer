# Deep Zoom Plate Viewer

An html-based plate viewer for microscopy images using [DeepZoom](https://en.wikipedia.org/wiki/Deep_Zoom) technology.

![demo](screencast/dzPlateViewer03.gif')

## Big demo

A [demo](http://macdobry.net/deepzoomdemo/demoscreen/index.html) web-viewer of a **6 gigapixel** image montage created out of 12'300 1024x1024 pixel images.

The montage is an excerpt from a project between [Pertz Lab](https://www.pertzlab.net) at the University of Bern and the [Department of Pharmaceutical Sciences](https://pharma.unibas.ch/en/persons/eliane-garo/) at the University of Basel. We are looking for compounds that inhibit cell proliferation, one of the [hallmarks of cancer](https://en.wikipedia.org/wiki/The_Hallmarks_of_Cancer).

The images depict melanoma cells treated with various plant-derived compounds. The cells contain 3 fluorescent [biosensors](https://en.wikipedia.org/wiki/Biosensor) that emit light in their respective wavelengths when illuminated with a specific light frequency. One of the biosensors is used to locate the cells and to perform automatic [image segmentation](https://en.wikipedia.org/wiki/Image_segmentation). The other two biosensors sense and measure the activity of two important proteins, [ERK](https://en.wikipedia.org/wiki/Extracellular_signal-regulated_kinases) and [Akt](https://en.wikipedia.org/wiki/Protein_kinase_B), involved in cell proliferation. If a drug-candidate compound stops cell proliferation, we observe changes in biosensor fluorescence, which we can image and analyse.

The experiment is performed in a 384-well plate format, where each well contains cells subject to a different treatment. A camera mounted on a microscope takes the images (1024x1024 pixels) at 3 different wavelengths (3 channels) in 16 locations of a well (4x4 fields of view), and repeats the process for all 384 wells (24x16 wells).

The [demo](http://macdobry.net/deepzoomdemo/demoscreen/index.html) shows the result of imaging of one of such plates.

## Small demo

A [demo](http://macdobry.net/deepzoomdemo/demosite2x2/index.html) web-viewer with 2x2 wells, 4x4 FOVs per well.

A `zip` archive with a dataset used to produce that demo can be downloaded from [here](https://www.dropbox.com/s/5cmejgy9x21434n/demodata2x2.zip?dl=0).

A `zip` archive with a full demo website can be downloaded from [here](https://www.dropbox.com/s/lwycuvlqdtirvr8/demosite2x2.zip?dl=0).


## Building blocks

* [Python Deep Zoom Tools](https://github.com/openzoom/deepzoom.py) to generate an image montage and the `dzi` pyramid file/folder structure with png image tiles.
* [OpenSeadragon](https://openseadragon.github.io), an open-source, web-based viewer for high-resolution zoomable images, implemented in pure JavaScript, for desktop and mobile.
* [OpenSeadragon Filtering](https://github.com/usnistgov/OpenSeadragonFiltering) plugin with image filters to adjust contrast, brightness, levels in real time.
* [OpenSeadragon CanvasOverlay](https://github.com/altert/OpenSeadragonCanvasOverlay) plugin that adds the canvas overlay ability to OSD images.
* [Flat Design Icon](https://github.com/peterthomet/openseadragon-flat-toolbar-icons) set for the viewer.
* [Python Imaging Library](https://en.wikipedia.org/wiki/Python_Imaging_Library) and [imageio](https://pypi.org/project/imageio/) to read/write images.
* [D3.js](https://d3js.org/) for interactive data visualization.

## Content

* `scripts/makePlateMontageDZI.py`\
A Python script to convert individual `TIFF` image files into a `dzi` pyramid.
* `HTML-template`\
HTML template files with a basic single-channel viewer and a multi-channel viewer with real time image adjustments.
* `demosite2x2/openseadragon`\
OpenSeadragon Java Script viewer of `dzi` pyramids.
* `demosite2x2/openseadragonsiltering`\
An OpenSeadragon plugin with image filters.
* `demosite2x2/openseadragoncanvasoverlay`\
An OpenSeadragon plugin for adding canvas overlay to OSD images.
* `jscripts`\
JavaScript files used to create sliders and interactive heatmaps based on CSV data.

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

The parameter `-r` of the `scripts/makePlateMontageDZI.py` script determines the number of threads to be used in creating the deepzoom pyramid, the default is 4.

To generate `dzi` image pyramids for both channels in the `../demosite2x2` folder from data in `../demodata2x2`, execute:

```
./makePlateMontageDZI.py -v -p 2 2 -w 4 4 -c 0 -f dzi_c0 -o ../demosite2x2 ../demodata2x2
./makePlateMontageDZI.py -v -p 2 2 -w 4 4 -c 1 -f dzi_c1 -o ../demosite2x2 ../demodata2x2
```
