function mapToInt(labels) {
  var num = 1;
  var mapping = {};
  for (var i = 0; i < labels.length; i++) {
    let l = labels[i]
    mapping[l] = num;
    num += 2;
  }
  return mapping
}

function color(maxx, minn) {
  return d3.scaleSequential()
    .interpolator(d3.interpolateSpectral)
    .domain([maxx, minn])
}

function createHeatmap(viewer, id, df, value) {
  // set the dimensions and margins of the graph
  var margin = { top: 0, right: 25, bottom: 30, left: 30 },
    width = 500;
  height = 400;


  // append the svg object to the body of the page
  var svg = d3.select("#" + id)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

  //Read the data
  d3.csv(df, function (data) {

    // Labels of row and columns -> unique identifier of the column called 'group' and 'variable'
    var myGroups = d3.map(data, function (d) { return d.Col; }).keys();
    var myVars = d3.map(data, function (d) { return d.Row; }).keys();
    //var myVars = myVars.map(Number)
    myVars.sort()
    myGroups.sort(function (a, b) { return Number(a) - Number(b) })
    console.log(myVars)
    var mapX = mapToInt(myGroups);
    var mapY = mapToInt(myVars);
    var myVars = myVars.reverse()
    console.log(typeof (myGroups))
    window.minDim = Math.min(myVars.length, myGroups.length)
    window.maxWell = 1 / Math.max(myVars.length, myGroups.length)


    var valz = []

    data.map(function (d) {
      valz.push(d[value])
    })
    var valz = valz.map(Number)

    // Build X scales and axis:
    var x = d3.scaleBand()
      .range([0, width])
      .domain(myGroups)
      .padding(0.05);
    svg.append("g")
      .style("font-size", 15)
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).tickSize(0))
      .select(".domain").remove()

    // Build Y scales and axis:
    var y = d3.scaleBand()
      .range([height, 0])
      .domain(myVars)
      .padding(0.05);
    svg.append("g")
      .style("font-size", 15)
      .call(d3.axisLeft(y).tickSize(0))
      .select(".domain").remove()

    // Build color scale

    var myColor = color(d3.max(valz), d3.min(valz))

    // create a tooltip
    var tooltip = d3.select("#" + id)
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip")
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "2px")
      .style("border-radius", "5px")
      .style("padding", "5px")

    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function (d) {
      tooltip
        .style("opacity", 1)
      d3.select(this)
        .style("stroke", "black")
        .style("opacity", 1)
    }
    var mousemove = function (d) {
      tooltip
        .html("The exact value of<br>this cell is: " + d[2])
        .style("left", (d3.mouse(this)[0] + 70) + "px")
        .style("top", (d3.mouse(this)[1]) + "px")
    }
    var mouseleave = function (d) {
      tooltip
        .style("opacity", 0)
      d3.select(this)
        .style("stroke", "none")
        .style("opacity", 0.8)
    }
    var click = function (d) {
      viewer1.viewport.goHome(true)
      var gr = d[0];
      var cl = d[1];
      //var px = new OpenSeadragon.Point(mapX[gr]*1100,mapY[cl]*1100)
      var point = viewer.viewport.imageToViewportCoordinates(mapX[gr] * window.dim.x / (2 * myGroups.length), mapY[cl] * window.dim.y / (2 * myVars.length));
      // var point = new OpenSeadragon.Point(0.1,0.2);
      // viewer1.viewport.zoomTo(1,point,true);
      viewer.viewport.panTo(point, true);
      viewer.viewport.zoomBy(minDim - 0.3, true);


    }

    // add the squares
    svg.selectAll()
      .data(data)
      .enter()
      .append("rect")
      .attr("x", function (d) { return x(d.Col) })
      .attr("y", function (d) { return y(d.Row) })
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", function (d) { return myColor(d[value]) })
      .style("stroke-width", 4)
      .style("stroke", "none")
      .style("opacity", 0.8)
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave)
      .on("click", click)
      .datum(function (d) { return [d.Col, d.Row, d[value]] })



    svg.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", function (d) { return x(d.Col) + x.bandwidth()/2 })
      .attr("cy", function (d) { return y(d.Row) + y.bandwidth()/2 })
      .attr("r", 0)
      .style("fill", "black")
      .datum(function (d) { return d[value] })


  })

  // Add title to graph
  //svg.append("text")
  //      .attr("x", 0)
  //    .attr("y", -50)
  //  .attr("text-anchor", "left")
  //.style("font-size", "22px")
  //.text("A d3.js heatmap");

  // Add subtitle to graph
  //svg.append("text")
  //      .attr("x", 0)
  //    .attr("y", -20)
  //  .attr("text-anchor", "left")
  // .style("font-size", "14px")
  //.style("fill", "grey")
  //.style("max-width", 400)
  //.text("A short description of the take-away message of this chart.");
}


//adding a color gradient 

function drawScale(id, interpolator) {
  var data = Array.from(Array(100).keys());

  var cScale = d3.scaleSequential()
    .interpolator(interpolator)
    .domain([99, 0]);

  var xScale = d3.scaleLinear()
    .domain([0, 99])
    .range([0, 300]);

  var u = d3.select("#" + id)
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d) => Math.floor(xScale(d)))
    .attr("y", 0)
    .attr("height", 30)
    .attr("width", (d) => {
      if (d == 99) {
        return 6;
      }
      return Math.floor(xScale(d + 1)) - Math.floor(xScale(d)) + 1;
    })
    .attr("transform",
      "translate(" + 30 + "," + 0 + ")")
    .attr("fill", (d) => cScale(d));
}
