module.exports = function(timestamp) {
  var now = new Date(2015, 4, 1, 23, 59).getTime(); //midnight on May 1
  var age = "recent";
  var minutes = 1000 * 60;
  var hours = 60 * minutes;
  var elapsed = now - timestamp;
  if (elapsed > 16 * hours) {
    age = "ancient";
  } else if (elapsed > 6 * hours) {
    age = "oldest";
  } else if (elapsed > 4 * hours) {
    age = "older";
  } else if (elapsed > 3 * hours) {
    age = "old";
  } else if (elapsed > 2 * hours) {
    age = "young";
  }
  return age;
}