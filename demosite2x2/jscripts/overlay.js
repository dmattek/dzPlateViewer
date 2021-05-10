
//mapping columns and rows to starting points of their respective wells expressed in viewport coordinates
function mapToIntOverlay2(labels,d) {
  var num = 0;
  var mapping = {};
  for (var i = 0; i < labels.length; i++) {
    let l = labels[i]
    mapping[l] = num;
    num += viewer12.viewport.imageToViewportCoordinates(d/labels.length).x
  }
  return mapping
}

function createSlider(viewer, id, df, value, heatm, id2, vnumber) {
  //read in the heatmap data
  d3.csv(df, function (data) {
    var myGroups = d3.map(data, function (d) { return d.Col; }).keys();
    var myVars = d3.map(data, function (d) { return d.Row; }).keys();
    // sort columns numerically
    myGroups.sort(function (a, b) { return Number(a) - Number(b) })
    myVars.sort()
    // create a mapping of rows and columns
    xOverlayMap = mapToIntOverlay2(myGroups,window.dim.x);
    yOverlayMap = mapToIntOverlay2(myVars,window.dim.y);
    // create arrays of rows and columns and values
    var valz = []
    // vnumber specifies to which viewer the rectangles are bound
    if (vnumber == 1) {
      window.yOverlay1 = []
      window.xOverlay1 = []
    }

    else {
      window.yOverlay2 = []
      window.xOverlay2 = []
    }


    data.map(function (d) {
      valz.push(d[value])
      if (vnumber == 1) {
        window.yOverlay1.push(d.Row)
        window.xOverlay1.push(d.Col)
      }
      else {
        window.yOverlay2.push(d.Row)
        window.xOverlay2.push(d.Col)
      }
    })
    // values are mapped numerically
    var valz = valz.map(Number)
    window.currentLength = above.length
    // map all the columns and rows in array order to the starting coordinates of their respected wells
    if (vnumber == 1) {
      for (var i = 0; i < window.yOverlay1.length; i++) {
        window.yOverlay1[i] = yOverlayMap[window.yOverlay1[i]]
      }

      for (var i = 0; i < window.xOverlay1.length; i++) {
        window.xOverlay1[i] = xOverlayMap[window.xOverlay1[i]]
      }
    }
    else {
      for (var i = 0; i < window.yOverlay2.length; i++) {
        window.yOverlay2[i] = yOverlayMap[window.yOverlay2[i]]
      }

      for (var i = 0; i < window.xOverlay2.length; i++) {
        window.xOverlay2[i] = xOverlayMap[window.xOverlay2[i]]
      }
    }

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
          if (valz[i] < val) {
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
          if (d < val) {
            d3.select(this).
              attr("r", 2)
          }
          else {
            d3.select(this).
              attr("r", 0)
          }
        })
      });
    //create a svg element and add a slider to it
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


