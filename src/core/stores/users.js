'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _auth = require('../auth');

var _auth2 = _interopRequireDefault(_auth);

var _enums = require('../enums');

var _errors = require('../errors');

var _networkRequest = require('../requests/networkRequest');

var _networkRequest2 = _interopRequireDefault(_networkRequest);

var _datastore = require('./datastore');

var _datastore2 = _interopRequireDefault(_datastore);

var _query = require('../query');

var _query2 = _interopRequireDefault(_query);

var _user = require('../models/user');

var _user2 = _interopRequireDefault(_user);

var _assign = require('lodash/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _result = require('lodash/object/result');

var _result2 = _interopRequireDefault(_result);

var _isArray = require('lodash/lang/isArray');

var _isArray2 = _interopRequireDefault(_isArray);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var usersNamespace = process.env.KINVEY_USERS_NAMESPACE || 'user';
var rpcNamespace = process.env.KINVEY_RPC_NAMESPACE || 'rpc';

var Users = function (_DataStore) {
  _inherits(Users, _DataStore);

  function Users() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Users);

    options.model = _user2.default;
    return _possibleConstructorReturn(this, Object.getPrototypeOf(Users).call(this, 'users', options));
  }

  _createClass(Users, [{
    key: 'getPathname',
    value: function getPathname(client) {
      client = client || this.client;
      return '/' + usersNamespace + '/' + client.appId;
    }
  }, {
    key: 'getRpcPathname',
    value: function getRpcPathname(client) {
      client = client || this.client;
      return '/' + rpcNamespace + '/' + client.appId;
    }
  }, {
    key: 'find',
    value: function find(query) {
      var _this2 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var promise = undefined;

      options = (0, _assign2.default)({
        dataPolicy: this.dataPolicy,
        auth: this.auth,
        client: this.client
      }, options);

      if (query && !(query instanceof _query2.default)) {
        query = new _query2.default((0, _result2.default)(query, 'toJSON', query));
      }

      if (options.discover) {
        var request = new _networkRequest2.default({
          dataPolicy: options.dataPolicy,
          auth: options.auth,
          client: options.client,
          method: _enums.HttpMethod.POST,
          pathname: this.getPathname(options.client) + '/_lookup',
          data: query ? query.toJSON().filter : null
        });
        promise = request.execute().then(function (response) {
          var data = response.data;
          var models = [];

          if (!(0, _isArray2.default)(data)) {
            data = [data];
          }

          data.forEach(function (doc) {
            models.push(new _this2.model(doc, options));
          });

          return models;
        });
      } else {
        promise = _get(Object.getPrototypeOf(Users.prototype), 'find', this).call(this, query, options);
      }

      return promise;
    }
  }, {
    key: 'delete',
    value: function _delete(id) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      options = (0, _assign2.default)({
        client: this.client,
        flags: options.hard ? { hard: true } : {}
      }, options);

      var promise = _get(Object.getPrototypeOf(Users.prototype), 'delete', this).call(this, id, options).then(function (response) {
        return _user2.default.getActive(options).then(function (activeUser) {
          if (activeUser && activeUser.id === id) {
            return _user2.default.setActive(null, options.client);
          }
        }).then(function () {
          return response;
        });
      }).catch(function (err) {
        if (options.silent && err instanceof _errors.NotFoundError) {
          return null;
        }

        throw err;
      });

      return promise;
    }
  }, {
    key: 'exists',
    value: function exists(username) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      options = (0, _assign2.default)({
        client: this.client
      }, options);

      var request = new _networkRequest2.default({
        dataPolicy: _enums.ReadPolicy.ForceNetwork,
        auth: _auth2.default.app,
        client: options.client,
        method: _enums.HttpMethod.POST,
        pathname: this.getRpcPathname(options.client) + '/check-username-exists',
        data: { username: username }
      });
      var promise = request.execute().then(function (response) {
        var data = response.data;

        if (data) {
          return data.usernameExists;
        }

        return false;
      });

      return promise;
    }
  }, {
    key: 'restore',
    value: function restore(id) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      options = (0, _assign2.default)({
        client: this.client
      }, options);

      var request = new _networkRequest2.default({
        dataPolicy: _enums.ReadPolicy.ForceNetwork,
        auth: _auth2.default.master,
        client: options.client,
        method: _enums.HttpMethod.POST,
        pathname: this.getPathname(options.client) + '/' + id + '/_restore'
      });
      var promise = request.execute();
      return promise;
    }
  }]);

  return Users;
}(_datastore2.default);

exports.default = Users;