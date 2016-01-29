'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _errors = require('./errors');

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _clone = require('lodash/lang/clone');

var _clone2 = _interopRequireDefault(_clone);

var _assign = require('lodash/object/assign');

var _assign2 = _interopRequireDefault(_assign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var sharedInstanceSymbol = Symbol();

var Client = function () {
  function Client() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Client);

    options = (0, _assign2.default)({
      protocol: process.env.KINVEY_API_PROTOCOL || 'https',
      host: process.env.KINVEY_API_HOST || 'baas.kinvey.com'
    }, options);

    if (!options.appId && !options.appKey) {
      throw new _errors.KinveyError('No App Id was provided. ' + 'Unable to create a new Client without an App Id.');
    }

    if (!options.appSecret && !options.masterSecret) {
      throw new _errors.KinveyError('No App Secret or Master Secret was provided. ' + 'Unable to create a new Client without an App Key.');
    }

    this.protocol = options.protocol;

    this.host = options.host;

    this.appKey = options.appKey || options.appId;

    this.appSecret = options.appSecret;

    this.masterSecret = options.masterSecret;

    this.encryptionKey = options.encryptionKey;
  }

  _createClass(Client, [{
    key: 'toJSON',
    value: function toJSON() {
      var json = {
        protocol: this.protocol,
        host: this.host,
        appKey: this.appKey,
        appSecret: this.appSecret,
        masterSecret: this.masterSecret,
        encryptionKey: this.encryptionKey
      };

      return (0, _clone2.default)(json);
    }
  }, {
    key: 'url',
    get: function get() {
      return _url2.default.format({
        protocol: this.protocol,
        host: this.host
      });
    }
  }], [{
    key: 'init',
    value: function init(options) {
      var client = new Client(options);
      Client[sharedInstanceSymbol] = client;
      return client;
    }
  }, {
    key: 'sharedInstance',
    value: function sharedInstance() {
      var client = Client[sharedInstanceSymbol];

      if (!client) {
        throw new _errors.KinveyError('You have not initialized the library. ' + 'Please call Kinvey.init() to initialize the library.');
      }

      return client;
    }
  }]);

  return Client;
}();

exports.default = Client;