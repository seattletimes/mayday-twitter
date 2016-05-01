module.exports = function(timestamp) {
  var now = new Date().getTime(); //midnight on May 1
  var age = "recent";
  var minutes = 1000 * 60;
  var hours = 60 * minutes;
  var elapsed = now - timestamp;
  if (elapsed > 8 * hours) {
    age = "ancient";
  } else if (elapsed > 4 * hours) {
    age = "oldest";
  } else if (elapsed > 2 * hours) {
    age = "older";
  } else if (elapsed > 1 * hours) {
    age = "old";
  } else if (elapsed > .5 * hours) {
    age = "young";
  }
  return age;
}