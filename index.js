var async = require("async");
var fs = require("fs");
var shell = require("shelljs");
var sqlite = require("sqlite3");
var Twitter = require("twitter");

var auth = require("./auth.json");
var distill = require("./distill");

var client = new Twitter({
  consumer_key: auth.twitter.consumerKey,
  consumer_secret: auth.twitter.consumerSecret,
  access_token_key: auth.twitter.accessKey,
  access_token_secret: auth.twitter.accessSecret
});

var db = new sqlite.Database("tweets.db");

var follow = [
  "audcarls",
  "seattletimes",
  "katrinabarlow",
  "thomaswilburn",
  "evanbush",
  "mikelindblom",
  "seatimesphoto",
  "king5seattle",
  "tewilburn",
  "wsdot_traffic",
  "komonews",
  "wsdot",
  "kiro7seattle",
  "nytimes",
  "nytvideo",
  "washingtonpost",
  "arstechnica",
  "wirescenes",
  "uwathletics",
  "seattlepd"
];

var dumpDB = function() {
  console.log("Dumping database to file system");
  pending = false;
  db.all("SELECT * FROM tweets", function(err, result) {
    //if we got more results, requery first
    if (pending) {
      console.log("got more results, re-exporting");
      return dumpDB();
    }
    result = result || [];
    result.forEach(function(tweet) {
      ["tags", "media", "urls"].forEach(function(prop) {
        tweet[prop] = JSON.parse(tweet[prop]);
      });
    });
    json = JSON.stringify(result, null, 2);
    if (!shell.test("-e", "data")) shell.mkdir("data");
    fs.writeFileSync("data/tweets.json", json);
    inProgress = false;
    console.log("Completed file dump, building");
    // shell.exec("grunt static", function() {
    //   console.log("Completed build");
    // });
  });
};


var inProgress = false;
var pending = false;
var scheduleDump = function() {
  if (inProgress) {
    return pending = true;
  }
  inProgress = setTimeout(dumpDB, 1000);
}
dumpDB();

async.waterfall([
  function(callback) {
    //init database
    db.get('SELECT * FROM sqlite_master WHERE type = "table" AND name = "tweets";', function(err, exists) {
      if (!exists) {
        async.parallel([
          db.run.bind(db, "CREATE TABLE tweets (name TEXT, handle TEXT, timestamp INTEGER, tweet TEXT, latlng TEXT, media TEXT, tags TEXT, urls TEXT);"),
          db.run.bind(db, "CREATE TABLE users (name TEXT, id TEXT);")
        ], function(err) {
          if (err) console.log(err);
          callback();
        })
      } else callback();
    });
  },
  function(callback) {
    var query = "SELECT * FROM users WHERE name IN (" + follow.map(JSON.stringify).join(",") + ");";
    db.all(query, function(err, result) {
      var identified = {};
      result.forEach(function(row) {
        identified[row.name] = row.id;
      });
      var unidentified = follow.filter(function(name) { return !(name in identified) });
      var ids = result.map(function(d) { return d.id });
      if (!unidentified.length) {
        return callback(null, ids);
      }
      //lookup remaining
      client.get("users/lookup", {
        screen_name: unidentified.join(",")
      }, function(err, response) {
        async.map(response, function(item, c) {
          db.run("INSERT INTO users (name, id) VALUES (?, ?);", [item.screen_name, item.id_str], function(err) {
            c(err, item.id_str);
          });
        }, function(err, mapped) {
          if (err) return console.log(err);
          callback(null, mapped.concat(ids));
        });
      });
    });
  },
  function(ids) {
    client.stream("statuses/filter", {
      // locations: "-122.43,47.48,-122.22,47.73"
      // track: "Seattle"
      follow: ids.join(",")
    }, function(stream) {

      stream.on("data", function(tweet) {
        var t = distill(tweet);
        if (t.tweet[0] == "@") return; //skip direct replies
        if (!t || follow.indexOf(t.handle) == -1) return; //skip retweets
        if (t.tweet.indexOf("RT") == 0) return; //skip retweets
        console.log(t);
        var query = "INSERT INTO tweets (name, handle, timestamp, tweet, latlng, media, tags, urls) VALUES (?,?,?,?,?,?,?,?);";
        var values = [
          t.name,
          t.handle,
          t.timestamp,
          t.tweet,
          t.latlng || "",
          JSON.stringify(t.images || []),
          JSON.stringify(t.tags || []),
          JSON.stringify(t.urls || [])
        ];
        db.run(query, values, function(err) {
          if (err) return console.log(err);
          scheduleDump();
        });
      });

      stream.on("error", console.log.bind(console));
      
      stream.on("end", function(ended) {
        console.log(ended.statusMessage);
      });
    });
  }
], console.log.bind(console));

