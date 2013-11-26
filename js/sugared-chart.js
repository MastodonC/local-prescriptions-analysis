var sugaredchart = function sugaredchart(spec) {

    function parseSpec(spec) {

        $.getJSON(
            spec,
            function(data){
                var defs = {
                    div: data.div,
                    svg_width: data.svg_width,
                    svg_height: data.svg_height,
                    filter_field: data.filter_data.field,
                    filter_value: data.filter_data.value,
                    bounds_x: data.bounds.x,
                    bounds_y: data.bounds.y,
                    bounds_width:  data.bounds.width,
                    bounds_height: data.bounds.height,
                    type: data.type,
                    csv_url: data.csv_url,
                    x_axis_type: data.x_axis.type,
                    x_axis_field: data.x_axis.field,
                    x_axis_ordering: data.x_axis.ordering_field,
                    x_axis_descending: data.x_axis.descending,
                    x_axis_title: data.x_axis.override_title,
                    y_axis_type: data.y_axis.type,
                    y_axis_field: data.y_axis.field,
                    y_axis_min: data.y_axis.override_min,
                    y_axis_max: data.y_axis.override_max,
                    y_axis_title: data.y_axis.override_title,
                    z_axis_field: data.z_axis.field,
                    series: data.series,
                    popup_labels: data.popup.labels,
                    popup_formats: data.popup.formats
                }

                createChart(defs);
            }).fail(function(data){
                alert("Could not load "+spec);
            });
    }

    function createChart(defs){

        var svg = dimple.newSvg(defs.div, defs.svg_width, defs.svg_height);
        var dropLine, popup, popupLabels, popupValues, popupWidth;

        d3.csv(defs.csv_url, function (data) {

            if(defs.filter_field.length > 0){
                data = dimple.filterData(data, defs.filter_field, defs.filter_value)
            }

            var myChart = new dimple.chart(svg, data);

            myChart.setBounds(defs.bounds_x, defs.bounds_y, defs.bounds_width, defs.bounds_height);

            var x, y, z, s; // Axes and data series

            /* x-axis settings */
            if(defs.x_axis_type == "category") x = myChart.addCategoryAxis("x", defs.x_axis_field);
            else x = myChart.addMeasureAxis("x", defs.x_axis_field);

            if(defs.x_axis_descending == true) x.addOrderRule(defs.x_axis_ordering, defs.x_axis_descending);
            else x.addOrderRule(defs.x_axis_ordering);

            /* y-axis settings */
            if(defs.y_axis_type == "measure") y = myChart.addMeasureAxis("y", defs.y_axis_field);
            else if(defs.y_axis_type == "category") y = myChart.addCategoryAxis("y", defs.y_axis_field);
            if(defs.y_axis_min != null) y.overrideMin = defs.y_axis_min;
            if(defs.y_axis_max != null) y.overrideMax = defs.y_axis_max;

            /* z-axis settings (to use with bubble chart only */
            if(defs.z_axis_field != null) z = myChart.addMeasureAxis("z", defs.y_axis_field);

            /* Data series */
            if(defs.type == "bubble") s = myChart.addSeries(defs.series, dimple.plot.bubble);
            else if(defs.type == "bar") s = myChart.addSeries(defs.series, dimple.plot.bar);

            popupLabels = defs.popup_labels;

            // Handle the hover event - overriding the default behaviour
            s.addEventHandler("mouseover", onHover);
            // Handle the leave event - overriding the default behaviour
            s.addEventHandler("mouseleave", onLeave);

            myChart.draw();

            /* Override titles */
            if(defs.x_axis_title.length > 0) {
                x.titleShape.text (defs.x_axis_title);
                x.titleShape.attr("y", myChart.height + 60);
            }
            if(defs.y_axis_title.length > 0){
                y.titleShape.text(defs.y_axis_title);
            }

            // Event to handle mouse enter
            function onHover(e) {

                if(defs.type == "bubble") {
                    // Get the properties of the selected shape
                    var cx = parseFloat(e.selectedShape.attr("cx")),
                        cy = parseFloat(e.selectedShape.attr("cy")),
                        r = parseFloat(e.selectedShape.attr("r"));

                    // Set the size and position of the popup
                    var width = 150,
                        height = 70,
                        x = (cx + r + width + 10 < svg.attr("width") ?
                            cx + r + 10 :
                            cx - r - width - 20),
                        y = (cy - height / 2 < 0 ?
                            15 :
                            cy - height / 2);
                    dropLine = addDropLineCircle(myChart, cx, cy, r);
                }
                else {
                    // Get the properties of the selected shape
                    var x = parseFloat(e.selectedShape.attr("x")),
                        y = parseFloat(e.selectedShape.attr("y")),
                        h = parseFloat(e.selectedShape.attr("height"));
                    // Set the size and position of the popup
                    var width = 100,
                        height = 40;
                    dropLine = addDropLineRect(myChart, e, x, y, h+1);
                }

                popupValues = new Array();

                for(var i = 0; i < defs.series.length; i++){
                    if(defs.popup_formats[i] != null){
                        popupValues.push(numeral(e.seriesValue[i]).format(defs.popup_formats[i]));
                    }
                    else {
                        popupValues.push(e.seriesValue[i]);
                    }
                }
                var textLength = measureText(e.seriesValue[1], 10, "font-family: sans-serif");
                popupWidth = textLength.width + 75;
                popup = addPopup(svg, width, height, x-10, y, popupLabels, popupValues, popupWidth);
            }

            // Event to handle mouse exit
            function onLeave(e) {
                // Remove the popup
                if (popup !== null) {
                    popup.remove();
                }
                // Remove the drop line and ring around circle
                if (dropLine !== null && dropLine !== undefined) {
                    dropLine.remove();
                }
            };
        });
    }
    /* Drop line that goes from the bar to x- and y-axis. Shown on hover. */
    function addDropLineRect(myChart, e, rx, ry, h) {

        var dropLine = myChart._tooltipGroup = myChart.svg.append("g");
        var dropDest = myChart.series[0]._dropLineOrigin(),
            animDuration = 750;

        // Add a drop line to the y axis
        if (dropDest.y !== null) {
            dropLine.append("line")
                .attr("id", "dropRect")
                .attr("x1", (rx < dropDest.x ? rx : rx))
                .attr("y1", (ry < myChart.series[0].y._origin ? ry : ry + h - 1))
                .attr("x2", (rx < dropDest.x ? rx : rx))
                .attr("y2", (ry < myChart.series[0].y._origin ? ry : ry + h - 1))
                .transition()
                .delay(animDuration / 2)
                .duration(animDuration / 2)
                .ease("linear")
                .attr("x2", dropDest.x);
        }

        // Highlight the data point
        dropLine.append("rect")
            .attr("id", "frame")
            .attr("x", rx)
            .attr("y", ry)
            .attr("width", e.selectedShape.attr("width"))
            .attr("height", e.selectedShape.attr("height"))
            .attr("opacity", 0)
            .transition()
            .duration(animDuration / 2)
            .ease("linear")
            .attr("opacity", 1)
            .style("stroke-width", 2);

        return dropLine;
    }

    /* Drop line that goes from the circle to x- and y-axis. Shown on hover. */
    function addDropLineCircle(myChart, cx, cy, r) {

        var dropLine = myChart._tooltipGroup = myChart.svg.append("g");

        var dropDest = myChart.series[0]._dropLineOrigin(),
            animDuration = 750;

        // Add a ring around the data point
        dropLine.append("circle")
            .attr("id", "ring")
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", r)
            .attr("opacity", 0)
            .transition()
            .duration(animDuration / 2)
            .ease("linear")
            .attr("opacity", 1)
            .attr("r", r + 4)
            .style("stroke-width", 2);

        // Add a drop line to the x axis
        if (dropDest.x !== null) {
            dropLine.append("line")
                .attr("id", "drop")
                .attr("x1", (cx < dropDest.x ? cx + r + 4 : cx - r - 4))
                .attr("y1", cy)
                .attr("x2", (cx < dropDest.x ? cx + r + 4 : cx - r - 4))
                .attr("y2", cy)
                .transition()
                .delay(animDuration / 2)
                .duration(animDuration / 2)
                .ease("linear")
                .attr("x2", dropDest.x);
        }

        // Add a drop line to the y axis
        if (dropDest.y !== null) {
            dropLine.append("line")
                .attr("id", "drop")
                .attr("x1", cx)
                .attr("y1", (cy < dropDest.y ? cy + r + 4 : cy - r - 4))
                .attr("x2", cx)
                .attr("y2", (cy < dropDest.y ? cy + r + 4 : cy - r - 4))
                .transition()
                .delay(animDuration / 2)
                .duration(animDuration / 2)
                .ease("linear")
                .attr("y2", dropDest.y);
        }
        return dropLine;
    }

    function addPopup(chart_svg, width, height, x, y, labels, values, popupWidth) {

        var popup = chart_svg.append("g");

        // Add a rectangle surrounding the text
        popup
            .append("rect")
            .attr("id", "tooltip")
            .attr("x", x + 50)
            .attr("y", y - 10)
            .attr("width", popupWidth)
            .attr("height", height)
            .attr("rx", 5)
            .attr("ry", 5);

        var offset = 9; // Each line of text needs to be moved down
        for (var i = 0; i < labels.length; i++) {
            popup
                .append('text')
                .append('tspan')
                .attr('x', x + 55)
                .attr('y', y + offset)
                .text('' + labels[i] + ': ' + values[i])
                .style("font-family", "sans-serif")
                .style("font-size", 10);
            offset += 12;
        }
        return popup;
    }

    /* Function that is used to estimate the width of the custom tooltip */
    function measureText(pText, pFontSize, pStyle) {
        var lDiv = document.createElement('lDiv');

        document.body.appendChild(lDiv);

        if (pStyle != null) {
            lDiv.style = pStyle;
        }
        lDiv.style.fontSize = "" + pFontSize + "px";
        lDiv.style.position = "absolute";
        lDiv.style.left = -1000;
        lDiv.style.top = -1000;

        lDiv.innerHTML = pText;

        var lResult = {
            width: lDiv.clientWidth,
            height: lDiv.clientHeight
        };

        document.body.removeChild(lDiv);
        lDiv = null;

        return lResult;
    }

    parseSpec(spec);

}