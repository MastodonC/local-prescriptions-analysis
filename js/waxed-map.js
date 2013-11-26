var waxedmap = function waxedmap(spec) {

    function parseSpec(spec) {

        $.getJSON(
            spec,
            function (data) {
                var defs = {
                    div: data.div,
                    view: data.view,
                    zoom: data.zoom,
                    minZoom: data.minZoom,
                    maxZoom: data.maxZoom,
                    tiles: data.data.tiles,
                    grids: data.data.grids,
                    title: data.legend.title,
                    colors: data.legend.colors,
                    range: data.legend.range,
                    categories: data.legend.categories,
                    info_header: data.infoBox.header,
                    info_labels: data.infoBox.labels,
                    info_fields: data.infoBox.fields,
                    info_formats: data.infoBox.formats,
                    tilejson: data.tilejson,
                    search_input: data.postcode_input,
                    search_submit: data.postcode_submit
                }

                createMap(defs);
            }).fail(function (data) {
                alert("Could not load " + spec);
            });
    }

    function createMap(defs) {

        var map = new L.map(defs.div,
            {
                minZoom: defs.minZoom,
                maxZoom: defs.maxZoom
            })
            .setView(defs.view, defs.zoom);

        var baseLayer = L.tileLayer('http://{s}.tile.cloudmade.com/{key}/22677/256/{z}/{x}/{y}.png',
            {
                attribution: 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2012 CloudMade',
                key: 'BC9A493B41014CAABB98F0471D759707',
                opacity: 1
            });
        map.addLayer(baseLayer);
        baseLayer.bringToBack();

        var tilesLayer = L.tileLayer(defs.tiles, { opacity: 0.9, tms: true });
        map.addLayer(tilesLayer);

        // Control opacity on a given zoom level
        map.on("zoomend", function (e) {
            if (map.getZoom() <= 9) tilesLayer.setOpacity(0.8);
            if (map.getZoom() == 10) tilesLayer.setOpacity(0.7);
            if (map.getZoom() == 11) tilesLayer.setOpacity(0.6);
            if (map.getZoom() > 11) tilesLayer.setOpacity(0.5);

        });

        ///// Info Box ////////////////////////////////////////////////////////////////////////////////////////////////

        addInfo(map, function (props) {
            var infoBox = defs.info_header;
            for (var i = 0; i < defs.info_labels.length; i++) {
                if (defs.info_formats[i] != null) {
                    infoBox = infoBox + '</br>' + defs.info_labels[i] + '' +
                        (props[defs.info_fields[i]] == null ? "N/A" : (props[defs.info_fields[i]] == 0 ? "N/A" :
                    numeral(props[defs.info_fields[i]]).format(defs.info_formats[i])));
                }
                else {
                    infoBox = infoBox + '</br>' + defs.info_labels[i] + '' +
                        (props[defs.info_fields[i]] == null ? "N/A" : (props[defs.info_fields[i]] == 0 ? "N/A" :
                            props[defs.info_fields[i]]));
                }
            }
            return infoBox;
        });

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
        }

        ///// Legend //////////////////////////////////////////////////////////////////////////////////////////////////

        var color = function getColor(d) {
            for (var i = 0; i < defs.colors.length; i++) {
                if (d >= defs.range[i]) {
                    return defs.colors[i];
                }
            }
        };

        addLegend(defs.range, defs.title, map, color);

        function addLegend(gradesParam, title, map, color) {

            var div;
            var legend = L.control({position: 'bottomright'});
            legend.onAdd = function (map) {

                this._div = L.DomUtil.create('div', 'info legend'),
                    grades = gradesParam;

                div = "<div class='my-legend'>" +
                    "<div class='legend-title'>" + title + "</div>" +
                    "<div class='legend-scale'>" +
                    "<ul class='legend-labels'>";

                // loop through our density intervals and generate a label with a colored square for each interval
                for (var i = 0; i < defs.colors.length; i++) {

                    div += '<li><span style="background:' + color(grades[i]) + '"></span>' + grades[i] +
                        ' &ndash; ' +
                        grades[i + 1] + '</li>';

                }

                this._div.innerHTML = div;
                return this._div;
            };

            legend.addTo(map);
        }

        ///// Wax interaction ////////////////////////////////////////////////////////////////////////////////////////

        var default_cursor = document.getElementById(defs.div).style.cursor;

        wax.leaf.interaction()
            .map(map)
            .tilejson(defs.tilejson)
            .on({
                on: function (o) {
                    if (o.e.type == 'mousemove') {
                        map.info.update(o.data);
                        document.getElementById(defs.div).style.cursor = 'pointer';
                    }
                },
                off: function () {
                    map.info.update();
                    document.getElementById(defs.div).style.cursor = default_cursor;
                }
            });

        ///// Postcode lookup ////////////////////////////////////////////////////////////////////////////////////////

        function postcodeLookup() {
            var postcode = document.getElementById(defs.search_input).value;
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
        if(defs.search_submit != null){
            var el = document.getElementById(defs.search_submit);
            if (el.addEventListener) el.addEventListener("click", postcodeLookup, false);
            else if (el.attachEvent) el.attachEvent('onclick', postcodeLookup);
        }
    }

    parseSpec(spec);

}
