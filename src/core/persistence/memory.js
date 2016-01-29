"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Memory = function () {
  function Memory() {
    _classCallCheck(this, Memory);

    this.data = {};
  }

  _createClass(Memory, [{
    key: "loadDatabase",
    value: function loadDatabase(dbName, callback) {
      callback(this.data[dbName]);
    }
  }, {
    key: "saveDatabase",
    value: function saveDatabase(dbName, data, callback) {
      this.data[dbName] = data;
      callback(null);
    }
  }], [{
    key: "isSupported",
    value: function isSupported() {
      return true;
    }
  }]);

  return Memory;
}();

exports.default = Memory;