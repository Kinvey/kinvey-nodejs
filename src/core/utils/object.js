'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.nested = nested;
exports.isDefined = isDefined;
function nested(document, dotProperty, value) {
  if (!dotProperty) {
    document = typeof value === 'undefined' ? document : value;
    return document;
  }

  var obj = document;
  var parts = dotProperty.split('.');

  var current = parts.shift();
  while (current && obj && obj.hasOwnProperty(current)) {
    if (parts.length === 0) {
      obj[current] = typeof value === 'undefined' ? obj[current] : value;
      return obj[current];
    }

    obj = obj[current];
    current = parts.shift();
  }

  return null;
}

function isDefined(obj) {
  return obj !== undefined && obj !== null;
}