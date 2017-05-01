//Use CommonJS style via browserify to load other modules
require("component-leaflet-map");
require("component-responsive-frame/child");

var closest = require("./lib/closest");
var xhr = require("./lib/xhr");

var mapElement = document.querySelector("leaflet-map");
var L = mapElement.leaflet;
var map = mapElement.map;

var dot = require("./lib/dot");
var tweetTemplate = dot.template(require("./_tweet.html"));
//helpers for the template
var moment = window.moment = require("moment");
var ages = require("./ages");
var stream = document.querySelector("ul.stream");
var main = document.querySelector(".interactive");

var markers = [];
var markerGroup = L.featureGroup();
var panelHTML = [];
var markerMapping = {};
var latest = null;

var makeMarker = function(data) {
  var marker = L.marker(data.latlng, {
    icon: L.divIcon({
      className: `tweet-marker ${ages(data.timestamp)} ${data.tags.join(" ").toLowerCase()}`,
      iconSize: null
    })
  });
  markerMapping[data.id] = marker;
  return marker;
};

//add the initial markers from the map data
window.mayday.sort((a, b) => a.timestamp - b.timestamp).forEach(function(t) {
  var html = tweetTemplate(t);
  if (t.latlng.length) {
    var ageClass = ages(t.timestamp);
    var marker = makeMarker(t);
    marker.bindPopup(html);
    markers.push(marker);
    marker.addTo(markerGroup);
  }
  panelHTML.push(`<li class="item">${html}</li>`);
  latest = t.timestamp;
});

stream.innerHTML = panelHTML.reverse().join("");

if (markers.length) {
  map.fitBounds(markerGroup.getBounds());
}

document.querySelector(".tabs").addEventListener("click", function(e) {
  var target = e.target;
  var tab = target.getAttribute("data-tab");
  if (!tab) return;
  main.classList.remove("stream", "map");
  main.classList.add(tab);
  document.querySelector(".tab.selected").classList.remove("selected");
  target.classList.add("selected");
  map.invalidateSize();
});

stream.addEventListener("click", function(e) {
  var link = closest(e.target, "[data-marker]");
  if (!link) return;
  var id = link.getAttribute("data-marker");
  var marker = markerMapping[id];
  if (!marker) return;
  main.classList.remove("stream");
  main.classList.add("map");
  map.invalidateSize();
  document.querySelector(".tab.selected").classList.remove("selected");
  document.querySelector(`.tab[data-tab="map"]`).classList.add("selected");
  map.setView(marker.getLatLng(), 17);
  marker.openPopup();
});

var refresh = function() {
  //re-process all the timestamps
  var times = document.querySelectorAll(".stream .timestamp");
  for (var i = 0; i < times.length; i++) {
    var time = times[i];
    time.innerHTML = moment(time.getAttribute("data-time") * 1).fromNow();
  }
  xhr("./tweets.json?_=" + Date.now(), function(err, data) {
    if (err) console.log(err);
    var tweets = data.filter(item => item.timestamp > latest);
    // tweets = data;
    console.log(`Updating with ${tweets.length} tweets`);
    if (!tweets.length) return;
    //update for next sync
    latest = tweets[0].timestamp;
    var list = "";
    var last = stream.querySelector("li");
    tweets.forEach(function(tweet) {
      var html = tweetTemplate(tweet);
      var li = document.createElement("li");
      if (tweet.latlng.length) {
        var marker = makeMarker(tweet);
        marker.bindPopup(html);
        marker.addTo(markerGroup);
        map.fitBounds(markerGroup.getBounds());
      }
      li.innerHTML = `${html}`;
      stream.insertBefore(li, last);
    })
  });
  setTimeout(refresh, 15 * 1000)
};

setTimeout(refresh, 15 * 1000);
