'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _enums = require('./enums');

var _networkRequest = require('./requests/networkRequest');

var _networkRequest2 = _interopRequireDefault(_networkRequest);

var _client = require('./client');

var _client2 = _interopRequireDefault(_client);

var _popup = require('./utils/popup');

var _popup2 = _interopRequireDefault(_popup);

var _auth = require('./auth');

var _auth2 = _interopRequireDefault(_auth);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _assign = require('lodash/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _isString = require('lodash/lang/isString');

var _isString2 = _interopRequireDefault(_isString);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var authPathname = process.env.KINVEY_MIC_AUTH_PATHNAME || '/oauth/auth';
var tokenPathname = process.env.KINVEY_MIC_TOKEN_PATHNAME || '/oauth/token';

var MobileIdentityConnect = function () {
  function MobileIdentityConnect() {
    _classCallCheck(this, MobileIdentityConnect);

    var sharedClient = _client2.default.sharedInstance();
    this.client = new _client2.default({
      protocol: 'https:',
      host: 'auth.kinvey.com',
      appKey: sharedClient.appKey,
      appSecret: sharedClient.appSecret,
      masterSecret: sharedClient.masterSecret,
      encryptionKey: sharedClient.encryptionKey
    });
  }

  _createClass(MobileIdentityConnect, [{
    key: 'login',
    value: function login(redirectUri) {
      var _this = this;

      var authorizationGrant = arguments.length <= 1 || arguments[1] === undefined ? _enums.AuthorizationGrant.AuhthorizationCodeLoginPage : arguments[1];
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      options = (0, _assign2.default)({
        client: this.client
      }, options);
      var clientId = options.client.appKey;

      var promise = Promise.resolve().then(function () {
        if (authorizationGrant === _enums.AuthorizationGrant.AuhthorizationCodeLoginPage) {
          return _this.requestCodeWithPopup(clientId, redirectUri, options);
        } else if (authorizationGrant === _enums.AuthorizationGrant.AuhthorizationCodeAPI) {
          return _this.requestTempLoginUrl(clientId, redirectUri, options).then(function (url) {
            return _this.requestCodeWithUrl(url, clientId, redirectUri, options);
          });
        }

        throw new Error('The authorization grant ' + authorizationGrant + ' is unsupported. ' + 'Please use a supported authorization grant.');
      }).then(function (code) {
        return _this.requestToken(code, clientId, redirectUri, options);
      });

      return promise;
    }
  }, {
    key: 'requestTempLoginUrl',
    value: function requestTempLoginUrl(clientId, redirectUri) {
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      var pathname = '/';

      if (options.version) {
        var version = options.version;

        if (!(0, _isString2.default)(version)) {
          version = String(version);
        }

        pathname = _path2.default.join(pathname, version.indexOf('v') === 0 ? version : 'v' + version);
      }

      var request = new _networkRequest2.default({
        method: _enums.HttpMethod.POST,
        client: this.client,
        properties: options.properties,
        pathname: _path2.default.join(pathname, authPathname),
        data: {
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code'
        }
      });
      request.setHeader('Content-Type', 'application/x-www-form-urlencoded');

      return request.execute().then(function (response) {
        if (response.isSuccess()) {
          return response.data.temp_login_uri;
        }

        throw response.error;
      });
    }
  }, {
    key: 'requestCodeWithPopup',
    value: function requestCodeWithPopup(clientId, redirectUri) {
      var _this2 = this;

      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      var promise = Promise.resolve().then(function () {
        var pathname = '/';

        if (options.version) {
          var version = options.version;

          if (!(0, _isString2.default)(version)) {
            version = String(version);
          }

          pathname = _path2.default.join(pathname, version.indexOf('v') === 0 ? version : 'v' + version);
        }

        var popup = new _popup2.default(_url2.default.format({
          protocol: _this2.client.protocl,
          host: _this2.client.host,
          pathname: _path2.default.join(pathname, authPathname),
          query: {
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code'
          }
        }));
        return popup.open();
      }).then(function (popup) {
        return new Promise(function (resolve, reject) {
          function loadHandler(loadedUrl) {
            if (loadedUrl.indexOf(redirectUri) === 0) {
              popup.removeAllListeners();
              popup.close();
              resolve(_url2.default.parse(loadedUrl, true).query.code);
            }
          }

          function closeHandler() {
            popup.removeAllListeners();
            reject(new Error('Login has been cancelled.'));
          }

          popup.on('load', loadHandler);
          popup.on('close', closeHandler);
        });
      });

      return promise;
    }
  }, {
    key: 'requestToken',
    value: function requestToken(code, clientId, redirectUri) {
      var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

      var request = new _networkRequest2.default({
        method: _enums.HttpMethod.POST,
        client: this.client,
        properties: options.properties,
        auth: _auth2.default.app,
        pathname: tokenPathname,
        data: {
          grant_type: 'authorization_code',
          client_id: clientId,
          redirect_uri: redirectUri,
          code: code
        }
      });
      request.setHeader('Content-Type', 'application/x-www-form-urlencoded');

      return request.execute().then(function (response) {
        if (response.isSuccess()) {
          return response.data;
        }

        throw response.error;
      });
    }
  }]);

  return MobileIdentityConnect;
}();

exports.default = MobileIdentityConnect;