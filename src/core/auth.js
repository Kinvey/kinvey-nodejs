'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _user = require('./utils/user');

var _user2 = _interopRequireDefault(_user);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Auth = {
  all: function all(client) {
    return Auth.session(client).catch(function () {
      return Auth.basic(client);
    });
  },
  app: function app(client) {
    if (!client.appKey || !client.appSecret) {
      var error = new Error('Missing client credentials');
      return Promise.reject(error);
    }

    var promise = Promise.resolve({
      scheme: 'Basic',
      username: client.appKey,
      password: client.appSecret
    });

    return promise;
  },
  basic: function basic(client) {
    return Auth.master(client).catch(function () {
      return Auth.app(client);
    });
  },
  default: function _default(client) {
    return Auth.session().catch(function (err) {
      return Auth.master(client).catch(function () {
        return Promise.reject(err);
      });
    });
  },
  master: function master(client) {
    if (!client.appKey || !client.masterSecret) {
      var error = new Error('Missing client credentials');
      return Promise.reject(error);
    }

    var promise = Promise.resolve({
      scheme: 'Basic',
      username: client.appKey,
      password: client.masterSecret
    });

    return promise;
  },
  none: function none() {
    return Promise.resolve(null);
  },
  session: function session() {
    return _user2.default.getActive().then(function (user) {
      if (!user) {
        throw new Error('There is not an active user.');
      }

      return {
        scheme: 'Kinvey',
        credentials: user._kmd.authtoken
      };
    });
  }
};
exports.default = Auth;