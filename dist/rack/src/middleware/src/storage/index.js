'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _db = require('./src/db');

Object.keys(_db).forEach(function (key) {
  if (key === "default") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _db[key];
    }
  });
});