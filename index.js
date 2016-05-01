var async = require("async");
var fs = require("fs");
var shell = require("shelljs");
var Twitter = require("twitter");

var auth = require("./auth.json");
var distill = require("./distill");
var db = require("./db");

var client = new Twitter({
  consumer_key: auth.twitter.consumerKey,
  consumer_secret: auth.twitter.consumerSecret,
  access_token_key: auth.twitter.accessKey,
  access_token_secret: auth.twitter.accessSecret
});

var publish = "grunt template publish:live";

var follow = ["stevemiletich",
  "SeaTimesFotoKen",
  "stimesmcarter",
  "katherinelong",
  "evanbush",
  "deleon_times",
  "sjgtimes",
  "lthompsontimes",
  "lewiskamb",
  "sringman",
  "bettinahansen",
  "lindseywasson",
  "corinnechin"
];

var dumpDB = function() {
  console.log("Dumping database to file system");
  pending = false;
  db.getTweets(function(result) {
    if (pending) {
      console.log("got more results, re-exporting");
      return dumpDB();
    }
    json = JSON.stringify(result, null, 2);
    if (!shell.test("-e", "data")) shell.mkdir("data");
    fs.writeFileSync("data/tweets.json", json);
    console.log("Completed file dump, building");
    shell.exec(publish, function() {
      inProgress = false;
      console.log("Completed build");
      //check again for anything that came in during publish
      if (pending) dumpDB();
    });
  })
};

var today = new Date();

var rejectTweet = function(t) {
  if (t.tweet[0] == "@") return true; //skip direct replies
  if (!t || follow.indexOf(t.handle) == -1) return true; //skip retweets
  if (t.tweet.indexOf("RT") == 0) return true; //skip retweets
  if (t.date.getMonth() < today.getMonth() || t.date.getFullYear() < today.getFullYear()) return true; //skip very old tweets
}

var inProgress = false;
var pending = false;
var scheduleDump = function() {
  if (inProgress) {
    return pending = true;
  }
  inProgress = setTimeout(dumpDB, 1000);
}

async.waterfall([
  db.init,
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
          db.insertUser(item.screen_name, item.id_str, c);
        }, function(err, mapped) {
          if (err) return console.error(err);
          callback(null, mapped.concat(ids));
        });
      });
    });
  },
  function(ids, callback) {
    //backfill tweets
    async.each(ids, function(id, c) {
      client.get("statuses/user_timeline", {
        user_id: id,
        count: 20
      }, function(err, data) {
        if (err) return c(err);
        async.each(data, function(tweet, done) {
          var t = distill(tweet);
          if (rejectTweet(t)) return done();
          db.get("SELECT * FROM tweets WHERE id = ?", [t.id], function(err, exists) {
            if (exists) return done();
            db.insertTweet(t, done);
          });
        }, c)
      })
    }, function(err) {
      //pass IDs through
      callback(null, ids);
    })
  },
  function(ids) {
    //dump only after backfilling
    dumpDB();

    client.stream("statuses/filter", {
      // locations: "-122.43,47.48,-122.22,47.73"
      // track: "Seattle"
      follow: ids.join(",")
    }, function(stream) {

      stream.on("data", function(tweet) {
        if (tweet.delete) {
          return db.deleteTweet(tweet.delete.status.id_str, scheduleDump);
        }
        var t = distill(tweet);
        if (rejectTweet(t)) return;
        console.log(t);
        db.insertTweet(t, scheduleDump);
      });

      stream.on("error", console.error.bind(console));
      
      stream.on("end", function(ended) {
        console.error(ended.statusMessage);
      });
    });
  }
], console.log.bind(console));

