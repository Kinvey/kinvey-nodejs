'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _errors = require('../errors');

var _store = require('../utils/store');

var _forEach = require('lodash/collection/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _isArray = require('lodash/lang/isArray');

var _isArray2 = _interopRequireDefault(_isArray);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var indexedDB = undefined;
var db = null;
var inTransaction = false;
var queue = [];

if (typeof window !== 'undefined') {
  require('indexeddbshim');
  window.shimIndexedDB.__useShim();
  indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
} else {
  indexedDB = require('fake-indexeddb');
}

var IndexedDB = function () {
  function IndexedDB() {
    var dbName = arguments.length <= 0 || arguments[0] === undefined ? 'kinvey' : arguments[0];

    _classCallCheck(this, IndexedDB);

    this.dbName = dbName;
  }

  _createClass(IndexedDB, [{
    key: 'openTransaction',
    value: function openTransaction(collection) {
      var write = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
      var success = arguments[2];

      var _this = this;

      var error = arguments[3];
      var force = arguments.length <= 4 || arguments[4] === undefined ? false : arguments[4];

      if (db && db.name === this.dbName) {
        if (db.objectStoreNames.indexOf(collection) !== -1) {
          try {
            var mode = write ? 'readwrite' : 'readonly';
            var txn = db.transaction([collection], mode);

            if (txn) {
              var store = txn.objectStore(collection);
              return success(store);
            }

            throw new _errors.KinveyError('Unable to open a transaction for the ' + collection + ' ' + ('collection on the ' + this.dbName + ' indexedDB database.'));
          } catch (err) {
            return error(err);
          }
        } else if (!write) {
          return error(new _errors.NotFoundError('The ' + collection + ' collection was not found on ' + ('the ' + this.dbName + ' indexedDB database.')));
        }
      }

      if (!force && inTransaction) {
        return queue.push(function () {
          _this.openTransaction(collection, write, success, error);
        });
      }

      inTransaction = true;

      if (db && db.name !== this.dbName) {
        db.close();
        db = null;
      }

      var request = undefined;

      if (db) {
        var version = db.version + 1;
        db.close();
        request = indexedDB.open(this.dbName, version);
      } else {
        request = indexedDB.open(this.dbName);
      }

      request.onupgradeneeded = function onUpgradeNeeded(e) {
        db = e.target.result;

        if (write) {
          db.createObjectStore(collection, { keyPath: '_id' });
        }
      };

      request.onsuccess = function (e) {
        db = e.target.result;

        db.onversionchange = function onVersionChange() {
          if (db) {
            db.close();
            db = null;
          }
        };

        var wrap = function wrap(done) {
          return function (arg) {
            done(arg);

            inTransaction = false;

            if (queue.length > 0) {
              var pending = queue;
              queue = [];
              (0, _forEach2.default)(pending, function (fn) {
                fn();
              });
            }
          };
        };

        _this.openTransaction(collection, write, wrap(success), wrap(error), true);
      };

      request.onblocked = function () {
        error(new _errors.KinveyError('The ' + _this.dbName + ' indexedDB database version can\'t be upgraded ' + 'because the database is already open.'));
      };

      request.onerror = function (e) {
        error(new _errors.KinveyError('Unable to open the ' + _this.dbName + ' indexedDB database. ' + ('Received the error code ' + e.target.errorCode + '.')));
      };
    }
  }, {
    key: 'find',
    value: function find(collection) {
      var _this2 = this;

      var promise = new Promise(function (resolve, reject) {
        _this2.openTransaction(collection, false, function (store) {
          var request = store.openCursor();
          var response = [];

          request.onsuccess = function onSuccess(e) {
            var cursor = e.target.result;

            if (cursor) {
              response.push(cursor.value);
              return cursor.continue();
            }

            resolve(response);
          };

          request.onerror = function (e) {
            reject(new _errors.KinveyError('An error occurred while fetching data from the ' + collection + ' ' + ('collection on the ' + _this2.dbName + ' indexedDB database. Received the error code ' + e.target.errorCode + '.')));
          };
        }, reject);
      });

      return promise;
    }
  }, {
    key: 'get',
    value: function get(collection, id) {
      var _this3 = this;

      var promise = new Promise(function (resolve, reject) {
        _this3.openTransaction(collection, false, function (store) {
          var request = store.get(id);

          request.onsuccess = function (e) {
            var entity = e.target.result;

            if (entity) {
              return resolve(entity);
            }

            reject(new _errors.NotFoundError('An entity with id = ' + id + ' was not found in the ' + collection + ' ' + ('collection on the ' + _this3.dbName + ' indexedDB database.')));
          };

          request.onerror = function (e) {
            reject(new _errors.KinveyError('An error occurred while retrieving an entity with id = ' + id + ' ' + ('from the ' + collection + ' collection on the ' + _this3.dbName + ' indexedDB database. ') + ('Received the error code ' + e.target.errorCode + '.')));
          };
        }, reject);
      });

      return promise;
    }
  }, {
    key: 'save',
    value: function save(collection, entity) {
      var _this4 = this;

      if ((0, _isArray2.default)(entity)) {
        return this.saveBulk(collection, entity);
      }

      if (!entity._id) {
        entity._id = (0, _store.generateObjectId)();
      }

      var promise = new Promise(function (resolve, reject) {
        _this4.openTransaction(collection, true, function (store) {
          var request = store.put(entity);

          request.onsuccess = function onSuccess() {
            resolve(entity);
          };

          request.onerror = function (e) {
            reject(new _errors.KinveyError('An error occurred while saving an entity to the ' + collection + ' ' + ('collection on the ' + _this4.dbName + ' indexedDB database. Received the error code ' + e.target.errorCode + '.')));
          };
        }, reject);
      });

      return promise;
    }
  }, {
    key: 'saveBulk',
    value: function saveBulk(collection, entities) {
      var _this5 = this;

      if (!(0, _isArray2.default)(entities)) {
        return this.save(collection, entities);
      }

      if (entities.length === 0) {
        return Promise.resolve(entities);
      }

      var promise = new Promise(function (resolve, reject) {
        _this5.openTransaction(collection, true, function (store) {
          var request = store.transaction;

          (0, _forEach2.default)(entities, function (entity) {
            entity._id = entity._id || (0, _store.generateObjectId)();
            store.put(entity);
          });

          request.oncomplete = function onComplete() {
            resolve(entities);
          };

          request.onerror = function (e) {
            reject(new _errors.KinveyError('An error occurred while saving the entities to the ' + collection + ' ' + ('collection on the ' + _this5.dbName + ' indexedDB database. Received the error code ' + e.target.errorCode + '.')));
          };
        }, reject);
      });

      return promise;
    }
  }, {
    key: 'removeById',
    value: function removeById(collection, id) {
      var _this6 = this;

      var promise = new Promise(function (resolve, reject) {
        _this6.openTransaction(collection, true, function (store) {
          var request = store.transaction;
          var doc = store.get(id);
          store.delete(id);

          request.oncomplete = function () {
            if (!doc.result) {
              return reject(new _errors.NotFoundError('An entity with id = ' + id + ' was not found in the ' + collection + ' ' + ('collection on the ' + _this6.dbName + ' indexedDB database.')));
            }

            resolve({
              count: 1,
              entities: [doc.result]
            });
          };

          request.onerror = function (e) {
            reject(new _errors.KinveyError('An error occurred while deleting an entity with id = ' + id + ' ' + ('in the ' + collection + ' collection on the ' + _this6.dbName + ' indexedDB database. ') + ('Received the error code ' + e.target.errorCode + '.')));
          };
        }, reject);
      });

      return promise;
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      var _this7 = this;

      var promise = new Promise(function (resolve, reject) {
        if (db) {
          db.close();
          db = null;
        }

        var request = indexedDB.deleteDatabase(_this7.dbName);

        request.onsuccess = function onSuccess() {
          resolve(null);
        };

        request.onerror = function (e) {
          reject(new _errors.KinveyError('An error occurred while destroying the ' + _this7.dbName + ' ' + ('indexedDB database. Received the error code ' + e.target.errorCode + '.')));
        };
      });

      return promise;
    }
  }], [{
    key: 'isSupported',
    value: function isSupported() {
      return indexedDB ? true : false;
    }
  }]);

  return IndexedDB;
}();

exports.default = IndexedDB;