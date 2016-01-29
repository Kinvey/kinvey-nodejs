'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _clone = require('lodash/lang/clone');

var _clone2 = _interopRequireDefault(_clone);

var _isPlainObject = require('lodash/lang/isPlainObject');

var _isPlainObject2 = _interopRequireDefault(_isPlainObject);

var _errors = require('../errors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var privatePropertiesSymbol = Symbol();
var appVersionKey = 'appVersion';

var PrivateProperties = function () {
  function PrivateProperties() {
    var properties = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, PrivateProperties);

    this.properties = properties;
  }

  _createClass(PrivateProperties, [{
    key: 'addProperties',
    value: function addProperties(properties) {
      var _this = this;

      Object.keys(properties).forEach(function (key) {
        var value = properties[key];

        if (value) {
          _this.properties[key] = value;
        } else {
          delete _this.properties[key];
        }
      });
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.properties = {};
    }
  }, {
    key: 'clearProperty',
    value: function clearProperty(key) {
      var properties = this.properties;

      if (key && properties.hasOwnProperty(key)) {
        delete properties[key];
      }
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return (0, _clone2.default)(this.properties);
    }
  }, {
    key: 'properties',
    get: function get() {
      return this._properties;
    },
    set: function set(properties) {
      this._properties = (0, _clone2.default)(properties);
    }
  }]);

  return PrivateProperties;
}();

var Properties = function () {
  function Properties(properties) {
    _classCallCheck(this, Properties);

    this[privatePropertiesSymbol] = new PrivateProperties(properties);
  }

  _createClass(Properties, [{
    key: 'getProperty',
    value: function getProperty(key) {
      var properties = this.toJSON();

      if (key && properties.hasOwnProperty(key)) {
        return properties[key];
      }

      return undefined;
    }
  }, {
    key: 'setProperty',
    value: function setProperty(key, value) {
      var properties = {};
      properties[key] = value;
      this.addProperties(properties);
      return this;
    }
  }, {
    key: 'addProperties',
    value: function addProperties() {
      var properties = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (!(0, _isPlainObject2.default)(properties)) {
        throw new _errors.KinveyError('properties argument must be an object');
      }

      var privateProperties = this[privatePropertiesSymbol];
      privateProperties.addProperties(properties);
      return this;
    }
  }, {
    key: 'clear',
    value: function clear() {
      var privateProperties = this[privatePropertiesSymbol];
      privateProperties.clear();
      return this;
    }
  }, {
    key: 'clearProperty',
    value: function clearProperty(key) {
      var privateProperties = this[privatePropertiesSymbol];
      privateProperties.clearProperty(key);
      return this;
    }
  }, {
    key: 'clearAppVersion',
    value: function clearAppVersion() {
      return this.clearProperty(appVersionKey);
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      var privateProperties = this[privatePropertiesSymbol];
      return privateProperties.toJSON();
    }
  }, {
    key: 'properties',
    set: function set(properties) {
      this.clear().addProperties(properties);
    }
  }, {
    key: 'appVersion',
    get: function get() {
      return this.getProperty(appVersionKey);
    },
    set: function set(version) {
      version = Array.prototype.slice.call(arguments, 1);
      var major = version[0];
      var minor = version[1];
      var patch = version[2];
      var appVersion = '';

      if (major) {
        appVersion = (major + '').trim();
      }

      if (minor) {
        appVersion = ('.' + minor).trim();
      }

      if (patch) {
        appVersion = ('.' + patch).trim();
      }

      this.setProperty(appVersionKey, appVersion);
      return this;
    }
  }]);

  return Properties;
}();

exports.default = Properties;