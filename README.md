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
* `plate`\
Plate pages for a screen web site with many experiments and plates: a lightweight page template and the styles, logic and libraries shared by all plates. See [Plate pages for a screen web site](#plate-pages-for-a-screen-web-site).

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

The tiles are set with:
* `-t` - tile size in pixels, default 254. Each tile gets 1 px of overlap on each side, so 254 and 510 give 256 and 512 px images.
* `-F` - tile format, `png` (lossless, default) or `jpg` (lossy, smaller).
* `-q` - quality, default 0.8. For `jpg` it is the JPEG quality (0.9 = 90); for `png` the compression level is `round((1 - q) * 10)`. 0.8 gives level 2; 0.9 gives level 1, whose files are 1.5× larger. Higher levels save little: level 9 is 9% smaller but 8× slower.

For a 96-well plate with 4x4 FOVs of 2048x2048 px and 3 channels, measured on one plate (Nov 2026):

| Tiles | Files per plate | Size per plate | Time per channel |
|---|---|---|---|
| `-t 254 -F png` | 406,000 | 12.2 GB | ~17 min |
| `-t 510 -F png` | 101,000 | ~12 GB | ~8 min |
| `-t 510 -F jpg -q 0.9` | 101,000 | 3.1 GB | ~7 min |

The 510 px tiles need 4× fewer files and fewer requests when the page is viewed (148 instead of 328 for the first view).
JPEG at quality 90 differs from the lossless tiles by 1 grey level (of 255) on average; 99% of pixels are within 5, the largest difference is 19, and no 8x8 block artefacts are visible, even with the levels stretched.

To generate `dzi` image pyramids for both channels in the `../demosite2x2` folder from data in `../demodata2x2` (images named according to the old convention, see above), execute:

```
./makePlateMontageDZI.py -v -p 2 2 -w 4 4 -c 0 -f dzi_c0 -o ../demosite2x2 ../demodata2x2
./makePlateMontageDZI.py -v -p 2 2 -w 4 4 -c 1 -f dzi_c1 -o ../demosite2x2 ../demodata2x2
```

### Running on a SLURM cluster

`scripts/submitPlateDZI.sh` generates DZI pyramids for one or more 96-well plates on a SLURM cluster.
It submits one array job per plate folder; array task N processes acquisition channel N: image files `*_wN_*` (`-c N`) are written as the pyramid `cN.dzi`.
Pyramids are always named after the acquisition channel, `c1`, `c2`, ..., without renumbering.

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

produces `c1.dzi`, `c2.dzi`, `c3.dzi` and the corresponding `c1_files/`, `c2_files/`, `c3_files/` tile folders in `/data/dzi/plate01/` and `/data/dzi/plate02/`.
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
| Channel 1 (`-c 1`, files `*_w1_*`) | intensities 100 - 4500, output `c1` |
| Channel 2 (`-c 2`, files `*_w2_*`) | intensities 60 - 4500, output `c2` |
| Channel 3 (`-c 3`, files `*_w3_*`) | intensities 100 - 2200, output `c3` |

SLURM resources per task: partition `all`, 2 CPUs, 32 GB memory, 2 h.
Two CPUs correspond to a single physical core on nodes with hyper-threading.

The number of threads writing the tiles equals `--cpus-per-task`; to try a different number, set `DZ_THREADS` when submitting:

```
DZ_THREADS=4 ./scripts/submitPlateDZI.sh /data/dzi /data/plate01
```

The job activates the `dz` environment with the micromamba binary at `~/.local/bin/micromamba` and `MAMBA_ROOT_PREFIX=~/micromamba`; adjust both in `plateDZI.slurm` if your installation differs.

## Plate pages for a screen web site

The folder `plate` holds the viewer for a web site with many experiments, each with many plates.
Unlike `demosite2x2`, where every page carries its own styles and logic, the plate pages here are small: markup plus the plate's settings.
Styles, logic and libraries are shared by all plates and are loaded from the web root, so a fix to them applies to every plate at once.
Nothing is loaded from external servers.

### Content of `plate`

* `plate-template.html` - template of a plate page, with placeholders in double at-signs (see below). Not deployed itself.
* `plate.css`, `plate.js` - styles and logic of the page: tabs, OpenSeadragon viewers, channel switch, image filters, well overlay, cursor position within the FOV.
* `js/` - heatmaps (`heatmap.js`), well highlighting (`overlay.js`), QC boxplots (`boxplot.js`), sliders (`d3-simple-slider.min.js`). Copies of `jscripts/`; `heatmap.js` and `overlay.js` use `TiledImage.imageToViewportCoordinates`, which OpenSeadragon requires when two images are open.
* `lib/` - Bootstrap 3.4.1 CSS (layout and typography; no Bootstrap or jQuery JavaScript is needed), D3 v4.13.0 and d3-scale-chromatic v1. D3 must stay at v4: `heatmap.js` uses `d3.nest`, which later versions removed.

### Layout of the web site

```
<web root>/
├── index.html                      list of experiments (maintained separately)
├── openseadragon/                  OpenSeadragon and its plugins, from demosite2x2/
├── openseadragonfiltering/
├── openseadragoncanvasoverlay/
├── plate/                          this folder, without plate-template.html
│   ├── plate.css, plate.js
│   ├── js/
│   └── lib/
└── <experiment>/
    ├── index.html                  list of plates (optional)
    └── <plate>/
        ├── index.html              filled-in plate-template.html
        ├── c1.dzi, c1_files/       pyramid of acquisition channel 1, single-channel viewer (tab "Ch 1")
        ├── c2.dzi, c2_files/       pyramids of the two-channel viewer (tab "Ch 2+3")
        ├── c3.dzi, c3_files/
        └── data/                   per-well stats, one CSV per channel of the two-channel viewer
```

A plate page loads the shared files with `../../plate/...` and `../../openseadragon*/...`, so plate folders must sit exactly two levels below the web root.

### Deploying

1. **Shared files, once per web site and after every change to them**: copy `plate/` without `plate-template.html` to `<web root>/plate/`, and the three OpenSeadragon folders from `demosite2x2/` to the web root if they are not there yet.
   The web server must be able to read them; copy with world-readable permissions, e.g. `install -D -m 644 plate/plate.js <web root>/plate/plate.js`.
   Replace each file in one step (copy to a temporary name, then rename) so that pages being viewed never load a half-written file.
2. **Pyramids, per plate**: run `scripts/makePlateMontageDZI.py` once per acquisition channel N with `-c N -f cN -o <web root>/<experiment>/<plate>`. Writing directly into the web site avoids copying hundreds of thousands of tile files.
3. **Per-well stats, per plate**: copy one CSV per channel to `<plate>/data/`. Required columns: `Row` (A, B, ...), `Col` (1, 2, ...), `npi`, `zscore`, `well.type` and the column with the mean.
   `well.type` marks controls: `neg...` for negative controls, the positive-control label given in the settings below, and `compound` for samples.
4. **Page, per plate**: fill in `plate-template.html` and save it as `<plate>/index.html`, last, once the pyramids and stats are in place:

   | Placeholder | Content |
   |---|---|
   | `@@PLATE@@` | plate name, HTML-escaped |
   | `@@BACKLINK@@` | target of the "Back to index" button, e.g. `../index.html` or `../../index.html#<tab id>` |
   | `@@TAB1@@`, `@@TAB2@@` | labels of the two viewer tabs, after the acquisition channels shown, e.g. `Ch 1` and `Ch 2+3` |
   | `@@LABEL1@@`, `@@LABEL2@@` | names of the two channels on the switch above the heatmaps, e.g. `AKT`, `ERK` |
   | `@@CONFIG@@` | settings of the plate, a JavaScript object (JSON), see below |

   ```
   {
     "name": "TP-_TP-1",
     "dzi0": "c1.dzi",
     "channels": [
       {"dzi": "c3.dzi", "csv": "data/statsPerWell_foxo.csv",   "value": "CNfrac_akt.mn", "pos": "pos.akt"},
       {"dzi": "c2.dzi", "csv": "data/statsPerWell_erkktr.csv", "value": "CNfrac_erk.mn", "pos": "pos.erk"}
     ],
     "fov": {"width": 2048, "height": 2048, "perWellX": 4, "perWellY": 4, "padFov": 5, "padWell": 30},
     "osdImages": "../../openseadragon/images/"
   }
   ```

   * `channels`: left and right position of the channel switch. `value` is the column with the mean shown in the "Int" heatmap; `pos` is the `well.type` label of the positive control in the QC boxplot. A label that matches no well silently drops the positive controls from the boxplot.
   * `fov`: image size and FOVs per well, as given to `makePlateMontageDZI.py` with `-m` and `-w`; `padFov` and `padWell` are the paddings the script inserts between FOVs and wells (5 and 30 px). They map the cursor position to a position within the FOV.
   * Escape `</` as `<\/` in the JSON, so that no value can close the `<script>` element.

The screenR pipeline (a separate repository) does steps 1-4 automatically (rules `web_assets`, `dzi`, `site`; script `workflow/scripts/build_site.py`).

### Changing the shared files

* `plate.css` is loaded **before** `bootstrap.min.css`, as the original inline styles were; Bootstrap overrides it where both set a property. Keep this order, or the look changes.
* Browsers cache the shared files. After deploying a change, reload a plate page with Shift+Reload to see it.
* Every plate page uses the shared files, so check a change on a test experiment first. Rendering an old and a new page headless (e.g. with Playwright) and comparing screenshots catches unintended changes.

