//Use CommonJS style via browserify to load other modules
require("./lib/social");
require("./lib/ads");
require("component-leaflet-map");

var map = document.querySelector("leaflet-map");
var L = map.leaflet;

var dot = require("dot");
dot.templateSettings.varname = "data";
dot.templateSettings.selfcontained = true;
dot.templateSettings.evaluate = /<%([\s\S]+?)%>/g;
dot.templateSettings.interpolate = /<%=([\s\S]+?)%>/g;

var moment = require("moment");
window.moment = moment;
window.global = window;

var tweetTemplate = dot.template(require("../_tweet.html"));

var getTweets = function(c) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "./tweets.json?_=" + Date.now());
  xhr.onload = function() {
    c(JSON.parse(xhr.responseText));
  };
  xhr.send();
}

var refresh = function() {
  getTweets(function(data) {
    var tweets = data.filter(function(item) {
      return item.timestamp > config.time;
    });
    if (!tweets.length) return;
    //update for next sync
    config.time = tweets[0].timestamp;
    var list = "";
    var stream = document.querySelector(".stream");
    var last = stream.querySelector("li");
    tweets.forEach(function(tweet) {
      var html = tweetTemplate(tweet);
      if (tweet.latlng) {
        //place a marker
      }
      var li = document.createElement("li");
      li.innerHTML = html;
      stream.insertBefore(li, last);
    })
  });
  setTimeout(refresh, 15 * 1000)
};

refresh();