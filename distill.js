// var moment = require("moment");
var locationBlacklist = [
  "47.603604,-122.337055"
];

var distill = function(tweet) {
  if (!tweet.user) return null;
  // console.log(tweet);
  var parsed = {
    name: tweet.user.name,
    handle: tweet.user.screen_name,
    timestamp: Date.now(),
    tweet: tweet.text
  }
  var entities = tweet.entities;
  if (entities.hashtags) {
    parsed.tags = entities.hashtags.map(function(t) { return t.text });
  }
  if (entities.urls) {
    parsed.urls = entities.urls.map(function(entity) { return { short: entity.url, long: entity.expanded_url }});
  }
  if (entities.media) {
    parsed.images = entities.media.map(function(e) {
      parsed.tweet = parsed.tweet.replace(e.url, "");
      return {
        text: e.url,
        url: e.media_url
      }
    });
  }
  if (tweet.coordinates && tweet.coordinates.type == "Point") {
    parsed.latlng = tweet.coordinates.coordinates.reverse().join(",");
    if (locationBlacklist.indexOf(parsed.latlng) > -1) {
      parsed.latlng = null;
    }
  }
  return parsed;
};

module.exports = distill;