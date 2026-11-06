# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deep Zoom Plate Viewer converts fluorescence microscopy TIFF images from multi-well plate experiments into DeepZoom (DZI) image pyramids for interactive browser-based viewing using OpenSeadragon. 
The typical workflow: run a Python script to stitch FOV images into a plate montage → tile the montage into a DZI pyramid → serve the HTML viewer with a local HTTP server.

## Environment Setup

Uses a conda environment (`dz`) defined in `environment_dzPV.yml` (Python 3.13, pillow, imageio, numpy):

```bash
conda env create -f environment_dzPV.yml
conda activate dz
```

Or install directly with pip:

```bash
pip install -r requirements.txt
```

`environment_dzPV.yml` pins Linux builds. On other platforms, or on the cluster, use `scripts/setupMicromambaEnv.sh`, which creates the `dz` environment with micromamba (`-n NAME`, `-p PYTHON_VERSION`, `-f` to recreate).

## Generating a DZI Pyramid

The main script is `scripts/makePlateMontageDZI.py`. Run it once per fluorescence channel:

```bash
# 2x2 well plate, 4x4 FOVs per well, channel 0
./scripts/makePlateMontageDZI.py -v -p 2 2 -w 4 4 -c 0 -f dzi_c0 -o <outdir> <indir>

# Channel 1
./scripts/makePlateMontageDZI.py -v -p 2 2 -w 4 4 -c 1 -f dzi_c1 -o <outdir> <indir>
```

For a 384-well plate (24×16 wells, 4×4 FOVs): `-p 24 16 -w 4 4`

Key flags:
- `-p W H` — plate dimensions (columns × rows of wells)
- `-w W H` — FOV layout per well (columns × rows)
- `-c N` — channel number to process
- `-f name` — stem of the output `.dzi` filename
- `-o dir` — output directory for the DZI file and tiles folder
- `-I min max` — intensity clipping before 16→8 bit conversion (default: 250 3000)
- `-i` — invert the output image
- `-q 0.8` — PNG compression quality (0–1)
- `-t 254` — DeepZoom tile size in pixels
- `-m W H` — FOV image dimensions in pixels (default: 1104 1104)
- `-x ext` — image file extension (default: TIFF)
- `-r N` — number of threads writing DeepZoom tiles (default: 2)

## Running on a SLURM Cluster

`scripts/submitPlateDZI.sh [-s PYSCRIPT] OUTROOT INDIR [INDIR ...]` submits one 3-task array job (`scripts/plateDZI.slurm`) per plate folder; the array task ID (0-2) is the output channel `d0`–`d2`, and the job passes `-c $((task+1))` to read image files `w1`–`w3`. Output of each plate goes to `OUTROOT/<basename of INDIR>/` as `d0.dzi`–`d2.dzi`; logs go to `slurm.out/` in the submission directory.

- `plateDZI.slurm` hard-codes the 96-well layout (`-p 12 8 -w 4 4 -m 2048 2048 -t 254 -x tif`) and the per-channel intensity ranges (w1→d0 100–4500, w2→d1 60–4500, w3→d2 100–2200).
- The deployed montage script may be renamed, hence `-s`; it needs `fonts/` next to it.
- micromamba must be initialised with `eval "$(micromamba shell hook --shell bash)"` before `micromamba activate` in batch jobs; the binary is `~/.local/bin/micromamba` and `MAMBA_ROOT_PREFIX` is set explicitly.
- `--cpus-per-task=2` is intentional: on the hyper-threaded nodes it gives one physical core. Tile-writing threads default to `SLURM_CPUS_PER_TASK`, overridable with `DZ_THREADS`.
- Tile output goes to an SMB share, so tile writing is per-file latency-bound; local SSD benchmarks are not representative.

## Image File Naming Convention

`makePlateMontageDZI.py` builds each file name in `processWell()` (`locImPath`) as `t1_{row}{col:02d}_s{fov+1}_w{ch}_z1.{ext}`:
```
t1_A01_s1_w1_z1.tif    # well A01, first FOV, read with -c 1
t1_B02_s14_w3_z1.tif   # well B02, 14th FOV, read with -c 3
```
- `t1` time point and `z1` z-plane are fixed
- Well: letter (row) + zero-padded two-digit number (column), e.g. `A01`
- FOV: `s` + 1-based index, not padded
- Channel: `w` + the `-c` value, untouched. The script makes no assumption about output naming; any mapping between image and output channels (e.g. `w1`→`d0`) belongs to the caller (see `plateDZI.slurm`)

The old convention `{row}{col:02d}_f{fov:02d}_d{ch}.{ext}` (e.g. `A01_f00_d0.TIFF`, 0-based zero-padded FOV) is kept as a commented `locImPath` line; older datasets are processed by swapping the two lines. By design there is no command-line option for the naming scheme. Missing images are replaced by a grey placeholder tile with a label.

## Running the Demo Viewer

The `demosite2x2/` folder is a self-contained demo site. DZI pyramids are pre-generated. To serve it locally:

```bash
cd demosite2x2
./runsite.sh   # runs: http-server -p 1313
```

Then open `http://127.0.0.1:1313`.

## Architecture

### Python pipeline (`scripts/`)

`makePlateMontageDZI.py` embeds a subset of the [deepzoom.py](https://github.com/openzoom/deepzoom.py) library directly (classes `DeepZoomImageDescriptor` and `ImageCreator`). The pipeline:

1. Allocates a full-plate PIL canvas (grayscale mode `L`).
2. For each well, calls `processWell()` which reads individual FOV TIFFs, clips intensities, rescales from 16-bit to 8-bit, and pastes them into a well canvas with 5 px inter-FOV padding and well-name labels.
3. Pastes each well canvas into the plate canvas (30 px inter-well padding).
4. Calls `ImageCreator.create()` to produce the multi-resolution DZI tile pyramid (PNG tiles, 254 px each with 1 px overlap). Levels are built from full resolution downwards, each halved from the previous one; tiles of a level are written by a thread pool (`-r`). With `-v`, a per-level timing summary is printed.

### HTML/JS viewer (`demosite2x2/`, `HTML-template/`)

Each viewer tab loads one or two DZI sources into an **OpenSeadragon** instance. The three HTML templates differ in complexity:

| Template | Channels | Heatmaps / D3 |
|---|---|---|
| `index-templateSimplest.html` | single | no |
| `index-templatePerPlate-noD3.html` | multi (toggle) | no |
| `index-templatePerPlate-withD3.html` | multi (toggle) | yes |

The D3 variant adds interactive heatmaps overlaid on the plate image driven by CSV data (columns: well coordinates, `meas.mn`, `npi`, `zscore`, `well.type`). The CSV files are in `demosite2x2/data/`. Heatmap logic is in `demosite2x2/jscripts/heatmap.js`; well highlighting via canvas overlay in `jscripts/overlay.js`; boxplot QC in `jscripts/boxplot.js`.

Image filters (invert, brightness, contrast, level min/max) are applied in real time via the **OpenSeadragon Filtering** plugin (`openseadragonfiltering/`). Well border highlights are drawn via the **OpenSeadragon CanvasOverlay** plugin (`openseadragoncanvasoverlay/`).

Double-clicking any image-processing slider resets it to its default value.
