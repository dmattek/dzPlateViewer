// function that maps Rows and Columns to middle points of their respective wells
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

//function that creates a color scale for the heatmap values to be interpolated to
function color(maxx, minn) {
  return d3.scaleSequential()
    .interpolator(d3.interpolateSpectral)
    .domain([maxx, minn]) //theese are flipped around because the color scale available in d3 is the inverse of what is needed
}
//hm is an optional parameter that defines if a heatmap is built or if a guidancemap is needed instead
function createHeatmap(viewer, id, df, value, hm = true) {
  // set the dimensions and margins of the graph
  var margin = { top: 20, right: 25, bottom: 30, left: 30 },
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

    // Labels of row and columns 
    var myGroups = d3.map(data, function (d) { return d.Col; }).keys();
    var myVars = d3.map(data, function (d) { return d.Row; }).keys();
    myVars.sort()
    // sort the groups numerically not lexicographically
    myGroups.sort(function (a, b) { return Number(a) - Number(b) })
    // create a mapping of  rows and columns of the data to the middle of their respective well
    var mapX = mapToInt(myGroups);
    var mapY = mapToInt(myVars);
    // reverse the vars order to match the general plate order
    var myVars = myVars.reverse()
    // find the minimum dimension of the plate 
    window.minDim = Math.min(myVars.length, myGroups.length)

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

    var click = function (d) {
      // reset before every zoom to default starting positions so that coordinats are properly synced
      viewer.viewport.goHome(true)
      var cl = d[0];
      var rw = d[1];
      //select a point to zoom to and convert it from pixelCoordinates to Viewport
      var point = viewer.viewport.imageToViewportCoordinates(mapX[cl] * window.dim.x / (2 * myGroups.length), mapY[rw] * window.dim.y / (2 * myVars.length));
      // move to the specified point and zoom to it
      viewer.viewport.panTo(point, true);
      viewer.viewport.zoomBy(minDim - 0.3, true); //deducting 0.3 has shown to give good results empirically

    }

    //data dependent part only used when heatmap is built
    if (hm) {
      window.maxWell = 1 / Math.max(myVars.length, myGroups.length) // inverse is taken directly as its needed as such in further calculations
      window.Height = viewer.viewport.imageToViewportCoordinates(window.dim.x / (myGroups.length)).x
      window.Width = viewer.viewport.imageToViewportCoordinates(window.dim.y / (myVars.length)).x
      // convert the target values to Numerical data type
      var valz = []
      data.map(function (d) {
        valz.push(d[value])
      })
      var valz = valz.map(Number)



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
        .datum(function (d) { return [d.Col, d.Row, d[value]] })  //binds the actual data to individual squares important for color changes


      // add the circles that are adjusted based on the slider treshold
      svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function (d) { return x(d.Col) + x.bandwidth() / 2 })
        .attr("cy", function (d) { return y(d.Row) + y.bandwidth() / 2 })
        .attr("r", 0)
        .style("fill", "black")
        .datum(function (d) { return d[value] }) // save the value of the specified data to the given circle
    }
    else {
      data = d3.cross(myGroups,myVars)
      // Two functions that change the tooltip when user hover/leave a cell
      var mouseover = function (d) {
        d3.select(this)
          .style("stroke", "black")
          .style("opacity", 1)
      }
      var mouseleave = function (d) {
        d3.select(this)
          .style("stroke", "none")
          .style("opacity", 0.8)
      }

      // add the squares
      svg.selectAll()
        .data(data)
        .enter()
        .append("rect")
        .attr("x", function (d) { return x(d[0]) })
        .attr("y", function (d) { return y(d[1]) })
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", "orange")
        .style("stroke-width", 4)
        .style("stroke", "none")
        .style("opacity", 0.8)
        .on("mouseover", mouseover)
        .on("mouseleave", mouseleave)
        .on("click", click)
        .datum(function (d) { return [d[0], d[1]] })  //binds the actual data to individual squares important for color changes


    }
  })

}


//adding a color gradient to see the span of colors that the heatmap takes 

function drawScale(id, interpolator) {
  var data = Array.from(Array(100).keys());

  var cScale = d3.scaleSequential()
    .interpolator(interpolator)
    .domain([99, 0]); // another inverse to match the target color range

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
