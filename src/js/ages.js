var moment = require("moment");

module.exports = function(timestamp) {
  var now = new moment();//"2017-05-01 23:59pm -8:00", "YYYY-MM-DD HH:mma z");
  now = now.valueOf();
  var age = "recent";
  var minutes = 1000 * 60;
  var hours = 60 * minutes;
  var elapsed = now - timestamp;
  if (elapsed > 16 * hours) {
    age = "ancient";
  } else if (elapsed > 10 * hours) {
    age = "oldest";
  } else if (elapsed > 6 * hours) {
    age = "older";
  } else if (elapsed > 4 * hours) {
    age = "old";
  } else if (elapsed > 2 * hours) {
    age = "young";
  }
  return age;
}