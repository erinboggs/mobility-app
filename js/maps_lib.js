/*!
 * Searchable Map Template with Google Fusion Tables
 * http://derekeder.com/searchable_map_template/
 *
 * Copyright 2012, Derek Eder
 * Licensed under the MIT license.
 * https://github.com/derekeder/FusionTable-Map-Template/wiki/License
 *
 * Date: 12/10/2012
 *
 */

// Enable the visual refresh
google.maps.visualRefresh = true;

var MapsLib = MapsLib || {};
var MapsLib = {

  //Setup section - put your Fusion Table details here
  //Using the v1 Fusion Tables API. See https://developers.google.com/fusiontables/docs/v1/migration_guide for more info

  //the encrypted Table ID of your Fusion Table (found under File => About)
  //NOTE: numeric IDs will be deprecated soon
  fusionTableId:      "1qk9z46VakTMrA7zLpt8y4SfQos3FGsWhRTrww1yZ", //Mobility App Neighborhood Assets point layer
  // https://www.google.com/fusiontables/DataSource?docid=1qk9z46VakTMrA7zLpt8y4SfQos3FGsWhRTrww1yZ  

  polygon1TableID:    "19hpBpYE3GaHGZL79CJHN77wRHsiUDNnyEgLvvyjB", // Opportunity-index-2014-updated-2015-02-10 (with Census 2010 tracts polygons)
  // https://www.google.com/fusiontables/data?docid=19hpBpYE3GaHGZL79CJHN77wRHsiUDNnyEgLvvyjB#map:id=3

  //*New Fusion Tables Requirement* API key. found at https://code.google.com/apis/console/
  //*Important* this key is for demonstration purposes. please register your own.
  googleApiKey:       "AIzaSyDIevSvpV-ONb4Pf15VUtwyr_zZa7ccwq4",

  //name of the location column in your Fusion Table.
  //NOTE: if your location column name has spaces in it, surround it with single quotes
  //example: locationColumn:     "'my location'",
  //if your Fusion Table has two-column lat/lng data, see https://support.google.com/fusiontables/answer/175922
  locationColumn:     "Lat",  // in this point data table, must be capitalized "Lat"

  map_centroid:       new google.maps.LatLng(41.5,-72.7), //center that your map defaults to
  recordName:         "result",       //for showing number of results
  recordNamePlural:   "results",


  searchRadius:       8050,            //in meters ~ 5 mile
  defaultZoom:        9,             //zoom level when map is loaded (bigger is more zoomed in)
  addrMarkerImage:    'images/blue-pushpin.png', // set to empty '' to hide searched address marker
  currentPinpoint:    null,

  initialize: function() {
    $( "#result_count" ).html("");

    geocoder = new google.maps.Geocoder();
    var myOptions = {
      zoom: MapsLib.defaultZoom,
      center: MapsLib.map_centroid,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          stylers: [
            { saturation: -100 }, // MODIFY Saturation and Lightness of Google base map if needed
            { lightness: 10 }     // Value of 40 makes thematic polygon shading stand out over base map; also adjust opacity in Google Fusion Table map
          ]
        }
      ]
    };
    map = new google.maps.Map($("#map_canvas")[0],myOptions);

    // maintains map centerpoint for responsive design
    google.maps.event.addDomListener(map, 'idle', function() {
        MapsLib.calculateCenter();
    });

    google.maps.event.addDomListener(window, 'resize', function() {
        map.setCenter(MapsLib.map_centroid);
    });

    MapsLib.searchrecords = null;

    //MODIFY to match 5-bucket GFT values of pre-checked polygon1  - insert again further below 
    MapsLib.setDemographicsLabels("very low", "low", "moderate", "high", "very high");

    // MODIFY if needed: defines background polygon1 and polygon2 layers
    MapsLib.polygon1 = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.polygon1TableID,
        select: "geometry"
      },
      styleId: 2,
      templateId: 2
    });

    MapsLib.polygon1.setMap(map);

    //reset filters
    $("#search_address").val(MapsLib.convertToPlainString($.address.parameter('address')));
    var loadRadius = MapsLib.convertToPlainString($.address.parameter('radius'));
    if (loadRadius != "") $("#search_radius").val(loadRadius);
    else $("#search_radius").val(MapsLib.searchRadius);
    $(":checkbox").prop("checked", "checked");   //if active, all checkboxes on by default
    $("#result_box").hide();

   //-----custom initializers -- default setting to display Polygon1 layer
    //-----end of custom initializers-------

    //run the default search if someone entered an address

    var address = $("#search_address").val();
    if (address != "")
      MapsLib.doSearch();
  },

  doSearch: function(location) {
    MapsLib.clearSearch();

    var address = $("#search_address").val();
    MapsLib.searchRadius = $("#search_radius").val();

    var whereClause = MapsLib.locationColumn + " not equal to ''";

//-----custom filters for point data layer
  
    //-- NUMERICAL OPTION - to display and filter a column of numerical data in your Google Fusion Table
    var type_column = "'TypeNum'";
    var searchType = type_column + " IN (-1,";
    if ( $("#cbType1").is(':checked')) searchType += "1,";
    if ( $("#cbType2").is(':checked')) searchType += "2,";
    if ( $("#cbType3").is(':checked')) searchType += "3,";
    if ( $("#cbType4").is(':checked')) searchType += "4,";
    whereClause += " AND " + searchType.slice(0, searchType.length - 1) + ")";
    //-------end of custom filters--------

    if (address != "") {

      geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          MapsLib.currentPinpoint = results[0].geometry.location;

          $.address.parameter('address', encodeURIComponent(address));
          $.address.parameter('radius', encodeURIComponent(MapsLib.searchRadius));
          map.setCenter(MapsLib.currentPinpoint);

          // set zoom level based on search radius
          if (MapsLib.searchRadius      >= 1610000) map.setZoom(4); // 1,000 miles
          else if (MapsLib.searchRadius >= 805000)  map.setZoom(5); // 500 miles
          else if (MapsLib.searchRadius >= 402500)  map.setZoom(6); // 250 miles
          else if (MapsLib.searchRadius >= 161000)  map.setZoom(7); // 100 miles
          else if (MapsLib.searchRadius >= 80500)   map.setZoom(8); // 50 miles
          else if (MapsLib.searchRadius >= 40250)   map.setZoom(9); // 25 miles
          else if (MapsLib.searchRadius >= 16100)   map.setZoom(11); // 10 miles
          else if (MapsLib.searchRadius >= 8050)    map.setZoom(12); // 5 miles
          else if (MapsLib.searchRadius >= 3220)    map.setZoom(13); // 2 miles
          else if (MapsLib.searchRadius >= 1610)    map.setZoom(14); // 1 mile
          else if (MapsLib.searchRadius >= 805)     map.setZoom(15); // 1/2 mile
          else if (MapsLib.searchRadius >= 400)     map.setZoom(16); // 1/4 mile
          else                                      map.setZoom(17);

          if (MapsLib.addrMarkerImage != '') {
            MapsLib.addrMarker = new google.maps.Marker({
              position: MapsLib.currentPinpoint,
              map: map,
              icon: MapsLib.addrMarkerImage,
              animation: google.maps.Animation.DROP,
              title:address
            });

            // populate the info window with the searched address and a link to directions
            MapsLib.addrInfoWindow = new google.maps.InfoWindow({
                content: "<div style='height: 60px'>" + address + "<br /><a href='https://maps.google.com/maps?f=d&hl=en&geocode=&daddr=" + address.replace(/ /g, '+') + "' target='_blank'>Get directions &raquo;</a></div>"
            });

            // set click listener
            google.maps.event.addListener(MapsLib.addrMarker, 'click', function() {
              MapsLib.addrInfoWindow.open(map,MapsLib.addrMarker);
            });

            // open by default
            MapsLib.addrInfoWindow.open(map,MapsLib.addrMarker);

          }

          whereClause += " AND ST_INTERSECTS(" + MapsLib.locationColumn + ", CIRCLE(LATLNG" + MapsLib.currentPinpoint.toString() + "," + MapsLib.searchRadius + "))";

          MapsLib.drawSearchRadiusCircle(MapsLib.currentPinpoint);
          MapsLib.submitSearch(whereClause, map, MapsLib.currentPinpoint);
        }
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      MapsLib.submitSearch(whereClause, map);
    }
  },

  submitSearch: function(whereClause, map, location) {
    //get using all filters
    //NOTE: styleId and templateId are recently added attributes to load custom marker styles and info windows
    //you can find your Ids inside the link generated by the 'Publish' option in Fusion Tables
    //for more details, see https://developers.google.com/fusiontables/docs/v1/using#WorkingStyles

    MapsLib.searchrecords = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.fusionTableId,
        select: MapsLib.locationColumn,
        where:  whereClause
      },
      styleId: 2,
      templateId: 2
    });
    MapsLib.searchrecords.setMap(map);
    MapsLib.getCount(whereClause);
  },

  // MODIFY if you change the number of Polygon layers; TRY designated PolygonOFF layer
  clearSearch: function() {
    if (MapsLib.searchrecords != null)
      MapsLib.searchrecords.setMap(null);
    if (MapsLib.addrMarker != null)
      MapsLib.addrMarker.setMap(null);
    if (MapsLib.searchRadiusCircle != null)
      MapsLib.searchRadiusCircle.setMap(null);
  },

// MODIFY to match labels in custom.css
  setDemographicsLabels: function(one, two, three, four, five) {
    $('#legend-one').fadeOut('fast', function(){
      $("#legend-one").html(one);
    }).fadeIn('fast');
    $('#legend-two').fadeOut('fast', function(){
      $("#legend-two").html(two);
    }).fadeIn('fast');
    $('#legend-three').fadeOut('fast', function(){
      $("#legend-three").html(three);
    }).fadeIn('fast');
    $('#legend-four').fadeOut('fast', function(){
      $("#legend-four").html(four);
    }).fadeIn('fast');
    $('#legend-five').fadeOut('fast', function(){
      $("#legend-five").html(five);
    }).fadeIn('fast');
  },

  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;

    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        MapsLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },

  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search_address').val(results[1].formatted_address);
          $('.hint').focus();
          MapsLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },

  drawSearchRadiusCircle: function(point) {
      var circleOptions = {
        strokeColor: "#4b58a6",
        strokeOpacity: 0.3,
        strokeWeight: 1,
        fillColor: "#4b58a6",
        fillOpacity: 0.05,
        map: map,
        center: point,
        clickable: false,
        zIndex: -1,
        radius: parseInt(MapsLib.searchRadius)
      };
      MapsLib.searchRadiusCircle = new google.maps.Circle(circleOptions);
  },

  query: function(query_opts, callback) {

    var queryStr = [];
    queryStr.push("SELECT " + query_opts.select);
    queryStr.push(" FROM " + MapsLib.fusionTableId);

    // where, group and order clauses are optional
    if (query_opts.where && query_opts.where != "") {
      queryStr.push(" WHERE " + query_opts.where);
    }

    if (query_opts.groupBy && query_opts.roupBy != "") {
      queryStr.push(" GROUP BY " + query_opts.groupBy);
    }

    if (query_opts.orderBy && query_opts.orderBy != "" ) {
      queryStr.push(" ORDER BY " + query_opts.orderBy);
    }

    if (query_opts.offset && query_opts.offset !== "") {
      queryStr.push(" OFFSET " + query_opts.offset);
    }

    if (query_opts.limit && query_opts.limit !== "") {
      queryStr.push(" LIMIT " + query_opts.limit);
    }



    var sql = encodeURIComponent(queryStr.join(" "));
    $.ajax({
      url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&key="+MapsLib.googleApiKey,
      dataType: "json"
    }).done(function (response) {
      if (callback) callback(response);
    });

  },

  handleError: function(json) {
    if (json["error"] != undefined) {
      var error = json["error"]["errors"]
      console.log("Error in Fusion Table call!");
      for (var row in error) {
        console.log(" Domain: " + error[row]["domain"]);
        console.log(" Reason: " + error[row]["reason"]);
        console.log(" Message: " + error[row]["message"]);
      }
    }
  },

  getCount: function(whereClause) {
    var selectColumns = "Count()";
    MapsLib.query({
      select: selectColumns,
      where: whereClause
    }, function(response) {
      MapsLib.displaySearchCount(response);
    });
  },

  displaySearchCount: function(json) {
    MapsLib.handleError(json);
    var numRows = 0;
    if (json["rows"] != null)
      numRows = json["rows"][0];

    var name = MapsLib.recordNamePlural;
    if (numRows == 1)
    name = MapsLib.recordName;
    $( "#result_box" ).fadeOut(function() {
        $( "#result_count" ).html(MapsLib.addCommas(numRows) + " " + name + " found");
      });
    $( "#result_box" ).fadeIn();
  },

  addCommas: function(nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  },

  // maintains map centerpoint for responsive design
  calculateCenter: function() {
    center = map.getCenter();
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
  	return decodeURIComponent(text);
  }

  //-----custom functions-------
  // NOTE: if you add custom functions, make sure to append each one with a comma, except for the last one.
  // This also applies to the convertToPlainString function above

  //-----end of custom functions-------
}
