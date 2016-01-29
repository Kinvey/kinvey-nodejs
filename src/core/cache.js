'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _enums = require('./enums');

var _query = require('./query');

var _query2 = _interopRequireDefault(_query);

var _aggregation = require('./aggregation');

var _aggregation2 = _interopRequireDefault(_aggregation);

var _indexeddb = require('./persistence/indexeddb');

var _indexeddb2 = _interopRequireDefault(_indexeddb);

var _localstorage = require('./persistence/localstorage');

var _localstorage2 = _interopRequireDefault(_localstorage);

var _memory = require('./persistence/memory');

var _memory2 = _interopRequireDefault(_memory);

var _websql = require('./persistence/websql');

var _websql2 = _interopRequireDefault(_websql);

var _log = require('./log');

var _log2 = _interopRequireDefault(_log);

var _result = require('lodash/object/result');

var _result2 = _interopRequireDefault(_result);

var _reduce = require('lodash/collection/reduce');

var _reduce2 = _interopRequireDefault(_reduce);

var _forEach = require('lodash/collection/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _isString = require('lodash/lang/isString');

var _isString2 = _interopRequireDefault(_isString);

var _isArray = require('lodash/lang/isArray');

var _isArray2 = _interopRequireDefault(_isArray);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var objectIdPrefix = process.env.KINVEY_OBJECT_ID_PREFIX || 'local_';

var Cache = function () {
  function Cache() {
    var _this = this;

    var dbName = arguments.length <= 0 || arguments[0] === undefined ? 'kinvey' : arguments[0];
    var adapters = arguments.length <= 1 || arguments[1] === undefined ? [_enums.CacheAdapter.Memory] : arguments[1];

    _classCallCheck(this, Cache);

    if (!(0, _isArray2.default)(adapters)) {
      adapters = [adapters];
    }

    (0, _forEach2.default)(adapters, function (adapter) {
      switch (adapter) {
        case _enums.CacheAdapter.IndexedDB:
          if (_indexeddb2.default.isSupported()) {
            _this.db = new _indexeddb2.default(dbName);
            return false;
          }

          break;
        case _enums.CacheAdapter.LocalStorage:
          if (_localstorage2.default.isSupported()) {
            _this.db = new _localstorage2.default(dbName);
            return false;
          }

          break;
        case _enums.CacheAdapter.Memory:
          if (_memory2.default.isSupported()) {
            _this.db = new _memory2.default(dbName);
            return false;
          }

          break;
        case _enums.CacheAdapter.WebSQL:
          if (_websql2.default.isSupported()) {
            _this.db = new _websql2.default(dbName);
            return false;
          }

          break;
        default:
          _log2.default.warn('The ' + adapter + ' adapter is is not recognized.');
      }
    });

    if (!this.db) {
      if (_memory2.default.isSupported()) {
        _log2.default.error('Provided adapters are unsupported on this platform. ' + 'Defaulting to StoreAdapter.Memory adapter.', adapters);
        this.db = new _memory2.default(dbName);
      } else {
        _log2.default.error('Provided adapters are unsupported on this platform.', adapters);
      }
    }
  }

  _createClass(Cache, [{
    key: 'isLocalObjectId',
    value: function isLocalObjectId(id) {
      return id.indexOf(this.objectIdPrefix) === 0 ? true : false;
    }
  }, {
    key: 'find',
    value: function find(collection, query) {
      var promise = this.db.find(collection).then(function (entities) {
        if (query && !(query instanceof _query2.default)) {
          query = new _query2.default((0, _result2.default)(query, 'toJSON', query));
        }

        if (entities.length > 0 && query) {
          entities = query._process(entities);
        }

        return entities;
      });

      return promise;
    }
  }, {
    key: 'count',
    value: function count(collection, query) {
      var promise = this.find(collection, query).then(function (entities) {
        return entities.length;
      });

      return promise;
    }
  }, {
    key: 'group',
    value: function group(collection, aggregation) {
      var promise = this.find(collection).then(function (entities) {
        if (!(aggregation instanceof _aggregation2.default)) {
          aggregation = new _aggregation2.default((0, _result2.default)(aggregation, 'toJSON', aggregation));
        }

        return aggregation.process(entities);
      });

      return promise;
    }
  }, {
    key: 'findById',
    value: function findById(collection, id) {
      if (!(0, _isString2.default)(id)) {
        _log2.default.warn(id + ' is not a string. Casting to a string value.', id);
        id = String(id);
      }

      var promise = this.db.findById(collection, id);
      return promise;
    }
  }, {
    key: 'save',
    value: function save(collection, entity) {
      if (!entity) {
        return Promise.resolve(null);
      }

      if ((0, _isArray2.default)(entity)) {
        return this.saveBulk(collection, entity);
      }

      var promise = this.db.save(collection, entity);
      return promise;
    }
  }, {
    key: 'saveBulk',
    value: function saveBulk(collection) {
      var entities = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      if (!entities) {
        return Promise.resolve(null);
      }

      if (!(0, _isArray2.default)(entities)) {
        return this.save(collection, entities);
      }

      var promise = this.db.saveBulk(collection, entities);
      return promise;
    }
  }, {
    key: 'remove',
    value: function remove(collection, query) {
      var _this2 = this;

      if (query && !(query instanceof _query2.default)) {
        query = new _query2.default((0, _result2.default)(query, 'toJSON', query));
      }

      if (query) {
        query.sort(null).limit(null).skip(0);
      }

      var promise = this.find(collection, query).then(function (entities) {
        var promises = entities.map(function (entity) {
          return _this2.removeById(collection, entity._id);
        });

        return Promise.all(promises);
      }).then(function (responses) {
        return (0, _reduce2.default)(responses, function (result, response) {
          result.count += response.count;
          result.entities.concat(response.entities);
          return result;
        }, {
          count: 0,
          entities: []
        });
      });

      return promise;
    }
  }, {
    key: 'removeById',
    value: function removeById(collection, id) {
      if (!id) {
        return Promise.resolve({
          count: 0,
          entities: []
        });
      }

      var promise = this.db.removeById(collection, id);
      return promise;
    }
  }, {
    key: 'objectIdPrefix',
    get: function get() {
      return objectIdPrefix;
    }
  }]);

  return Cache;
}();

exports.default = Cache;