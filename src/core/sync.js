'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _datastore = require('./stores/datastore');

var _datastore2 = _interopRequireDefault(_datastore);

var _query = require('./query');

var _query2 = _interopRequireDefault(_query);

var _enums = require('./enums');

var _reduce = require('lodash/collection/reduce');

var _reduce2 = _interopRequireDefault(_reduce);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var enabledSymbol = Symbol();
var syncStoreName = process.env.KINVEY_SYNC_STORE_NAME || 'sync';

var Sync = function () {
  function Sync() {
    _classCallCheck(this, Sync);
  }

  _createClass(Sync, null, [{
    key: 'isEnabled',
    value: function isEnabled() {
      return Sync[enabledSymbol];
    }
  }, {
    key: 'enable',
    value: function enable() {
      Sync[enabledSymbol] = true;
    }
  }, {
    key: 'disable',
    value: function disable() {
      Sync[enabledSymbol] = false;
    }
  }, {
    key: 'count',
    value: function count() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options.dataPolicy = _enums.DataPolicy.LocalOnly;

      var syncStore = new _datastore2.default(syncStoreName, options);
      var promise = syncStore.find(null, options).then(function (syncModels) {
        return (0, _reduce2.default)(syncModels, function (result, syncModel) {
          return result + syncModel.get('size');
        }, 0);
      }).catch(function () {
        return 0;
      });

      return promise;
    }
  }, {
    key: 'push',
    value: function push() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options.dataPolicy = _enums.DataPolicy.LocalOnly;

      var syncStore = new _datastore2.default(syncStoreName, options);
      var query = new _query2.default();
      query.greaterThan('size', 0);
      var promise = syncStore.find(query, options).then(function (syncModels) {
        var promises = syncModels.map(function (syncModel) {
          var store = new _datastore2.default(syncModel.id, options);
          return store.push();
        });

        return Promise.all(promises);
      });

      return promise;
    }
  }, {
    key: 'sync',
    value: function sync() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options.dataPolicy = _enums.DataPolicy.LocalOnly;

      var syncStore = new _datastore2.default(syncStoreName, options);
      var promise = syncStore.find(null, options).then(function (syncModels) {
        var promises = syncModels.map(function (syncModel) {
          var store = new _datastore2.default(syncModel.id, options);
          return store.sync();
        });

        return Promise.all(promises);
      });

      return promise;
    }
  }, {
    key: 'clear',
    value: function clear(query) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      options.dataPolicy = _enums.DataPolicy.LocalOnly;
      var syncStore = new _datastore2.default(syncStoreName, options);
      var promise = syncStore.clear(query, options);
      return promise;
    }
  }]);

  return Sync;
}();

exports.default = Sync;

Sync[enabledSymbol] = process.env.KINVEY_SYNC_DEFAULT_STATE || true;