/*
*    mainquarterly.js
*    Sentiment and revenue by quarter, animated
* 
*    Shawn Ban
*    1 July, 2018
*/

var margin = { left:80, right:20, top:20, bottom:100 };
var height = 500 - margin.top - margin.bottom, 
    width = 800 - margin.left - margin.right;

var g = d3.select("#chart-area")
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", "translate(" + margin.left + 
            ", " + margin.top + ")");

var time = 0;
var interval;
var formattedData;
var transitionTime = 1000;
var quarterData;

// Tooltip
var tip = d3.tip().attr('class', 'd3-tip')
    .html(function(d) {
        var text = "<strong>Company:</strong> <span style='color:red'>" + d["name"] + "</span><br>";
        text += "<strong>Sector:</strong> <span style='color:red;text-transform:capitalize'>" + d.sector + "</span><br>";
        text += "<strong>Market capitalization:</strong> <span style='color:red'>" + d3.format("$.1f")(d.mktcap) + " b" +   "</span><br>";
        text += "<strong>Revenue:</strong> <span style='color:red'>" + d3.format("$.1f")(d.revenue) + " b" +   "</span><br>";
        text += "<strong>Operating income:</strong> <span style='color:red'>" + d3.format("$.2f")(d.operatingIncome) + " b" +"</span><br>";
        text += "<strong>Net income:</strong> <span style='color:red'>" + d3.format("$.2f")(d.netIncome) + " b" +   "</span><br>";
        text += "<strong>Sentiment:</strong> <span style='color:red'>" + d3.format(".2f")(d.sentiment_score) + "</span><br>";
        return text;
    });
g.call(tip);

// Scales
var x = d3.scaleLinear()
    .range([0, width])
    .domain([0.15, 0.9]);
var y = d3.scaleLog()
    .base(10)
    .range([height, 0])
    .domain([1, 150]);
var sectorColor = d3.scaleOrdinal(d3.schemeSet2);
var area = d3.scaleLinear()
    .range([5*Math.PI, 3000*Math.PI])
    .domain([1, 1000]);

// Labels
var xLabel = g.append("text")
    .attr("y", height + 50)
    .attr("x", width / 2)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Sentiment (higher = more positive)");
var yLabel = g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -40)
    .attr("x", -170)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Revenue (US$b)");
var timeLabel = g.append("text")
    .attr("y", 20)
    .attr("x", width - 40)
    .attr("font-size", "32px")
    .attr("opacity", "0.4")
    .attr("text-anchor", "middle")
    .text("2008Q1");

// X Axis
var xAxisCall = d3.axisBottom(x);
g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height +")")
    .call(xAxisCall);

// Y Axis
var yAxisCall = d3.axisLeft(y)
    .tickFormat(function(d){ return +d; })
    .tickValues([1.5, 2.5, 5, 10, 25, 50, 100, 150]);
g.append("g")
    .attr("class", "y axis")
    .call(yAxisCall);

var sectors = ["technology", "financials", "industrials", "energy", "consumer discretionary", "healthcare", "consumer staples", "telecoms"];

var legend = g.append("g")
    .attr("transform", "translate(" + (width) + 
        "," + (height-110) + ")");

sectors.forEach(function(sector, i){
    var legendRow = legend.append("g")
        .attr("transform", "translate(0, " + (i * 14) + ")");

    legendRow.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", sectorColor(sector));

    legendRow.append("text")
        .attr("x", -10)
        .attr("y", 10)
        .attr("text-anchor", "end")
        .style("text-transform", "capitalize")
        .text(sector);
});

d3.json("/data/group_by_quarter.json").then(function(data){

    // Clean data
    formattedData = data.map(function(quarter){
        return quarter["data"].filter(function(company){
            var dataExists = (company.sentiment_score && company.revenue);
            return dataExists
        }).map(function(company){
            company.revenue = +company.revenue;
            company.mktcap = +company.mktcap;
            company.sentiment_score = +company.sentiment_score;
            return company;            
        })
    });

    quarterData = data.map(function(quarter){
        return quarter["quarter"]
    });

    // First run of the visualization
    update(formattedData[0], quarterData[0]);

})

$("#play-button")
    .on("click", function(){
        var button = $(this);
        if (button.text() == "Play"){
            button.text("Pause");
            interval = setInterval(step, transitionTime);            
        }
        else {
            button.text("Play");
            clearInterval(interval);
        }
    })

$("#reset-button")
    .on("click", function(){
        time = 0;
        update(formattedData[0], quarterData[0]);
    })

$("#sector-select")
    .on("change", function(){
        update(formattedData[time], quarterData[time]);
    })

function step(){

    if (time < 39 ){
        time++;
        update(formattedData[time], quarterData[time]);
    }   
}

function update(data, quarter) {
    // Standard transition time for the visualization

    var t = d3.transition()
        .duration(transitionTime);

    var sector = $("#sector-select").val();

    var data = data.filter(function(d){
        if (sector == "all") { return true; }
        else {
            return d.sector == sector;
        }
    })

    // JOIN new data with old elements.
    var circles = g.selectAll("circle").data(data, function(d){
        return d.stock;
    });

    // EXIT old elements not present in new data.
    circles.exit()
        .attr("class", "exit")
        .remove();

    // ENTER new elements present in new data.
    circles.enter()
        .append("circle")
        .attr("class", "enter")
        .attr("fill", function(d) { return sectorColor(d.sector); })
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide)
        .merge(circles)
        .transition(t)
            .ease(d3.easeExp)
            .attr("cy", function(d){ return y(d.revenue) })
            .attr("cx", function(d){ return x(d.sentiment_score); })
            .attr("r", function(d){ return Math.sqrt(area(d.mktcap) / Math.PI) });

    // Update the time label
    timeLabel.text(quarter);
}