'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _aggregation = require('./core/aggregation');

var _aggregation2 = _interopRequireDefault(_aggregation);

var _auth = require('./core/auth');

var _auth2 = _interopRequireDefault(_auth);

var _client = require('./core/client');

var _client2 = _interopRequireDefault(_client);

var _command = require('./core/command');

var _command2 = _interopRequireDefault(_command);

var _file = require('./core/models/file');

var _file2 = _interopRequireDefault(_file);

var _files = require('./core/stores/files');

var _files2 = _interopRequireDefault(_files);

var _log = require('./core/log');

var _log2 = _interopRequireDefault(_log);

var _metadata = require('./core/metadata');

var _metadata2 = _interopRequireDefault(_metadata);

var _networkRequest = require('./core/requests/networkRequest');

var _networkRequest2 = _interopRequireDefault(_networkRequest);

var _query = require('./core/query');

var _query2 = _interopRequireDefault(_query);

var _datastore = require('./core/stores/datastore');

var _datastore2 = _interopRequireDefault(_datastore);

var _sync = require('./core/sync');

var _sync2 = _interopRequireDefault(_sync);

var _user = require('./core/models/user');

var _user2 = _interopRequireDefault(_user);

var _users = require('./core/stores/users');

var _users2 = _interopRequireDefault(_users);

var _enums = require('./core/enums');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var appdataNamespace = process.env.KINVEY_DATASTORE_NAMESPACE || 'appdata';

var Kinvey = function () {
  function Kinvey() {
    _classCallCheck(this, Kinvey);
  }

  _createClass(Kinvey, null, [{
    key: 'init',
    value: function init(options) {
      var client = _client2.default.init(options);
      return client;
    }
  }, {
    key: 'ping',
    value: function ping() {
      var client = undefined;

      try {
        client = _client2.default.sharedInstance();
      } catch (err) {
        client = new _client2.default({
          appKey: '',
          appSecret: ''
        });
      }

      var request = new _networkRequest2.default({
        method: _enums.HttpMethod.GET,
        client: client,
        auth: client.appKey !== '' ? _auth2.default.all : _auth2.default.none,
        pathname: appdataNamespace
      });

      return request.execute().then(function (response) {
        if (response.isSuccess()) {
          return response.data;
        }

        throw response.error;
      });
    }
  }]);

  return Kinvey;
}();

exports.default = Kinvey;

Kinvey.Aggregation = _aggregation2.default;
Kinvey.AuthorizationGrant = _enums.AuthorizationGrant;
Kinvey.Command = _command2.default;
Kinvey.DataStore = _datastore2.default;
Kinvey.DataStoreType = _enums.DataStoreType;
Kinvey.File = _file2.default;
Kinvey.Files = _files2.default;
Kinvey.Log = _log2.default;
Kinvey.Metadata = _metadata2.default;
Kinvey.Promise = Promise;
Kinvey.Query = _query2.default;
Kinvey.ReadPolicy = _enums.ReadPolicy;
Kinvey.SocialIdentity = _enums.SocialIdentity;
Kinvey.Sync = _sync2.default;
Kinvey.User = _user2.default;
Kinvey.Users = _users2.default;