/*
*    singlecompany.js
*    Draws a connected scatterplot per company
* 
*    Shawn Ban
*    1 July, 2018
*/

var margin = { left:80, right:200, top:20, bottom:100 },
    height = 600 - margin.top - margin.bottom, 
    width = 900 - margin.left - margin.right;

var svg = d3.select("#chart-area")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)

var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + 
            ", " + margin.top + ")");

var tip = d3.tip().attr('class', 'd3-tip')
    .html(function(d) {
        var text = "<strong>Quarter: </strong> <span style='color:blue'>" + d.quarter + "</span><br>";
        text += "<strong>Word 1: </strong> <span style='color:blue;text-transform:capitalize'>" + d.word1 + "</span><br>";
        text += "<strong>Word 2: </strong> <span style='color:blue;text-transform:capitalize'>" + d.word2 +   "</span><br>";
        text += "<strong>Word 3: </strong> <span style='color:blue;text-transform:capitalize'>" + d.word3 +  "</span><br>";
        return text;
    });
g.call(tip);

var highlight = ["2008Q1","2009Q1","2010Q1","2011Q1","2012Q1","2013Q1","2014Q1","2015Q1","2016Q1","2017Q1","2017Q4"];

var formattedData;
var t = function(){ return d3.transition().duration(1500); }
var t2 = function() { return d3.transition().duration(5000); }

// Scales
var x = d3.scaleLinear().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);

// Axis labels
var yLabel = g.append("text")
    .attr("class", "y axisLabel")
    .attr("transform", "rotate(-90)")
    .attr("y", -30)
    .attr("x", -220)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")

// X Label
var xLabel = g.append("text")
    .attr("y", height + 50)
    .attr("x", width / 2)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Sentiment (higher = more positive)");

// X-axis
var xAxisCall = d3.axisBottom()
    .ticks(10);
var xAxis = g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height +")");

// Y-axis
var yAxisCall = d3.axisLeft()
    .ticks(10);
var yAxis = g.append("g")
    .attr("class", "y axis");

var dict = {
  revenue: "Revenue US$bn",
  operatingIncome: "Operating income US$bn",
  netIncome: "Net income US$bn"
};


//Event listeners
$("#stock-select").on("change", update);
$("#var-select").on("change", update);

d3.json("/data/group_by_stock2.json").then(function(data) {  
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

  update();
})

function update(){

  var stock = $("#stock-select").val();
  var yValue = $("#var-select").val();
  g.select("#thisline").remove();

  y.domain([d3.min(formattedData[stock], function(d){ return d[yValue]; }), 
        d3.max(formattedData[stock], function(d){ return d[yValue]; }) *1.025]);
  x.domain([d3.min(formattedData[stock], function(d){ return d.sentiment_score; }) / 1.05, 
        d3.max(formattedData[stock], function(d){ return d.sentiment_score; }) * 1.05]);

// Update axes
    xAxisCall.scale(x);
    xAxis.transition(t()).call(xAxisCall);
    yAxisCall.scale(y);
    yAxis.transition(t()).call(yAxisCall);

// Path generator
    line = d3.line()
        .curve(d3.curveCatmullRom.alpha(0.3))
        .x(function(d){ return x(d.sentiment_score); })
        .y(function(d){ return y(d[yValue]); });

    var mainLine = g.append("path")
        .attr("d", line(formattedData[stock]))
        .attr("class", "line")
        .attr("id", "thisline")
        .attr("fill", "none")
        .attr("stroke", "grey")
        .attr("stroke-width", "1px");

    var totalLength = mainLine.node().getTotalLength();

    g.select("#thisline")
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition(t2())
            .delay(1500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

 // JOIN new data with old elements.
    var circles = g.selectAll("circle").data(formattedData[stock]);

// EXIT old elements not present in new data.
    circles.exit()
        .attr("class", "exit")
        .remove();

// ENTER new elements present in new data.
    circles.enter()
        .append("circle")
        .attr("class", "enter")
        .attr("fill", "DarkCyan")
        .attr("r", 5)
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide)
        .merge(circles)
        .transition(t())
            .ease(d3.easeBounce)
            .attr("cx", function(d){ return x(d.sentiment_score) })
            .attr("cy", function(d){ return y(d[yValue]) });

    var quarterlabels = g.selectAll(".qtrlabel").data(formattedData[stock]);

    quarterlabels
        .enter()
        .append("text")
        .attr("class", "qtrlabel")
        .filter(function(d) {return highlight.indexOf(d.quarter) !== -1;})
        .text(function(d) {
            return d.quarter;
        })
        .attr("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .attr("font-size", "11px")
        .attr("fill", "black")
        .merge(quarterlabels)
        .transition(t())
            .ease(d3.easeLinear)
            .attr("x", function(d){ return x(d.sentiment_score) })
            .attr("y", function(d){ return y(d[yValue]) })
            .attr("dx", "5px")       // set offset x position
            .attr("dy", "-5px");      // set offset y position

    var label = dict[yValue];
    yLabel.text(label);
}