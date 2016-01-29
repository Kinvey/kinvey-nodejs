'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var localStorage = undefined;

if (typeof window !== 'undefined') {
  localStorage = window.localStorage;
}

var LocalStorage = function () {
  function LocalStorage() {
    _classCallCheck(this, LocalStorage);
  }

  _createClass(LocalStorage, [{
    key: 'loadDatabase',
    value: function loadDatabase(dbName, callback) {
      callback(localStorage.getItem(dbName));
    }
  }, {
    key: 'saveDatabase',
    value: function saveDatabase(dbName, data, callback) {
      localStorage.setItem(dbName, data);
      callback(null);
    }
  }], [{
    key: 'isSupported',
    value: function isSupported() {
      var item = 'kinvey';
      try {
        localStorage.setItem(item, item);
        localStorage.removeItem(item);
        return true;
      } catch (e) {
        return false;
      }
    }
  }]);

  return LocalStorage;
}();

exports.default = LocalStorage;