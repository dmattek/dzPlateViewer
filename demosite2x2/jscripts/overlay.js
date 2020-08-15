//overaly tryout
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

function createSlider(viewer, id, df, value, heatm,id2) {
  d3.csv(df, function (data) {
    var myGroups = d3.map(data, function (d) { return d.Col; }).keys();
    var myVars = d3.map(data, function (d) { return d.Row; }).keys();
    myGroups.sort()
    myVars.sort()
    xOverlayMap = mapToIntOverlay2(myGroups);
    yOverlayMap = mapToIntOverlay2(myVars);
    var valz = []
    window.yOverlay = []
    window.xOverlay = []
    data.map(function (d) {
      valz.push(d[value])
      window.yOverlay.push(d.Row)
      window.xOverlay.push(d.Col)
    })
    var valz = valz.map(Number)
    window.currentLength = above.length

    for (var i = 0; i < window.yOverlay.length; i++) {
      window.yOverlay[i] = window.yOverlayMap[window.yOverlay[i]]
    }

    for (var i = 0; i < window.xOverlay.length; i++) {
      window.xOverlay[i] = window.xOverlayMap[window.xOverlay[i]]
    }
    console.log(window.xOverlay)

    var sliderSimple = d3
      .sliderBottom()
      .min(d3.min(valz))
      .max(d3.max(valz))
      .width(300)
      .tickFormat(d3.format('.2'))
      .ticks(5)
      .default(d3.min(valz))
      .on('onchange', function (val) {
        window.above = []
        for (var i = 0; i < valz.length; i++) {
          if (valz[i] >= val) {
            window.above.push(i)
          }
        }
        var newL = above.length
        if (window.currentLength != newL) {

          viewer.raiseEvent('update-viewport')
        }
        window.currentLength = newL

        d3.select("#" + heatm).select("svg").selectAll("circle").each(function (d) {
          if (d >= val) {
            d3.select(this).
              attr("r", 2)
          }
          else {
            d3.select(this).
              attr("r", 0)
          }
        })

      });

    var gSimple = d3
      .select("#" + id)
      .append('svg')
      .attr('width', 500)
      .attr('height', 100)
      .append('g')
      .attr('transform', 'translate(30,30)');

    gSimple.call(sliderSimple);


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
        var myColor = color(maxx,minn)
         d3.select("#" + heatm).select("svg").selectAll("rect").each(function (d) {
          if (d[2] > maxx) {
            d3.select(this)
            .style("fill", function () { return myColor(maxx) })
          }
          else {
            d3.select(this)
            .style("fill", function (d) { return myColor(d3.max([minn,d[2]])) })
          }

         })

      });

    var gRange = d3
      .select('div#'+id2)
      .append('svg')
      .attr('width', 500)
      .attr('height', 80)
      .append('g')
      .attr('transform', 'translate(30,30)');

    gRange.call(sliderRange);
  });

}


