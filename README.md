[![DOI](https://zenodo.org/badge/263708831.svg)](https://doi.org/10.5281/zenodo.17201410)

# Deep Zoom Plate Viewer

An html-based plate viewer for microscopy images using [DeepZoom](https://en.wikipedia.org/wiki/Deep_Zoom) technology.

https://user-images.githubusercontent.com/25979488/135925752-0fa829a3-bd39-445d-9682-151ebce71d20.mp4

## Big demo

A [demo](http://macdobry.net/deepzoomdemo/demoscreen/index.html) web-viewer of a **6 gigapixel** image montage created out of 12'300 1024x1024 pixel images.

The montage is an excerpt from a project between [Pertz Lab](https://www.pertzlab.net) at the University of Bern and the [Department of Pharmaceutical Sciences](https://pharma.unibas.ch/en/persons/eliane-garo/) at the University of Basel. We are looking for compounds that inhibit cell proliferation, one of the [hallmarks of cancer](https://en.wikipedia.org/wiki/The_Hallmarks_of_Cancer).

The images depict melanoma cells treated with various plant-derived compounds. The cells contain 3 fluorescent [biosensors](https://en.wikipedia.org/wiki/Biosensor) that emit light in their respective wavelengths when illuminated with a specific light frequency. One of the biosensors is used to locate the cells and to perform automatic [image segmentation](https://en.wikipedia.org/wiki/Image_segmentation). The other two biosensors sense and measure the activity of two important proteins, [ERK](https://en.wikipedia.org/wiki/Extracellular_signal-regulated_kinases) and [Akt](https://en.wikipedia.org/wiki/Protein_kinase_B), involved in cell proliferation. If a drug-candidate compound stops cell proliferation, we observe changes in biosensor fluorescence, which we can image and analyse.

The experiment is performed in a 384-well plate format, where each well contains cells subject to a different treatment. A camera mounted on a microscope takes the images (1024x1024 pixels) at 3 different wavelengths (3 channels) in 16 locations of a well (4x4 fields of view), and repeats the process for all 384 wells (24x16 wells).

The [demo](http://macdobry.net/deepzoomdemo/demoscreen/index.html) shows the result of imaging of one of such plates.

## Small demo

A [demo](http://macdobry.net/deepzoomdemo/demosite2x2/index.html) web-viewer with 2x2 wells, 4x4 FOVs per well.

A `zip` archive with a dataset used to produce that demo can be downloaded from [here](https://macdobry.net/deepzoomdemo/demo-img-data2x2.zip).

A `zip` archive with a full demo website can be downloaded from [here](https://macdobry.net/deepzoomdemo/demo-site2x2.zip).


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
t1_A01_s1_w1_z1.tif
t1_A01_s1_w2_z1.tif
...
t1_B12_s16_w3_z1.tif
```

Where:
* `t1` is the time point (fixed),
* `A01, A02, ... B12, ...` is the well name,
* `s1, s2, ...` is the field of view, starting from 1,
* `w1, w2, ...` is the channel number, as given by the `-c` parameter of the script,
* `z1` is the z-plane (fixed).

Images named according to the old convention, e.g. `A01_f00_d0.TIFF` (field of view `f00, f01, ...` starting from 0, channel `d0, d1, ...`, as given by `-c`), can be processed by swapping the `locImPath` line in `processWell()` of `scripts/makePlateMontageDZI.py` with the commented one below it.

The parameters `-p` and `-w` of the `scripts/makePlateMontageDZI.py` script prescribe the geometry of the plate and the well, respectively. 
For example, `-p 2 2 -w 4 4` defines a plate with 2x2 wells and wells with 4x4 FOVs. 
With this definition, the script assumes a total of 4x16=64 images per channel. 
If an image is missing, the script will fill the gap with an empty image with an appropriate label.
The script adds grid lines to the composite image; thin lines are added between FOVs, thicker lines are added between wells. 
Additionally, wells are labeled with well names.

The parameter `-r` of the `scripts/makePlateMontageDZI.py` script determines the number of threads used to write the deepzoom tiles, the default is 2.

To generate `dzi` image pyramids for both channels in the `../demosite2x2` folder from data in `../demodata2x2` (images named according to the old convention, see above), execute:

```
./makePlateMontageDZI.py -v -p 2 2 -w 4 4 -c 0 -f dzi_c0 -o ../demosite2x2 ../demodata2x2
./makePlateMontageDZI.py -v -p 2 2 -w 4 4 -c 1 -f dzi_c1 -o ../demosite2x2 ../demodata2x2
```

### Running on a SLURM cluster

`scripts/submitPlateDZI.sh` generates DZI pyramids for one or more 96-well plates on a SLURM cluster.
It submits one array job per plate folder; each of its 3 array tasks processes one channel: image files `w1`-`w3` (`-c 1`-`3`) are written as `d0`-`d2`.

#### One-time setup

Create the `dz` micromamba environment (numpy, pillow, imageio) on the cluster:

```
./scripts/setupMicromambaEnv.sh        # -n NAME, -p PYTHON_VERSION, -f to recreate
```

#### Submitting

```
./scripts/submitPlateDZI.sh [-s PYSCRIPT] OUTROOT INDIR [INDIR ...]
```

* `OUTROOT` - root output folder; each plate goes to `OUTROOT/<name of INDIR>/`,
* `INDIR` - folder with all images of a single plate (all wells, channels 0-2),
* `-s` - path to the montage script, if it is not `makePlateMontageDZI.py` next to `submitPlateDZI.sh`. The `fonts` folder must sit next to that script.

For example:

```
./scripts/submitPlateDZI.sh /data/dzi /data/plate01 /data/plate02
```

produces `d0.dzi`, `d1.dzi`, `d2.dzi` and the corresponding `d0_files/`, `d1_files/`, `d2_files/` tile folders in `/data/dzi/plate01/` and `/data/dzi/plate02/`.
SLURM logs are written to `slurm.out/dz_<jobid>_<channel>.out` in the directory the script is called from.
Check the progress with `squeue -u $USER` and the run time and memory of finished jobs with `sacct -j <jobid> --format=JobID,Elapsed,MaxRSS,State`.

#### Parameters

The job script `scripts/plateDZI.slurm` sets the following parameters; edit it to process plates with a different layout:

| Parameter | Value |
|---|---|
| Plate dimensions | 12x8 wells (`-p 12 8`) |
| Well dimensions | 4x4 FOVs (`-w 4 4`) |
| Image dimensions | 2048x2048 px (`-m 2048 2048`) |
| DeepZoom tile size | 254 px (`-t 254`) |
| Image file extension | `tif` (`-x tif`) |
| Channel `w1` (`-c 1`) | intensities 100 - 4500, output `d0` |
| Channel `w2` (`-c 2`) | intensities 60 - 4500, output `d1` |
| Channel `w3` (`-c 3`) | intensities 100 - 2200, output `d2` |

SLURM resources per task: partition `all`, 2 CPUs, 32 GB memory, 2 h.
Two CPUs correspond to a single physical core on nodes with hyper-threading.

The number of threads writing the tiles equals `--cpus-per-task`; to try a different number, set `DZ_THREADS` when submitting:

```
DZ_THREADS=4 ./scripts/submitPlateDZI.sh /data/dzi /data/plate01
```

The job activates the `dz` environment with the micromamba binary at `~/.local/bin/micromamba` and `MAMBA_ROOT_PREFIX=~/micromamba`; adjust both in `plateDZI.slurm` if your installation differs.
