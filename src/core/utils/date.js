'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromISO8601 = fromISO8601;
function fromISO8601(dateString) {
  var date = Date.parse(dateString);

  if (date) {
    return new Date(date);
  }

  var regex = /^(\d{4}\-\d\d\-\d\d([tT][\d:\.]*)?)([zZ]|([+\-])(\d\d):?(\d\d))?$/;
  var match = dateString.match(regex);
  if (match[1]) {
    var day = match[1].split(/\D/).map(function (segment) {
      return root.parseInt(segment, 10) || 0;
    });
    day[1] -= 1;
    day = new Date(Date.UTC.apply(Date, day));

    if (match[5]) {
      var timezone = root.parseInt(match[5], 10) / 100 * 60;
      timezone += match[6] ? root.parseInt(match[6], 10) : 0;
      timezone *= match[4] === '+' ? -1 : 1;
      if (timezone) {
        day.setUTCMinutes(day.getUTCMinutes() * timezone);
      }
    }

    return day;
  }
  return NaN;
}