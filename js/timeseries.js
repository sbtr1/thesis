/*
*    timeseries.js
*    Sentiment and financial measures over time
* 
*    Shawn Ban
*    1 July, 2018
*/

var margin = { left:80, right:100, top:50, bottom:100 },
    height = 500 - margin.top - margin.bottom, 
    width = 800 - margin.left - margin.right;

var svg = d3.select("#chart-area")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + 
            ", " + margin.top + ")");

var t = function(){ return d3.transition().duration(1500); }
var formattedData;

// Add the line for the first time
g.append("path")
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", "2px");

// Labels

var yLabel = g.append("text")
    .attr("class", "y axisLabel")
    .attr("transform", "rotate(-90)")
    .attr("y", -60)
    .attr("x", -170)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Sentiment")

// Scales
var x = d3.scaleBand().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);

// X-axis
var xAxisCall = d3.axisBottom()
    .ticks(40);
var xAxis = g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height +")");

// Y-axis
var yAxisCall = d3.axisLeft()
    .ticks(10);
var yAxis = g.append("g")
    .attr("class", "y axis");

// Event listeners
$("#stock-select").on("change", update)
$("#var-select").on("change", update)

d3.json("/data/group_by_stock2.json").then(function(data){
    
    // Prepare and clean data
    formattedData = data;
    for (var stock in data) {
        formattedData[stock].forEach(function(d){
            d["sentiment_score"] = +d["sentiment_score"];
            d["operatingIncome"] = +d["operatingIncome"];
            d["revenue"] = +d["revenue"];
            d["netIncome"] = +d["netIncome"];
            d["mktcap"] = +d["mktcap"];
        });
    }

    x.domain(formattedData[stock].map(function(d) { return d.quarter; }));

    // Run the visualization for the first time
    update();
})


function update() {
    
    // Filter data based on selections
    var stock = $("#stock-select").val();
    var yValue = $("#var-select").val();

    // Update scales
    y.domain([d3.min(formattedData[stock], function(d){ return d[yValue]; }) / 1.005, 
        d3.max(formattedData[stock], function(d){ return d[yValue]; }) * 1.005]);

    // Update axes
    xAxisCall.scale(x);
    xAxis.call(xAxisCall)
        .selectAll("text")
        .attr("y", 5)
        .attr("x", -25)
        .attr("transform", "rotate(-60)");
    
    yAxisCall.scale(y);
    yAxis.transition(t()).call(yAxisCall);

    // Path generator
    line = d3.line()
        .curve(d3.curveCatmullRom.alpha(0.5))
        .x(function(d){ return x(d.quarter); })
        .y(function(d){ return y(d[yValue]); });

    // Update our line path
    g.select(".line")
        .transition(t())
        .attr("d", line(formattedData[stock]));

    // Update y-axis label
    var newText;
    if (yValue == "sentiment_score") {
        newText = "Sentiment score";
    } else if (yValue == "revenue") {
        newText = "Revenue (US$bn)";
    } else if (yValue == "operatingIncome") {
        newText = "Operating income (US$bn)"
    } else {
        newText = "Net income (US$bn)"
    }

    yLabel.text(newText);
    
}





