var moment = require("moment");

var locationBlacklist = [
  "47.603604,-122.337055"
];

var distill = function(tweet) {
  if (!tweet.user) return null;
  var timestamp = moment(tweet.created_at, "ddd MMM DD HH:mm:ss ZZ YYYY").toDate();
  var parsed = {
    name: tweet.user.name,
    handle: tweet.user.screen_name,
    timestamp: timestamp.getTime(),
    date: timestamp,
    tweet: tweet.extended_tweet ? tweet.extended_tweet.full_text : tweet.full_text ? tweet.full_text : tweet.text,
    id: tweet.id_str,
    avatar: tweet.user.profile_image_url,
    latlng: null
  }
  var entities = tweet.entities;
  var extended = tweet.extended_entities || {};
  if (entities.hashtags) {
    parsed.tags = entities.hashtags.map(function(t) { return t.text });
  }
  if (entities.urls) {
    parsed.urls = entities.urls.map(function(entity) { return { short: entity.url, long: entity.expanded_url }});
  }
  if (extended.media || entities.media) {
    parsed.media = (extended.media || entities.media).map(function(e) {
      parsed.tweet = parsed.tweet.replace(e.url, "");
      return {
        text: e.url,
        url: e.media_url,
        video: e.video_info ? 
          e.video_info.variants
            .filter(v => v.content_type == "video/mp4")
            .sort((a, b) => b.bitrate - a.bitrate)
            .shift().url
          : false
      }
    });
  }
  if (entities.mentions) {
    parsed.mentions = entities.mentions.map(function(e) {
      return e.screen_name
    });
  }
  if (tweet.coordinates && tweet.coordinates.type == "Point") {
    parsed.latlng = tweet.coordinates.coordinates.reverse();
    if (locationBlacklist.indexOf(parsed.latlng.join(",")) > -1) {
      parsed.latlng = null;
    }
  }
  return parsed;
};

module.exports = distill;