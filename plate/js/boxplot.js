// other parameter specifies which positive control to exclude!
function createBoxplot(id, df, value, grouping, positivec) {
  // set the dimensions and margins of the graph
  var margin = { top: 10, right: 30, bottom: 30, left: 40 },
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#" + id)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");
  var svg2 = d3.select("#" + id)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", 200)
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

  // Read the data and compute summary statistics for each specie
  d3.csv(df, function (data) {
    data.forEach(function (d) {
      if (d[grouping] == positivec) {
        d[grouping] = "Ctrl positive"
      } else if (d[grouping].slice(0, 3) == "neg") {
        d[grouping] = "Ctrl negative"
      }
      else if(d[grouping] == "compound") {
        d[grouping] = "Sample"
      }
    });
    data = data.filter(function (d) { return d[grouping].slice(0,3) != "pos" })
    // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
    var sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
      .key(function (d) { return d[grouping]; })
      .rollup(function (d) {
        //checks if we are calculating sample or controls as for SSMD and z` no samples are needed
        if (d[0][grouping] != "Sample") {
          mean = d3.mean(d.map(function (g) { return g[value]; }))
          sd = d3.deviation(d.map(function (g) { return g[value]; }))
        } else {
          mean = 0
          sd = 0
        }
        q1 = d3.quantile(d.map(function (g) {
          return g[value];
        }).sort(d3.ascending), .25)
        median = d3.quantile(d.map(function (g) { return g[value]; }).sort(d3.ascending), .5)
        q3 = d3.quantile(d.map(function (g) { return g[value]; }).sort(d3.ascending), .75)
        interQuantileRange = q3 - q1
        min = q1 - 1.5 * interQuantileRange
        max = q3 + 1.5 * interQuantileRange
        return ({ q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max, mean: mean, sd: sd })
      })
      .entries(data)
    // Show the X scale
    var x = d3.scaleBand()
      .range([0, width])
      .domain(["Ctrl negative", "Ctrl positive", "Sample"],)
      .paddingInner(1)
      .paddingOuter(.5)
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))
    // Show the Y scale
    var y = d3.scaleLinear()
      .domain([0, d3.max([sumstat[0].value.max,sumstat[1].value.max,sumstat[2].value.max]) + 0.5])
      .range([height, 0])
    svg.append("g").call(d3.axisLeft(y))
    // Show the main vertical line
    svg
      .selectAll("vertLines")
      .data(sumstat)
      .enter()
      .append("line")
      .attr("x1", function (d) { return (x(d.key)) })
      .attr("x2", function (d) { return (x(d.key)) })
      .attr("y1", function (d) { return (y(d.value.min)) })
      .attr("y2", function (d) { return (y(d.value.max)) })
      .attr("stroke", "black")
      .style("width", 40)

    // rectangle for the main box
    var boxWidth = 100
    svg
      .selectAll("boxes")
      .data(sumstat)
      .enter()
      .append("rect")
      .attr("x", function (d) { return (x(d.key) - boxWidth / 2) })
      .attr("y", function (d) { return (y(d.value.q3)) })
      .attr("height", function (d) { return (y(d.value.q1) - y(d.value.q3)) })
      .attr("width", boxWidth)
      .attr("stroke", "black")
      .style("fill", "#69b3a2")

    // Show the median
    svg
      .selectAll("medianLines")
      .data(sumstat)
      .enter()
      .append("line")
      .attr("x1", function (d) { return (x(d.key) - boxWidth / 2) })
      .attr("x2", function (d) { return (x(d.key) + boxWidth / 2) })
      .attr("y1", function (d) { return (y(d.value.median)) })
      .attr("y2", function (d) { return (y(d.value.median)) })
      .attr("stroke", "black")
      .style("width", 80)
    for (i = 0; i < sumstat.length; i++) {
	    if(sumstat[i].key=="Ctrl negative"){
		    var negative = sumstat[i]
	    }	
	    if(sumstat[i].key=="Ctrl positive"){
		var positive = sumstat[i]
    }}
	
    //calculate and display z' value as stated in https://en.wikipedia.org/wiki/Z-factor
    var z = 1 - (3 * (positive.value.sd + negative.value.sd) / Math.abs(positive.value.mean - negative.value.mean + Number.EPSILON))
    svg2
      .append("text")
      .attr("x", 0)
      .attr("y", 60)
      .text("Z` value is: " + z.toFixed(2))
      .attr("font-family", "sans-serif")
      .attr("font-size", "30px")
      .attr("fill", "black");
    // calculate and display the ssmd as stated in https://en.wikipedia.org/wiki/Strictly_standardized_mean_difference 
    var ssmd = (positive.value.mean - negative.value.mean) / Math.sqrt(positive.value.sd ** 2 + negative.value.sd ** 2 + Number.EPSILON)
    svg2
      .append("text")
      .attr("x", 0)
      .attr("y", 160)
      .text("SSMD value is: " + ssmd.toFixed(2))
      .attr("font-family", "sans-serif")
      .attr("font-size", "30px")
      .attr("fill", "black");

  })


}
