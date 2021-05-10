# Small Demo of Deep Zoom Plate Viewer

A **live** demo web-viewer with 2x2 wells, 4x4 FOVs per well can be accessed [here](http://macdobry.net/deepzoomdemo/demosite2x2/index.html).

This folder contains everything (HTML and JavaScript code) necessary to display a demo of a web-based plate viewer. The entire site including the images can be downloaded as a `zip` archive from [here](https://www.dropbox.com/s/lwycuvlqdtirvr8/demosite2x2.zip?dl=0).

Alternatively, you can recreate the website by following these steps.

## Download raw images

This repo **does not** contain `dzi` pyramid images. Download a `zip` archive with raw images necessary to produce the `dzi` pyramid from [here](https://www.dropbox.com/s/5cmejgy9x21434n/demodata2x2.zip?dl=0). Unzip the archive and place the `demodata2x2` folder in the current folder.

The images follow the naming convention:

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

## Generate the image pyramid

To generate `dzi` image pyramids for both channels from images in the `demodata2x2` folder, execute:

```
../scripts/makePlateMontageDZI.py -v -p 2 2 -w 4 4 -c 0 -f dzi_c0 -o . demodata2x2
../scripts/makePlateMontageDZI.py -v -p 2 2 -w 4 4 -c 1 -f dzi_c1 -o . demodata2x2
```
Where parameters:

* `-v` switches on the verbose mode,
* `-p` defines plate dimensions, e.g. `-p 2 2` defines a 2x2 well plate,
* `-w` defines well dimensions, e.g. `-w 4 4` defines a 4x4 field of view well,
* `-c` defines the channel to process,
* `-f` defines the name of the output `dzi` file,
* `-o` defines the folder to place the folder with files of the image pyramid.

After running the first script, a `dzi_c0.dzi` file and a `dzi_c0_files` folder will be created in the current folder. They define the image pyramid for channel 0. The second script generates the data for channel 1.

## Start the website

Run the [command-line http server](https://www.npmjs.com/package/http-server) by typing:

```
./runsite.html
```

Go to the address provided in the output of that script, e.g. `http://127.0.0.1:1313`.
