// Logic of the plate page; shared by all plates (loaded from <web root>/plate/plate.js).
//
// The page defines, before loading this file:
//   var PLATE = {
//     dzi0: "d0.dzi",                       // single-channel viewer (tab Ch 0)
//     channels: [ {dzi, csv, value, pos},   // two-channel viewer (tab Ch 1+2), left and right switch;
//                 {dzi, csv, value, pos} ], //   csv: per-well stats, value: column with the mean,
//                                           //   pos: well.type label of the positive control
//     fov: {width, height, perWellX, perWellY, padFov, padWell},  // montage geometry in pixels
//     osdImages: "../../openseadragon/images/"
//   };


// opens the default heatmap tab when switching to a given tab and clears the highlighed wells
document.getElementById("Tab12").addEventListener('click', function () {
	document.getElementById("default" + channel).click();
})


// opens the tabs specified in the upper html, with the variable j specifying from which tab the changes to the current setup start
function openTab(evt, tabName, j) {
	var i, tabcontent, tablinks;

	tabcontent = document.getElementsByClassName("tabcontent");
	for (i = j; i < tabcontent.length; i++) {
		tabcontent[i].style.display = "none";
	}

	tablinks = document.getElementsByClassName("tablinks");
	for (i = j; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "");
	}

	document.getElementById(tabName).style.display = "block";
	evt.currentTarget.className += " active";
};


// clearing well highlights and heatmap marks of a specific tab
function clearView(id, id2, viewer) {
	document.getElementById(id).addEventListener('click', function () {
		window.above = []; //reset the highlighted wells
		viewer.raiseEvent('update-viewport');
		// reset the heatmap circles
		d3.select("#" + id2).select("svg").selectAll("circle").attr("r", 0)
	});
}

// Tab ch0 - nuclear
var viewer0 = OpenSeadragon({
	id: "osd0",
	prefixUrl: PLATE.osdImages,
	tileSources: [
		PLATE.dzi0,
	]
});

// gets the image dimension in pixels so that it can be converted to viewport coordinates in the heatmap


// Tab ch1+2 
var viewer12 = OpenSeadragon({
	id: "osd12",
	prefixUrl: PLATE.osdImages,
	tileSources: [
		{
			opacity: 1,
			tileSource: PLATE.channels[0].dzi
		},
		{
			opacity: 0,
			tileSource: PLATE.channels[1].dzi
		}
	]
});
// Switching channels
// From: https://codepen.io/iangilman/pen/YXRLea

var switchButton = document.querySelector('.switch-button');
var switchBtnRight = document.querySelector('.switch-button-case.right');
var switchBtnLeft = document.querySelector('.switch-button-case.left');
var activeSwitch = document.querySelector('.switch-button .active');

function switchLeft() {
	channel = 1;
	let alternative = 2;
	switchBtnRight.classList.remove('active-case');
	switchBtnLeft.classList.add('active-case');
	activeSwitch.style.left = '0%';
	fade(viewer12.world.getItemAt(0), 1);
	fade(viewer12.world.getItemAt(1), 0);
	var x = document.getElementById("chd" + channel);
	document.getElementById("default" + channel).click();
	var y = document.getElementById("chd" + alternative);
	x.style.display = "block";
	y.style.display = "none";
	window.above = [];
	viewer12.raiseEvent('update-viewport');

}

function switchRight() {
	channel = 2;
	let alternative = 1;
	switchBtnRight.classList.add('active-case');
	switchBtnLeft.classList.remove('active-case');
	activeSwitch.style.left = '50%';
	fade(viewer12.world.getItemAt(1), 1);
	fade(viewer12.world.getItemAt(0), 0);
	var x = document.getElementById("chd" + channel);
	document.getElementById("default" + channel).click();
	var y = document.getElementById("chd" + alternative);
	x.style.display = "block";
	y.style.display = "none";
	window.above = [];
	viewer12.raiseEvent('update-viewport');
}

switchBtnLeft.addEventListener('click', function () {
	switchLeft();
}, false);

switchBtnRight.addEventListener('click', function () {
	switchRight();
}, false);

// default channel is channel 1
var channel = 1;

var fade = function (image, targetOpacity) {
	var currentOpacity = image.getOpacity();
	var step = (targetOpacity - currentOpacity) / 10;
	if (step === 0) {
		return;
	}

	var frame = function () {
		currentOpacity += step;
		if ((step > 0 && currentOpacity >= targetOpacity) || (step < 0 && currentOpacity <= targetOpacity)) {
			image.setOpacity(targetOpacity);
			return;
		}

		image.setOpacity(currentOpacity);
		OpenSeadragon.requestAnimationFrame(frame);
	};

	OpenSeadragon.requestAnimationFrame(frame);
};

// Image filters

// Flags and settings of image filters; changed in UI
var selFilters0 = {
	inv: 0,
	bright: 0,
	contr: 1,
	levMin: 0,
	levMax: 255
}

var selFilters12 = {
	inv: 0,
	bright: 0,
	contr: 1,
	levMin: 0,
	levMax: 255
}

// Switching inversion
function fSwitchInv(viewer, selFilters) {

	selFilters.inv = (selFilters.inv + 1) % 2;

	fApplyFilters(selFilters, viewer)
};
//set the image processing sliders
function sliderSettings(viewer, selFilters, sliderBright, outputBright, sliderContr, outputContr, sliderLevelMin, outputLevelMin, sliderLevelMax, outputLevelMax) {
	// Brightness slider
	outputBright.innerHTML = sliderBright.value;
	sliderBright.oninput = function () {
		outputBright.innerHTML = this.value;
		selFilters.bright = parseInt(this.value);

		fApplyFilters(selFilters, viewer);
	}

	sliderBright.ondblclick = function () {
		this.value = 0;
		outputBright.innerHTML = 0;
		selFilters.bright = 0;

		fApplyFilters(selFilters, viewer);
	}

	// Contrast slider
	outputContr.innerHTML = sliderContr.value;

	sliderContr.oninput = function () {
		outputContr.innerHTML = this.value;
		selFilters.contr = parseFloat(this.value);

		fApplyFilters(selFilters, viewer);
	}

	sliderContr.ondblclick = function () {
		this.value = 1;
		outputContr.innerHTML = 1;
		selFilters.contr = 1;

		fApplyFilters(selFilters, viewer);
	}

	// Level min/max sliders
	outputLevelMin.innerHTML = sliderLevelMin.value;

	sliderLevelMin.oninput = function () {
		outputLevelMin.innerHTML = this.value;
		selFilters.levMin = parseInt(this.value);

		fApplyFilters(selFilters, viewer);
	}

	sliderLevelMin.ondblclick = function () {
		this.value = 0;
		outputLevelMin.innerHTML = 0;
		selFilters.levMin = 0;

		fApplyFilters(selFilters, viewer);
	}



	outputLevelMax.innerHTML = sliderLevelMax.value;

	sliderLevelMax.oninput = function () {
		outputLevelMax.innerHTML = this.value;
		selFilters.levMax = parseInt(this.value);

		fApplyFilters(selFilters, viewer);
	}

	sliderLevelMax.ondblclick = function () {
		this.value = 255;
		outputLevelMax.innerHTML = 255;
		selFilters.levMax = 255;

		fApplyFilters(selFilters, viewer);
	}

}

// Apply filters depending on values in inArg changed in UI
function fApplyFilters(inArg, viewer) {
	var locFilters = [];

	if (inArg.inv > 0) {
		locFilters.push(OpenSeadragon.Filters.INVERT())
	}

	if (inArg.bright != 0) {
		locFilters.push(OpenSeadragon.Filters.BRIGHTNESS(inArg.bright))
	}

	if (inArg.contr != 1) {
		locFilters.push(OpenSeadragon.Filters.CONTRAST(inArg.contr))
	}

	if (inArg.levMin > 0 || inArg.levMax < 255) {
		locFilters.push(OpenSeadragon.Filters.LEVELS(inArg.levMin, inArg.levMax))
	}

	viewer.setFilterOptions({
		filters: {
			processors: locFilters
		},
		loadMode: 'async'
	})

}

//define function for maping cursor position within the specified FOV
function mapPosition(position, Dim, nFOV, smallS, bigS, axis) {
	if (axis == "x") {
		var bigI = window.xbigI
	} else {
		var bigI = window.ybigI
	}
	position = position - bigI * (bigS - smallS)
	dist = Math.floor(position / (Dim + smallS))
	position = position - dist * (Dim + smallS)
	bigI = Math.floor(dist / nFOV)
	if (axis == "x") {
		window.xbigI = bigI
	} else {
		window.ybigI = bigI
	}
	return position
}

//set image processing for ch0 and ch12
var sliderBright0 = document.getElementById("slBright" + 0);
var outputBright0 = document.getElementById("valBright" + 0);
var sliderBright12 = document.getElementById("slBright" + 12);
var outputBright12 = document.getElementById("valBright" + 12);
var sliderContr0 = document.getElementById("slContr" + 0);
var outputContr0 = document.getElementById("valContr" + 0);
var sliderContr12 = document.getElementById("slContr" + 12);
var outputContr12 = document.getElementById("valContr" + 12);
var sliderLevelMin0 = document.getElementById("slLevMin" + 0);
var outputLevelMin0 = document.getElementById("valLevMin" + 0);
var sliderLevelMin12 = document.getElementById("slLevMin" + 12);
var outputLevelMin12 = document.getElementById("valLevMin" + 12);
var sliderLevelMax0 = document.getElementById("slLevMax" + 0);
var outputLevelMax0 = document.getElementById("valLevMax" + 0);
var sliderLevelMax12 = document.getElementById("slLevMax" + 12);
var outputLevelMax12 = document.getElementById("valLevMax" + 12);

sliderSettings(viewer0, selFilters0, sliderBright0, outputBright0, sliderContr0, outputContr0, sliderLevelMin0, outputLevelMin0, sliderLevelMax0, outputLevelMax0)
sliderSettings(viewer12, selFilters12, sliderBright12, outputBright12, sliderContr12, outputContr12, sliderLevelMin12, outputLevelMin12, sliderLevelMax12, outputLevelMax12)

//initializes the variables necessary for well highlighting


// mapped to viewport coordinates and sorted arrays of Rows and Columns of the wells
var xOverlay1 = []
var yOverlay1 = []
var xOverlay2 = []
var yOverlay2 = []

// array that contains the wells that are above a specified treshold set by the respective slider
var above = []



//adds the canvas to  specified viewers

var overlay = viewer12.canvasOverlay({
	onRedraw: function () {
		overlay.context2d().fillStyle = "red";
		//iterate over the wells that are above a treshold and draw red squares around them
		for (var i = 0; i < above.length; i++) {
			overlay.context2d().fillRect(xOverlay1[above[i]], yOverlay1[above[i]], Height, Width);
			//empirical numbers that gave good appearance result as just drawing non-filled red squares was not working
			overlay.context2d().clearRect(xOverlay1[above[i]] + 0.03 * Height, yOverlay1[above[i]] + 0.03 * Width, Height - 0.06 * Height, Width - 0.06 * Width);
		}
	},
	clearBeforeRedraw: true
});
//resizes the overlay with respect to the current browser screen
window.addEventListener('resize', function () {
	overlay.resize();
});

var overlay2 = viewer12.canvasOverlay({
	onRedraw: function () {
		overlay2.context2d().fillStyle = "red";
		//iterate over the wells that are above a treshold and draw red squares around them
		for (var i = 0; i < above.length; i++) {
			overlay2.context2d().fillRect(xOverlay2[above[i]], yOverlay2[above[i]], Height, Width);
			//empirical numbers that gave good appearance result as just drawing non-filled red squares was not working
			overlay2.context2d().clearRect(xOverlay2[above[i]] + 0.03 * Height, yOverlay2[above[i]] + 0.03 * Width, Height - 0.06 * Height, Width - 0.06 * Width);
		}
	},
	clearBeforeRedraw: true
});

// Resize the overlay with respect to the current browser screen
window.addEventListener('resize', function () {
	overlay2.resize();
});
//declare the variable needed for Fov position
var positionEl = document.getElementById("locator")
window.xbigI = 0
window.ybigI = 0

// Decleare variables specifying csv file names as well as the target mean value column
var data1 = PLATE.channels[0].csv
var value1 = PLATE.channels[0].value
var data2 = PLATE.channels[1].csv
var value2 = PLATE.channels[1].value

viewer12.addHandler("open", function () {
	console.log("loaded")
	window.dim = viewer12.world.getItemAt(0).getContentSize();
	//generate mock hm for guidance in viewer0
	createHeatmap(viewer0, "my_map", data1, value1, false)

	//generate heatmaps and color-scale gradients
	createHeatmap(viewer12, "my_dataviz", data1, value1)
	createHeatmap(viewer12, "my_dataviz2", data1, "npi")
	createHeatmap(viewer12, "my_dataviz3", data1, "zscore")
	createHeatmap(viewer12, "my_dataviz4", data2, value2)
	createHeatmap(viewer12, "my_dataviz5", data2, "npi")
	createHeatmap(viewer12, "my_dataviz6", data2, "zscore")
	drawScale("seq317", d3.interpolateSpectral)
	drawScale("seq318", d3.interpolateSpectral)
	drawScale("seq319", d3.interpolateSpectral)
	drawScale("seq320", d3.interpolateSpectral)
	drawScale("seq321", d3.interpolateSpectral)
	drawScale("seq322", d3.interpolateSpectral)

	//generate sliders used to control specific heatmaps and wells at the given tab as well as the sliders to control the data range with respect to colors
	createSlider(viewer12, "slider-simple", data1, value1, "my_dataviz", "slider-range", 1)
	createSlider(viewer12, "slider-simple2", data1, "npi", "my_dataviz2", "slider-range2", 1)
	createSlider(viewer12, "slider-simple3", data1, "zscore", "my_dataviz3", "slider-range3", 1)
	createSlider(viewer12, "slider-simple4", data2, value2, "my_dataviz4", "slider-range4", 2)
	createSlider(viewer12, "slider-simple5", data2, "npi", "my_dataviz5", "slider-range5", 2)
	createSlider(viewer12, "slider-simple6", data2, "zscore", "my_dataviz6", "slider-range6", 2)

	//set up buttons to clear wells and heatmap
	clearView("overlay", "my_dataviz", viewer12)
	clearView("overlay2", "my_dataviz2", viewer12)
	clearView("overlay3", "my_dataviz3", viewer12)
	clearView("overlay4", "my_dataviz4", viewer12)
	clearView("overlay5", "my_dataviz5", viewer12)
	clearView("overlay6", "my_dataviz6", viewer12)
	createBoxplot("QC", data1, value1, "well.type", PLATE.channels[0].pos)
	createBoxplot("QC2", data2, value2, "well.type", PLATE.channels[1].pos)


	//get the position of the cursor within the specifed FOV
	var tracker = new OpenSeadragon.MouseTracker({
		element: viewer12.container,
		moveHandler: function (event) {
			var webPoint = event.position;
			var imagePoint = viewer12.viewport.viewerElementToImageCoordinates(webPoint);
			imagePoint.x = mapPosition(imagePoint.x, PLATE.fov.width, PLATE.fov.perWellX, PLATE.fov.padFov, PLATE.fov.padWell, "x")
			imagePoint.y = mapPosition(imagePoint.y, PLATE.fov.height, PLATE.fov.perWellY, PLATE.fov.padFov, PLATE.fov.padWell, "y")
			positionEl.innerHTML =
				'FOV XY position:<br>' + imagePoint.toString();

		}
	});
	tracker.setTracking(true);

})
