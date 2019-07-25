/*
*    overview.js
*    View sentiment and correlation by company
* 
*    Shawn Ban
*    1 July, 2018
*/

//VARIABLES FOR LEFT CHART:
var margin = { left:40, right:50, top:25, bottom:75 };
var width =  500 - margin.left - margin.right,
    height = 620 - margin.top - margin.bottom;

var t = 2500; //Standard transition time
var t3 = 5000; //Slow transition, so the user can follow
var t5 = 7500; //Transition for the line
var yValue = "sentiment";
var sector = "all";

var g = d3.select("#chart-area")
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

var xAxisGroup = g.append("g")
    .attr("class", "xaxis")
    .attr("transform", "translate(0," + height +")");
var yAxisGroup = g.append("g")
    .attr("class", "yaxis");

// Scales
var x = d3.scaleLinear().range([0, width]);
var y = d3.scaleBand().range([height, 0]);

var formattedData, formattedData2;
var xAxisCall, yAxisCall;
var circles, circles2;
var currentStock = "NKE";
var currentName = "Nike";

var dict = {
  sentiment: "Sentiment (higher = more positive)",
  corr_revenue: "Correlation with revenue",
  corr_operating: "Correlation with operating income",
  corr_net: "Correlation with net income"
};

var dict3 = {
  sentiment: "Sentiment score",
  corr_revenue: "Correlation with revenue",
  corr_operating: "Correlation with operating income",
  corr_net: "Correlation with net income"
};

// Y Gridlines
var gridlines = d3.axisLeft()
    .tickFormat("")
    .tickSize(-width)
    .scale(y);

// X Label
var xLabel = g.append("text")
    .attr("y", height + 50)
    .attr("x", width / 2)
    .attr("font-size", "16px")
    .attr("text-anchor", "middle");


//VARIABLES FOR RIGHT CHART:
var margin2 = { left:60, right:10, top:30, bottom:75 },
    height2 = 620 - margin2.top - margin2.bottom, 
    width2 = 700 - margin2.left - margin2.right;

var svg2 = d3.select("#chart-bottom")
    .append("svg")
    .attr("width", width2 + margin2.left + margin2.right)
    .attr("height", height2 + margin2.top + margin2.bottom)

var g2 = svg2.append("g")
        .attr("transform", "translate(" + margin2.left + 
            ", " + margin2.top + ")");

// Scales
var x2 = d3.scaleLinear().range([0, width2]);
var y2 = d3.scaleLinear().range([height2, 0]);

// Axis labels
var yLabel2 = g2.append("text")
    .attr("class", "y axisLabel")
    .attr("transform", "rotate(-90)")
    .attr("y", -40)
    .attr("x", -220)
    .attr("font-size", "16px")
    .attr("text-anchor", "middle");

// X Label
var xLabel2 = g2.append("text")
    .attr("y", height2 + 50)
    .attr("x", width2 / 2)
    .attr("font-size", "16px")
    .attr("text-anchor", "middle")
    .text("Sentiment (higher = more positive)");

// X-axis
var xAxisCall2 = d3.axisBottom()
    .ticks(10);
var xAxis2 = g2.append("g")
    .attr("class", "xaxis")
    .attr("transform", "translate(0," + height2 +")");

// Y-axis
var yAxisCall2 = d3.axisLeft()
    .ticks(10);
var yAxis2 = g2.append("g")
    .attr("class", "yaxis");

var dict2 = {
  revenue: "Revenue US$bn",
  operatingIncome: "Operating income US$bn",
  netIncome: "Net income US$bn"
};

// Titles
var leftTitle = g.append("text")
    .attr("y", -10)
    .attr("x", 0.5*width )
    .attr("text-anchor", "middle")
    .style('font-size', '20px')
    .style('fill', "slategray");

var rightTitle = g2.append("text")
    .attr("y", -10)
    .attr("x", 0.4*width2 )
    .attr("text-anchor", "middle")
    .style('text-transform', 'uppercase')
    .style('font-size', '24px')
    .style('fill', "slategray");

//Quarterly labels:
var highlight = ["2008Q1","2009Q1","2010Q1","2011Q1","2012Q1","2013Q1","2014Q1","2015Q1","2016Q1","2017Q1","2017Q4"];

// Tooltips
var tip = d3.tip().attr('class', 'd3-tip')
    .html(function(d) {
        var text = "<strong><span style='color:white'>" + d.companyname + "</strong></span><br>";
        return text;
    });
g.call(tip);

var tip2 = d3.tip().attr('class', 'd3-tip')
    .html(function(d) {
        var text;
        if (d.word1 === undefined){
            text = "<span style='color:red'>" + d.quarter + ": " + "</span>" + "Transcript not available";
        } else {
            text = "<span style='color:red'>" + d.quarter + ": " + "</span>" 
            + "<span style='text-transform: uppercase'>" + d.word1 + ", " + d.word2 + ", " + d.word3 +  "</span>";
        }
        return text;
    });
g2.call(tip2);

//Event listeners:
$("#var-select").on("change", function(){
        yValue = $("#var-select").val();
        update();
    });

$("#sector-select").on("change", function(){
        sector = $("#sector-select").val();
        update_sector();
    });

$("#financial-select").on("change", update_bottom);

//END OF VARIABLES

//LOAD DATA:
d3.csv("/data/all_grouped.csv").then(function(data){        
    //Clean the data:
    formattedData = data.map(function(d){
            d.sentiment = +d.sentiment;
            d.corr_revenue = +d.corr_revenue;
            d.corr_operating = +d.corr_operating;
            d.corr_net = +d.corr_net;
            return d;            
    });

    //Sort for sentiment:
    formattedData.sort(function(a, b) {
        return d3.ascending(a[yValue], b[yValue]);
    });

    //First plot:
    x.domain([d3.min(formattedData, function(d) { return d[yValue] }) - 0.03, d3.max(formattedData, function(d) { return d[yValue] }) *1.02 ]);
    y.domain(formattedData.map(function(d) { return d.stock; }));

    // X Axis
    xAxisCall = d3.axisBottom(x);
    xAxisGroup.transition()
        .duration(t)
        .ease(d3.easeExp)
        .call(xAxisCall);
    // Y Axis
    yAxisCall = d3.axisLeft(y).ticks(30);
    yAxisGroup.transition()
        .duration(t)
        .ease(d3.easeExp)
        .call(yAxisCall);
    // X label
    xLabel.text(dict[yValue]);

    //draw gridlines:
    g.append("g")
     .attr("class", "grid")
     .call(gridlines);
    
    // Dots
    circles = g.selectAll("circle")
        .data(formattedData)

    // ENTER new elements present in new data...
    circles.enter()
        .append("circle")
            .attr("r", function(d) {
                if(d.stock == currentStock){
                    return 10;
                } else {
                    return 7;
                }
            })
            .attr("fill", function(d) {
                if(d.stock == currentStock){
                    return "#ffa700";
                } else {
                    return "steelblue";
                }
            })
            .transition()
            .duration(t)
            .ease(d3.easeBounce)
                .attr("cx", function(d){ return x(d[yValue])})
                .attr("cy", function(d){ return y(d.stock) + y.bandwidth() / 2 });
                
    circles = g.selectAll("circle");
    circles.on("click", grab_stock)
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide);

    leftTitle.text(dict3[yValue] + " by company");
});

//Load data for right:
d3.json("/data/group_by_stock2.json").then(function(data) {  
  formattedData2 = data;
  for (var stock in data) {
    formattedData2[stock].forEach(function(d){
            d["sentiment_score"] = +d["sentiment_score"];
            d["operatingIncome"] = +d["operatingIncome"];
            d["revenue"] = +d["revenue"];
            d["netIncome"] = +d["netIncome"];
            d["mktcap"] = +d["mktcap"];
    });
  }

  update_bottom();
})


//FUNCTION DECLARATIONS:
function update() {
    
    var filteredData = formattedData.filter(function(d){
        if (sector == "all") { return true; }
        else {
            return d.sector == sector;
        }
    })

    //Horizontal update:
    x.domain([d3.min(filteredData, function(d) { return d[yValue] }) -0.03, d3.max(filteredData, function(d) { return d[yValue] }) *1.02 ]);

    // X Axis
    xAxisGroup.transition()
        .duration(t)
        .ease(d3.easeExp)
        .call(xAxisCall);

    // X label
    xLabel.text(dict[yValue]);
        
    //Grab all the circles:
    circles = g.selectAll("circle");

    //Update horizontally:  
    circles.transition()
        .duration(t)
        .ease(d3.easeExp)
        .attr("cx", function(d){ return x(d[yValue]); })
        .attr("fill", function(d) {
            if (d.stock == currentStock) {
                return "#ffa700";  
            } else if (yValue == "sentiment"){
                return "steelblue";
            } else if (d[yValue] >= 0){
                return "#66c2a5";
            } else {
                return "darkred";
            }
        });

    //Sort the data to change the Y-axis:
    filteredData.sort(function (a,b){
            return d3.ascending(a[yValue], b[yValue]);
    });

    y.domain(filteredData.map(function(d) { return d.stock; }));
    yAxisCall = d3.axisLeft(y).ticks(30);
    yAxisGroup.transition()
        .duration(t3)
        .delay(t+50)
        .ease(d3.easeExp)
        .call(yAxisCall);
    
    //Transition vertically:
    circles.transition()
        .duration(t3)
        .delay(t+50)
        .ease(d3.easeExp)
        .attr("cy", function(d){ return y(d.stock) + y.bandwidth() / 2 });

    circles = g.selectAll("circle");
    circles.on("click", grab_stock)
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide);

    leftTitle.text(dict3[yValue] + " by company");
}


function update_sector() {

    //Filter for sector:
    var filteredData = formattedData.filter(function(d){
        if (sector == "all") { return true; }
        else {
            return d.sector == sector;
        }
    })

    filteredData.sort(function(a, b) {
        return d3.ascending(a[yValue], b[yValue]);
    });    

    x.domain([d3.min(filteredData, function(d) { return d[yValue] }) - 0.05, d3.max(filteredData, function(d) { return d[yValue] }) +0.05 ]);
    y.domain(filteredData.map(function(d) { return d.stock; }));

    // X Axis
    xAxisCall = d3.axisBottom(x);
    xAxisGroup.transition().duration(t).call(xAxisCall);
    // Y Axis
    yAxisCall = d3.axisLeft(y).ticks(30);
    yAxisGroup.transition().duration(t).call(yAxisCall);
    
    // Dots
    circles = g.selectAll("circle")
        .data(filteredData, function(d) { return d.stock; });

    circles.exit()
        .transition()
        .duration(1000)
        .attr("cx", width)
        .attr("cy", height)
        .remove();

    circles.enter()
        .append("circle")
        .merge(circles)
        .attr("r", function(d) {
            if(d.stock == currentStock){
                return 10;
            } else {
                return 7;
            }
        })
        .attr("fill", function(d) {
            if (d.stock == currentStock) {
                return "#ffa700";  
            } else if (yValue == "sentiment"){
                return "steelblue";
            } else if(d[yValue] >= 0){
                return "#66c2a5";
            } else {
                return "darkred";
            }
        })
        .transition()
        .duration(t)
            .attr("cx", function(d){ return x(d[yValue])})
            .attr("cy", function(d){ return y(d.stock) + y.bandwidth() / 2 });
            
    circles = g.selectAll("circle");
    circles.on("click", grab_stock)
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide);           
}


//Updates when stock is clicked:
function grab_stock(d) {
    currentStock = d.stock;
    currentName = d.companyname;

    circles = g.selectAll("circle");

    circles.transition()
        .duration(1000)
        .attr("r", 7)        
        .attr("fill", function(d) {
        if(yValue == "sentiment"){
            return "steelblue";
        } else if(d[yValue] >= 0){
            return "#66c2a5";
        } else {
            return "darkred";
        }
    });

    d3.select(this).transition()
        .duration(1000)
        .attr("r", 10)
        .attr("fill", "#ffa700");
    
    update_bottom();
}


//Updates right chart when stock is clicked:
function update_bottom(stock2){

  var stock2 = currentStock;
  var yValue2 = $("#financial-select").val();
  g2.select("#thisline").remove();

  y2.domain([d3.min(formattedData2[stock2], function(d){ return d[yValue2]; }), 
        d3.max(formattedData2[stock2], function(d){ return d[yValue2]; }) *1.025]);
  x2.domain([d3.min(formattedData2[stock2], function(d){ return d.sentiment_score; }) / 1.05, 
        d3.max(formattedData2[stock2], function(d){ return d.sentiment_score; }) * 1.05]);

// Update axes
    xAxisCall2.scale(x2);
    xAxis2.transition().duration(t).call(xAxisCall2);
    yAxisCall2.scale(y2);
    yAxis2.transition().duration(t).call(yAxisCall2);

// Path generator
    line = d3.line()
        .curve(d3.curveCatmullRom.alpha(0.3))
        .x(function(d){ return x2(d.sentiment_score); })
        .y(function(d){ return y2(d[yValue2]); });

    var mainLine = g2.append("path")
        .attr("d", line(formattedData2[stock2]))
        .attr("class", "line")
        .attr("id", "thisline")
        .attr("fill", "none")
        .attr("stroke", "grey")
        .attr("stroke-width", "1px");

    var totalLength = mainLine.node().getTotalLength();

    g2.select("#thisline")
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
            .duration(t5)
            .delay(t)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

 // JOIN new data with old elements.
    circles2 = g2.selectAll("circle").data(formattedData2[stock2]);

// EXIT old elements not present in new data.
    circles2.exit()
        .attr("class", "exit")
        .remove();

// ENTER new elements present in new data.
    circles2.enter()
        .append("circle")
        .attr("class", "enter")
        .attr("fill", "steelblue")
        .attr("r", 6)
        .on("mouseover", tip2.show)
        .on("mouseout", tip2.hide)
        .merge(circles2)
        .transition()
        .duration(t)
            .ease(d3.easeBounce)
            .attr("cx", function(d){ return x2(d.sentiment_score) })
            .attr("cy", function(d){ return y2(d[yValue2]) });

    var quarterlabels = g2.selectAll(".qtrlabel").data(formattedData2[stock2]);

    quarterlabels.enter()
        .append("text")
        .attr("class", "qtrlabel")
        .merge(quarterlabels)
        .filter(function(d) {return highlight.indexOf(d.quarter) !== -1;})
        .text(function(d) {
            return d.quarter;
        })
        .attr("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .attr("font-size", "11px")
        .attr("fill", "black")
        .transition()
            .duration(t)
            .ease(d3.easeBounce)
            .attr("x", function(d){ return x2(d.sentiment_score) })
            .attr("y", function(d){ return y2(d[yValue2]) })
            .attr("dx", "3px")       // set offset x position
            .attr("dy", "-6px");      // set offset y position

    yLabel2.text(dict2[yValue2]);
    rightTitle.text(currentName);
}