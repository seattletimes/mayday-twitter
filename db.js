var async = require("async");
var sqlite = require("sqlite3");

var db = new sqlite.Database("tweets.db");

var tableDef = {
  name: "TEXT",
  handle: "TEXT",
  timestamp: "INTEGER",
  id: "TEXT",
  tweet: "TEXT",
  latlng: "TEXT",
  media: "TEXT",
  tags: "TEXT",
  urls: "TEXT",
  mentions: "TEXT",
  avatar: "TEXT"
};

var init = function(callback) {
  db.get('SELECT * FROM sqlite_master WHERE type = "table" AND name = "tweets";', function(err, exists) {
    if (!exists) {
      var columns = [];
      for (var column in tableDef) {
        columns.push(column + " " + tableDef[column]);
      }
      var tweetTable = "CREATE TABLE tweets (" + columns.join(",") + ");";
      async.parallel([
        db.run.bind(db, tweetTable),
        db.run.bind(db, "CREATE TABLE users (name TEXT, id TEXT);")
      ], function(err) {
        if (err) console.log(err);
        callback();
      })
    } else callback();
  });
};

var insertTweet = function(tweet, callback) {
  var keys = Object.keys(tableDef);
  var serialized = "media tags urls mentions latlng".split(" ");
  var query = "INSERT INTO tweets (" + keys.join(",") + ") VALUES (" + keys.map(function() { return "?" }).join(",") + ")";
  var values = [];
  keys.forEach(function(key) {
    var value = tweet[key];
    values.push(serialized.indexOf(key) > -1 ? JSON.stringify(value || []) : value || "");
  });
  db.run(query, values, function(err) {
    if (err) return console.error(err);
    callback();
  });
};

var deleteTweet = function(id, callback) {
  db.run("DELETE FROM tweets WHERE id = ?", [id], function(err) {
    if (err) console.error(err);
    callback();
  });
};

var getTweets = function(callback) {
  db.all("SELECT * FROM tweets ORDER BY timestamp DESC;", function(err, result) {
    //if we got more results, requery first
    result = result || [];
    result.forEach(function(tweet) {
      ["tags", "media", "urls", "mentions", "latlng"].forEach(function(prop) {
        tweet[prop] = JSON.parse(tweet[prop]);
      });
    });
    callback(result);
  });
}

module.exports = {
  init: init,
  all: db.all.bind(db),
  get: db.get.bind(db),
  insertUser: function(name, id, callback) {
    db.run("INSERT INTO users (name, id) VALUES (?, ?);", [name, id], function(err) {
      callback(err, id);
    });
  },
  getTweets: getTweets,
  insertTweet: insertTweet,
  deleteTweet: deleteTweet
};