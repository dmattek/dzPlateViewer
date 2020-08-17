/*
*This module is based on D3.js and was created for the purpose of creating 
*sliders for interacting with the heatmap associated with dzi images of plates with melanoma cells
and the wells within the plate images.
*Key features are: 
*creating a slider that will mark specific heatmap fields and create rectangles on the border of wells that have a value above the current slider value
* creating a range slider that will clip the color generating range of the heatmap to the values specified by the slider
* All slider values are generated from the same csv file used to generate the heatmaps heatm associated with it
*Main source for generating sliders:
*https://bl.ocks.org/johnwalley/e1d256b81e51da68f7feb632a53c3518

/**
 *
 * @author Milos Drobnjakovic
 * affiliated with the University of Bern
 */


//mapping columns and rows to starting points of their respective wells expressed in viewport coordinates
function mapToIntOverlay2(labels) {
  var num = 0;
  var mapping = {};
  for (var i = 0; i < labels.length; i++) {
    let l = labels[i]
    mapping[l] = num;
    num += maxWell;
  }
  return mapping
}

function createSlider(viewer, id, df, value, heatm, id2) {
  //read in the heatmap data
  d3.csv(df, function (data) {
    var myGroups = d3.map(data, function (d) { return d.Col; }).keys();
    var myVars = d3.map(data, function (d) { return d.Row; }).keys();
    // sort columns numerically
    myGroups.sort(function (a, b) { return Number(a) - Number(b) })
    myVars.sort()
    // create a mapping of rows and columns
    xOverlayMap = mapToIntOverlay2(myGroups);
    yOverlayMap = mapToIntOverlay2(myVars);
    // create arrays of rows and columns and values
    var valz = []
    window.yOverlay = []
    window.xOverlay = []
    data.map(function (d) {
      valz.push(d[value])
      window.yOverlay.push(d.Row)
      window.xOverlay.push(d.Col)
    })
    // values are mapped numerically
    var valz = valz.map(Number)
    window.currentLength = above.length
    // map all the columns and rows in array order to the starting coordinates of their respected wells
    for (var i = 0; i < window.yOverlay.length; i++) {
      window.yOverlay[i] = yOverlayMap[window.yOverlay[i]]
    }

    for (var i = 0; i < window.xOverlay.length; i++) {
      window.xOverlay[i] = xOverlayMap[window.xOverlay[i]]
    }
  

    //create a slider to highlight wells/mark heatmap based on the slider value
    var sliderSimple = d3
      .sliderBottom()
      .min(d3.min(valz))
      .max(d3.max(valz))
      .width(300)
      .tickFormat(d3.format('.2'))
      .ticks(5)
      .default(d3.min(valz))
      .on('onchange', function (val) {
        // based on the slider treshold determine which wells should be highlighted based on their values
        window.above = []
        for (var i = 0; i < valz.length; i++) {
          if (valz[i] > val) {
            window.above.push(i)
          }
        }
        var newL = above.length
        // this makes sure that updates, which are esentially redraws occur only when there is an actual change
        if (window.currentLength != newL) {

          viewer.raiseEvent('update-viewport')
        }
        // set the curent number of highlighted wells
        window.currentLength = newL
        // draw circles in the heatmap where the values exceed the slider treshold
        d3.select("#" + heatm).select("svg").selectAll("circle").each(function (d) {
          if (d > val) {
            d3.select(this).
              attr("r", 2)
          }
          else {
            d3.select(this).
              attr("r", 0)
          }
        })
      });
    //create a svg element and add  slider for well highlighting to it
    var gSimple = d3
      .select("#" + id)
      .append('svg')
      .attr('width', 500)
      .attr('height', 100)
      .append('g')
      .attr('transform', 'translate(30,30)');

    gSimple.call(sliderSimple);

    //create a slider to adjust the color value scale of the heatmap


    var sliderRange = d3
      .sliderBottom()
      .min(d3.min(valz))
      .max(d3.max(valz))
      .width(300)
      .tickFormat(d3.format('.2'))
      .ticks(5)
      .default([d3.min(valz), d3.max(valz)])
      .fill('#2196f3')
      .on('onchange', val => {
        d3.select('p#value-range').text(val.map(d3.format('.2')).join('-'));
        maxx = val[1]
        minn = val[0]
        var myColor = color(maxx, minn)
        d3.select("#" + heatm).select("svg").selectAll("rect").each(function (d) {
          if (d[2] > maxx) {
            d3.select(this)
              .style("fill", function () { return myColor(maxx) })
          }
          else {
            d3.select(this)
              .style("fill", function (d) { return myColor(d3.max([minn, d[2]])) })
          }

        })

      });
    //create a svg element and add  sliderRange to it

    var gRange = d3
      .select('div#' + id2)
      .append('svg')
      .attr('width', 500)
      .attr('height', 80)
      .append('g')
      .attr('transform', 'translate(30,30)');

    gRange.call(sliderRange);



  });

}


