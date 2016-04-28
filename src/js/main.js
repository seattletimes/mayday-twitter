//Use CommonJS style via browserify to load other modules
require("./lib/social");
require("./lib/ads");
require("component-leaflet-map");
require("component-responsive-frame/child");

var mapElement = document.querySelector("leaflet-map");
var L = mapElement.leaflet;
var map = mapElement.map;

var dot = require("./lib/dot");
var tweetTemplate = dot.template(require("./_tweet.html"));
//helpers for the template
window.moment = require("moment");
var ages = require("./ages");

var markers = [];

//add the initial markers from the map data
window.mayday.sort((a, b) => a.timestamp - b.timestamp).forEach(function(t) {
  if (t.latlng.length) {
    var ageClass = ages(t.timestamp);
    var marker = L.marker(t.latlng, {
      icon: L.divIcon({
        className: "leaflet-div-icon tweet-marker " + ageClass
      })
    });
    marker.bindPopup(tweetTemplate(t));
    marker.addTo(map);
    markers.push(marker);
  }
});

var markerGroup = L.featureGroup(markers);
map.fitBounds(markerGroup.getBounds())

document.querySelector(".tabs").addEventListener("click", function(e) {
  var target = e.target;
  var tab = target.getAttribute("data-tab");
  if (!tab) return;
  var main = document.querySelector(".interactive");
  main.classList.remove("stream", "map");
  main.classList.add(tab);
  document.querySelector(".tab.selected").classList.remove("selected");
  target.classList.add("selected");
  map.invalidateSize();
});


var getTweets = function(c) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "./tweets.json?_=" + Date.now());
  xhr.onload = function() {
    c(JSON.parse(xhr.responseText));
  };
  xhr.send();
}

var refresh = function() {
  //process all the timestamps
  var times = document.querySelectorAll(".stream .timestamp");
  for (var i = 0; i < times.length; i++) {
    var time = times[i];
    time.innerHTML = global.helpers.moment(time.getAttribute("data-time") * 1).fromNow();
  }
  getTweets(function(data) {
    var tweets = data.filter(function(item) {
      return item.timestamp > config.time;
    });
    // tweets = data;
    if (!tweets.length) return;
    //update for next sync
    config.time = tweets[0].timestamp;
    var list = "";
    var stream = document.querySelector("ul.stream");
    var last = stream.querySelector("li");
    tweets.forEach(function(tweet) {
      var html = tweetTemplate(tweet);
      if (tweet.latlng.length) {
        var marker = L.marker(tweet.latlng, {
          icon: L.divIcon({
            className: "tweet-marker " + global.helpers.ages(tweet.timestamp) + " " + tweet.tags.join(" ").toLowerCase(),
            iconSize: null
          })
        });
        marker.bindPopup(html);
        marker.addTo(map);
      }
      var li = document.createElement("li");
      li.innerHTML = html;
      stream.insertBefore(li, last);
    })
  });
  setTimeout(refresh, 15 * 1000)
};

setTimeout(refresh, 15 * 1000);
