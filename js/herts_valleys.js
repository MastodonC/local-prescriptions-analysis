var statin_prescriptions = function statin_prescriptions(div_map) {

    var baseLayer, ccg_layer, gp_layer, boundaries_layer;
    var ccgLegend, gpLegend, ccgInfo, gpInfo;
    var gp_layer_data;

    var map = L.map(div_map, {minZoom: 6, maxZoom: 16}).setView([51.75, -0.33], 10);

    /* Prepare layers */
    prepare_base_layer();
    prepare_boundaries_layer();
    prepare_ccg_layer();
    prepare_gp_layer();

    baseLayer.addTo(map);

    map.on("zoomend", function (e) {
        console.log(map.getZoom());
        console.log(map.getBounds());
        if (map.getZoom() < 9) {
            if (map.hasLayer(gp_layer)) {
                switch_to_ccg_layer();
            }
        }
        if (map.getZoom() >= 9) {
            if (map.hasLayer(ccg_layer)) {
                switch_to_gp_layer();
            }
        }

    });

    map.on("dragend", function () {
        if (map.getZoom() >= 9) {
            if (map.hasLayer(gp_layer)) {
                gp_layer.clearLayers();
                var bounds = map.getBounds();
                gp_layer.addData(filter_data(bounds));
            }
        }
    });


    ////// Base Layer setup ///////////////////////////////////////////////////////////////////////////////////////////

    function prepare_base_layer() {
        baseLayer = L.tileLayer('http://{s}.tile.cloudmade.com/{key}/22677/256/{z}/{x}/{y}.png',
            {
                attribution: 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2012 CloudMade',
                key: 'BC9A493B41014CAABB98F0471D759707'
            })
    }

    ////// Boundaries layer ///////////////////////////////////////////////////////////////////////////////////////////

    function prepare_boundaries_layer() {

        var defaultStyle = function defaultstyle(feature) {
            return {
                outlineColor: "#000000",
                outlineWidth: 0.5,
                weight: 1,
                opacity: 1,
                fillOpacity: 0
            };
        };
        featureLayer(map, "data/ccg-boundaries.json", defaultStyle, "ccg_boundaries");
    }

    ////// CCG Layer setup ////////////////////////////////////////////////////////////////////////////////////////////

    function prepare_ccg_layer() {

        var color = function getColor(d) {
            return d > 35 ? '#D73027' :
                   d > 30 ? '#F46D43' :
                   d > 25 ? '#FDAE61' :
                   d > 20 ? '#FEE08B' :
                   d > 15 ? '#D9EF8B' :
                   d > 10 ? '#A6D96A' :
                   d > 5 ? '#66BD63' :
                   d > 0 ? '#1A9850' :
                   '#FFFFCC';
        };

        var style = function style(feature) {
            return {
                fillColor: color(feature.properties.ccg_proprietary),
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            }
        };

        var onEachFeature = function onEachFeature(feature, layer) {
            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: zoomToFeature,
                pointToLayer: pointToLayer
            });
        };

        ccg_layer = mergedFeatureLayer(map, "data/ccg_proprietary_statins.csv", "data/ccg-boundaries.json", "ccg_code", style, onEachFeature, pointToLayer, "ccg_boundaries");

        ccgLegend = addLegend([35, 30, 25, 20, 15, 10, 5, 0], map, color);
        ccgLegend.addTo(map);

        ccgInfo = addInfo(map, function (props) {
            var infoBox = '<h3> CCG Proprietary Statins </h3><br/>' +
                'CCG Name: ' + props.ccg_name + '<br />' +
                'CCG Code: ' + props.ccg_code + '<br />' +
                'Percentage of statin prescriptions: ' + numeral(props.ccg_proprietary).format('0,0.00') + '%<br />';
            return infoBox;
        });

        function pointToLayer(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: "#ff7800",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        }

        function highlightFeature(e) {
            var layer = e.target;

            layer.setStyle({
                weight: 5,
                color: '#666',
                dashArray: '',
                fillOpacity: 0.7
            });

            if (!L.Browser.ie && !L.Browser.opera) {
                layer.bringToFront();
            }
            e.target._map.info.update(layer.feature.properties);
        }

        function resetHighlight(e) {
            var layer = e.target;
            layer.setStyle(style(e.target.feature));
            e.target._map.info.update();
        }

        function zoomToFeature(e) {
            e.target._map.fitBounds(e.target.getBounds());
            map.setZoom(10);
            switch_to_gp_layer();
        }
    }

    ////// GP Layer setup /////////////////////////////////////////////////////////////////////////////////////////////

    function prepare_gp_layer() {

        var gp_color = function getColor(d) {
            return d > 40 ? '#D73027' :
                   d > 35 ? '#F46D43' :
                   d > 30 ? '#FDAE61' :
                   d > 25 ? '#FEE08B' :
                   d > 20 ? '#FFFFBF' :
                   d > 15 ? '#D9EF8B' :
                   d > 10 ? '#A6D96A' :
                   d > 5 ? '#66BD63' :
                   d > 0 ? '#1A9850' :
                   '#BABABA';
        };

        var gp_style = function style(feature) {
            return {
                fillColor: gp_color(feature.properties.pct_proprietary),
                weight: 1,
                opacity: 0,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.8
            }
        };

        var pointToLayer = function pointToLayer(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: "#ff7800",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        };
        var onEachFeature = function onEachFeature(feature, layer) {
            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: zoomToFeature,
                pointToLayer: pointToLayer
            });
        };

        gp_layer_data = mergedData(map, "data/statins_gp_ccg.csv", "data/gp_topo.json", "practice_code", "gp_geojson");

        gp_layer = L.geoJson(null, {
            style: gp_style,
            onEachFeature: onEachFeature,
            pointToLayer: pointToLayer
        });

        gpLegend = addLegend([40, 35, 30, 25, 20, 15, 10, 5, 0], map, gp_color);

        function highlightFeature(e) {
            var layer = e.target;

            layer.setStyle({
                weight: 5,
                color: '#666',
                dashArray: '',
                fillOpacity: 0.7
            });

            if (!L.Browser.ie && !L.Browser.opera) {
                layer.bringToFront();
            }
            e.target._map.info.update(layer.feature.properties);
        }

        function resetHighlight(e) {
            var layer = e.target;
            layer.setStyle(gp_style(e.target.feature));
            e.target._map.info.update();
        }

        function zoomToFeature(e) {
            e.target._map.fitBounds(e.target.getBounds());
        }
    }

    ////// Load CCG Layer /////////////////////////////////////////////////////////////////////////////////////////////

    function switch_to_ccg_layer() {

        if (map.hasLayer(gp_layer)) map.removeLayer(gp_layer);
        if (map.hasLayer(boundaries_layer)) map.removeLayer(boundaries_layer);

        map.addLayer(ccg_layer);

        // Replace the legend
        map.removeControl(gpLegend);
        ccgLegend.addTo(map);

        // Replace the info
        map.removeControl(gpInfo);
        ccgInfo = addInfo(map, function (props) {
            var infoBox = '<h3> CCG Proprietary Statins </h3><br/>' +
                'CCG Name: ' + props.ccg_name + '<br />' +
                'CCG Code: ' + props.ccg_code + '<br />' +
                'Percentage of statin prescriptions: ' + numeral((props.ccg_proprietary*100)).format('0,0.00') + '%<br />';
            return infoBox;
        });

    }

    ///// Load GP Layer ///////////////////////////////////////////////////////////////////////////////////////////////

    function switch_to_gp_layer() {

        if (map.hasLayer(gp_layer)) map.removeLayer(gp_layer);
        if (map.hasLayer(ccg_layer)) {
            map.removeLayer(ccg_layer);
        }
        map.addLayer(boundaries_layer);
        map.addLayer(gp_layer);
        if (map.hasLayer(gp_layer)) {
            var bounds = map.getBounds();
            gp_layer.addData(filter_data(bounds));
        }

        // Replace the legend
        map.removeControl(ccgLegend);
        gpLegend.addTo(map);

        // Replace the info
        map.removeControl(ccgInfo);
        gpInfo = addInfo(map, function (props) {
            var infoBox = '<h3> Statin Prescriptions </h3><br/>' +
                'GP Name: ' + props.gp_name + '<br />' +
                'CCG Code: ' + props.ccg_code + '<br />' +
                'Generic statins: ' + numeral(props.generic_statins).format('0,0') + '<br />' +
                'Proprietary statins: ' + numeral(props.proprietary_statins).format('0,0') + '<br />' +
                'Percentage of statin prescriptions: ' + numeral(props.pct_proprietary).format('0,0.00') + '%<br />';
            return infoBox;
        });
        map.on("zoomend", function (e) {
            if (map.hasLayer(gp_layer)) {
                var bounds = map.getBounds();
                gp_layer.addData(filter_data(bounds));
            }
        });
    }

    ////// Processing data ////////////////////////////////////////////////////////////////////////////////////////////

    function filter_data(bounds) {

        var featureCoordinates;
        var visibleMarkers;
        visibleMarkers = _.select(gp_layer_data.features, function (d) {
            featureCoordinates = d.geometry.coordinates;
            if (bounds.contains(new L.LatLng(featureCoordinates[1], featureCoordinates[0]))) {
                return d;
            }
        });
        return visibleMarkers;
    }

    function mergedData(map, csvDir, jsonDir, joinFieldKey, featureObject) {

        var buildingData = $.Deferred();

        d3.csv(csvDir, function (csv) {

            if (csv) {
                $.ajax(
                    {
                        url: jsonDir,
                        async: false,
                        data: 'json',

                        success: function (data) {
                            var ccgs = topojson.feature(data, data.objects[featureObject])
                            features = ccgs.features;
                            data.features = processData(csv, features, joinFieldKey);
                            buildingData.resolve(data);
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            console.log(xhr.status + " - " + thrownError);
                        }
                    });
            }
            else {
                console.log("Error loading CSV data");
            }
        });

        buildingData.done(function (d) {
            console.log("Loaded merged data: " + csvDir + " and " + jsonDir);
            gp_layer_data = d;
            map.spin(false);
        });
    }

    function mergedFeatureLayer(map, csvDir, jsonDir, joinFieldKey, style, onEachFeature, pointToLayer, featureObject) {

        map.spin(true);
        var buildingData = $.Deferred();

        d3.csv(csvDir, function (csv) {

            if (csv) {
                $.ajax(
                    {
                        url: jsonDir,
                        async: false,
                        data: 'json',

                        success: function (data) {
                            var pcts = topojson.feature(data, data.objects[featureObject])
                            features = pcts.features;
                            data.features = processData(csv, features, joinFieldKey);
                            buildingData.resolve(data);
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            console.log(xhr.status + " - " + thrownError);
                        }
                    });
            }
            else {
                console.log("Error loading CSV data");
            }
        });

        buildingData.done(function (d) {
            ccg_layer = L.geoJson(d, {style: style, onEachFeature: onEachFeature, pointToLayer: pointToLayer}).addTo(map);
            console.log("Loaded merged data: " + csvDir + " and " + jsonDir);
        });
    }


    function processData(csvData, features, joinKey) {

        var joinFieldObject = {};

        $.each(features, function (index, object) {

            joinFieldObject[joinKey] = object.properties[joinKey];

            var csv_data = _.findWhere(csvData, joinFieldObject);
            $.extend(object.properties, csv_data);
        });
        return features;
    }

    function featureLayer(map, jsonDir, defaultStyle, featureObject) {
        var layer = L.geoJson(null, { style: defaultStyle});
        console.log("Loading feature data: " + jsonDir);
        map.addLayer(layer);
        d3.json(jsonDir, function (error, data) {
            var ccgs = topojson.feature(data, data.objects[featureObject]);
            boundaries_layer = L.geoJson(ccgs, {style: defaultStyle});
        });
    }

    ////// Info and Legend ////////////////////////////////////////////////////////////////////////////////////////////

    function addInfo(map, callback) {

        var info = L.control();

        info.onAdd = function (map) {

            this._div = L.DomUtil.create('div', 'info');
            this.update();
            return this._div;
        };

        info.update = function (props) {
            if (props) {
                this._div.innerHTML = callback(props);
            } else {
                this._div.innerHTML = "Hover over map";
            }
        };

        info.addTo(map);
        map.info = info;

        return info;
    }


    function addLegend(gradesParam, map, color) {

        var legend = L.control({position: 'bottomright'});

        legend.onAdd = function (map) {

            this._div = L.DomUtil.create('div', 'info legend'),
                grades = gradesParam,
                labels = [];

            // loop through our density intervals and generate a label with a colored square for each interval
            for (var i = 0; i < grades.length - 1; i++) {
                this._div.innerHTML +=
                    '<i style="background:' + color(grades[i] ) + '"></i> ' +
                        grades[i] + ' &ndash; ' + grades[i + 1] + '<br>';
            }
            return this._div;
        };

        return legend;
    }

    ///// Postcode lookup ////////////////////////////////////////////////////////////////////////////////////////

    function postcodeLookup() {
        var postcode = document.getElementById("postcodeInput").value;
        var geocoder = new google.maps.Geocoder(); // Google Maps Geocoding API

        var marker;

        geocoder.geocode({address: postcode}, function (results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                var location = results[0].geometry.location;
                var lat = location.lat();
                var lng = location.lng();
                map.panTo([lat, lng]);
                // Add marker and remove it when it's clicked
                marker = L.marker([lat, lng], {clickable: true}).addTo(map);
                marker.on('click', function () {
                    map.removeLayer(marker)
                });
                map.setZoom(13);
            }
        });
    }

    // Add event handler to postcode lookup button
    var el = document.getElementById("submit");
    if (el.addEventListener) el.addEventListener("click", postcodeLookup, false);
    else if (el.attachEvent) el.attachEvent('onclick', postcodeLookup);


};