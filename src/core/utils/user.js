'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _LocalRequest = require('../requests/LocalRequest');

var _LocalRequest2 = _interopRequireDefault(_LocalRequest);

var _client = require('../client');

var _client2 = _interopRequireDefault(_client);

var _enums = require('../enums');

var _errors = require('../errors');

var _result = require('lodash/object/result');

var _result2 = _interopRequireDefault(_result);

var _assign = require('lodash/object/assign');

var _assign2 = _interopRequireDefault(_assign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var activeUserSymbol = Symbol();
var localNamespace = process.env.KINVEY_LOCAL_NAMESPACE || 'local';
var activeUserCollection = process.env.KINVEY_ACTIVE_USER_COLLECTION || 'activeUser';

var UserUtils = function () {
  function UserUtils() {
    _classCallCheck(this, UserUtils);
  }

  _createClass(UserUtils, null, [{
    key: 'getActive',
    value: function getActive() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options = (0, _assign2.default)({
        client: _client2.default.sharedInstance()
      }, options);

      var user = UserUtils[activeUserSymbol][options.client.appId];

      if (user) {
        return Promise.resolve(user);
      }

      var request = new _LocalRequest2.default({
        method: _enums.HttpMethod.GET,
        pathname: '/' + localNamespace + '/' + options.client.appId + '/' + activeUserCollection,
        client: options.client
      });
      var promise = request.execute().then(function (response) {
        var data = response.data;

        if (data.length === 0) {
          return null;
        }

        user = data[0];
        UserUtils[activeUserSymbol][options.client.appId] = user;
        return user;
      }).catch(function (err) {
        if (err instanceof _errors.NotFoundError) {
          return null;
        }

        throw err;
      });

      return promise;
    }
  }, {
    key: 'setActive',
    value: function setActive(user) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      options = (0, _assign2.default)({
        client: _client2.default.sharedInstance()
      }, options);

      var promise = UserUtils.getActive(options).then(function (activeUser) {
        if (activeUser) {
          var request = new _LocalRequest2.default({
            method: _enums.HttpMethod.DELETE,
            pathname: '/' + localNamespace + '/' + options.client.appId + '/' + activeUserCollection + '/' + activeUser._id,
            client: options.client
          });
          return request.execute().then(function () {
            UserUtils[activeUserSymbol][options.client.appId] = null;
          });
        }
      }).then(function () {
        if (user) {
          var request = new _LocalRequest2.default({
            method: _enums.HttpMethod.POST,
            pathname: '/' + localNamespace + '/' + options.client.appId + '/' + activeUserCollection,
            client: options.client,
            data: (0, _result2.default)(user, 'toJSON', user)
          });
          return request.execute();
        }
      }).then(function (response) {
        if (response && response.isSuccess()) {
          user = response.data;
          UserUtils[activeUserSymbol][options.client.appId] = user;
          return user;
        }
      });

      return promise;
    }
  }]);

  return UserUtils;
}();

exports.default = UserUtils;

UserUtils[activeUserSymbol] = {};