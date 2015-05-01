module.exports = function(timestamp, now) {
  now = now || Date.now();
  var age = "recent";
  var minutes = 1000 * 60;
  var hours = 60 * minutes;
  var elapsed = now - timestamp;
  if (elapsed > 8 * hours) {
    age = "ancient";
  } else if (elapsed > 2 * hours) {
    age = "oldest";
  } else if (elapsed > 1 * hours) {
    age = "older";
  } else if (elapsed > 30 * minutes) {
    age = "old";
  } else if (elapsed > 15 * minutes) {
    age = "young";
  }
  return age;
}