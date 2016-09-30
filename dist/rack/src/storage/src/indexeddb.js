'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _errors = require('../../../../errors');

var _es6Promise = require('es6-promise');

var _es6Promise2 = _interopRequireDefault(_es6Promise);

var _regeneratorRuntime = require('regenerator-runtime');

var _regeneratorRuntime2 = _interopRequireDefault(_regeneratorRuntime);

var _forEach = require('lodash/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _isString = require('lodash/isString');

var _isString2 = _interopRequireDefault(_isString);

var _isArray = require('lodash/isArray');

var _isArray2 = _interopRequireDefault(_isArray);

var _isFunction = require('lodash/isFunction');

var _isFunction2 = _interopRequireDefault(_isFunction);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _es6Promise2.default(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _es6Promise2.default.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dbCache = {};

var TransactionMode = {
  ReadWrite: 'readwrite',
  ReadOnly: 'readonly'
};
Object.freeze(TransactionMode);

var IndexedDB = function () {
  function IndexedDB(name) {
    _classCallCheck(this, IndexedDB);

    if (!name) {
      throw new Error('A name is required to use the IndexedDB adapter.', name);
    }

    if (!(0, _isString2.default)(name)) {
      throw new Error('The name must be a string to use the IndexedDB adapter', name);
    }

    this.name = name;
    this.inTransaction = false;
    this.queue = [];
  }

  _createClass(IndexedDB, [{
    key: 'openTransaction',
    value: function openTransaction(collection) {
      var write = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var success = arguments[2];

      var _this = this;

      var error = arguments[3];
      var force = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      var indexedDB = global.indexedDB || global.webkitIndexedDB || global.mozIndexedDB || global.msIndexedDB;
      var db = dbCache[this.name];

      if (db) {
        var containsCollection = (0, _isFunction2.default)(db.objectStoreNames.contains) ? db.objectStoreNames.contains(collection) : db.objectStoreNames.indexOf(collection) !== -1;

        if (containsCollection) {
          try {
            var mode = write ? TransactionMode.ReadWrite : TransactionMode.ReadOnly;
            var txn = db.transaction(collection, mode);

            if (txn) {
              return success(txn);
            }

            throw new Error('Unable to open a transaction for ' + collection + (' collection on the ' + this.name + ' IndexedDB database.'));
          } catch (err) {
            return error(err);
          }
        } else if (!write) {
          return error(new _errors.NotFoundError('The ' + collection + ' collection was not found on' + (' the ' + this.name + ' IndexedDB database.')));
        }
      }

      if (!force && this.inTransaction) {
        return this.queue.push(function () {
          _this.openTransaction(collection, write, success, error);
        });
      }

      this.inTransaction = true;
      var request = void 0;

      if (db) {
        var version = db.version + 1;
        db.close();
        request = indexedDB.open(this.name, version);
      } else {
        request = indexedDB.open(this.name);
      }

      request.onupgradeneeded = function (e) {
        db = e.target.result;
        dbCache[_this.name] = db;

        if (write) {
          db.createObjectStore(collection, { keyPath: '_id' });
        }
      };

      request.onsuccess = function (e) {
        db = e.target.result;
        dbCache[_this.name] = db;

        db.onversionchange = function () {
          if (db) {
            db.close();
            db = null;
            dbCache[_this.name] = null;
          }
        };

        var wrap = function wrap(done) {
          var callbackFn = function callbackFn(arg) {
            done(arg);

            _this.inTransaction = false;

            if (_this.queue.length > 0) {
              var pending = _this.queue;
              _this.queue = [];
              (0, _forEach2.default)(pending, function (fn) {
                fn.call(_this);
              });
            }
          };
          return callbackFn;
        };

        return _this.openTransaction(collection, write, wrap(success), wrap(error), true);
      };

      request.onblocked = function () {
        error(new Error('The ' + _this.name + ' IndexedDB database version can\'t be upgraded' + ' because the database is already open.'));
      };

      request.onerror = function (e) {
        error(new Error('Unable to open the ' + _this.name + ' IndexedDB database.' + (' ' + e.target.error.message + '.')));
      };

      return request;
    }
  }, {
    key: 'find',
    value: function () {
      var _ref = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee(collection) {
        var _this2 = this;

        return _regeneratorRuntime2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt('return', new _es6Promise2.default(function (resolve, reject) {
                  _this2.openTransaction(collection, false, function (txn) {
                    var store = txn.objectStore(collection);
                    var request = store.openCursor();
                    var entities = [];

                    request.onsuccess = function (e) {
                      var cursor = e.target.result;

                      if (cursor) {
                        entities.push(cursor.value);
                        return cursor.continue();
                      }

                      return resolve(entities);
                    };

                    request.onerror = function (e) {
                      reject(e);
                    };
                  }, reject);
                }));

              case 1:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function find(_x3) {
        return _ref.apply(this, arguments);
      }

      return find;
    }()
  }, {
    key: 'findById',
    value: function () {
      var _ref2 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee2(collection, id) {
        var _this3 = this;

        return _regeneratorRuntime2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                return _context2.abrupt('return', new _es6Promise2.default(function (resolve, reject) {
                  _this3.openTransaction(collection, false, function (txn) {
                    var store = txn.objectStore(collection);
                    var request = store.get(id);

                    request.onsuccess = function (e) {
                      var entity = e.target.result;

                      if (entity) {
                        resolve(entity);
                      } else {
                        reject(new _errors.NotFoundError('An entity with _id = ' + id + ' was not found in the ' + collection + (' collection on the ' + _this3.name + ' IndexedDB database.')));
                      }
                    };

                    request.onerror = function () {
                      reject(new _errors.NotFoundError('An entity with _id = ' + id + ' was not found in the ' + collection + (' collection on the ' + _this3.name + ' IndexedDB database.')));
                    };
                  }, reject);
                }));

              case 1:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function findById(_x4, _x5) {
        return _ref2.apply(this, arguments);
      }

      return findById;
    }()
  }, {
    key: 'save',
    value: function () {
      var _ref3 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee3(collection, entities) {
        var _this4 = this;

        var singular;
        return _regeneratorRuntime2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                singular = false;


                if (!(0, _isArray2.default)(entities)) {
                  singular = true;
                  entities = [entities];
                }

                if (!(entities.length === 0)) {
                  _context3.next = 4;
                  break;
                }

                return _context3.abrupt('return', null);

              case 4:
                return _context3.abrupt('return', new _es6Promise2.default(function (resolve, reject) {
                  _this4.openTransaction(collection, true, function (txn) {
                    var store = txn.objectStore(collection);

                    (0, _forEach2.default)(entities, function (entity) {
                      store.put(entity);
                    });

                    txn.oncomplete = function () {
                      resolve(singular ? entities[0] : entities);
                    };

                    txn.onerror = function (e) {
                      reject(new Error('An error occurred while saving the entities to the ' + collection + (' collection on the ' + _this4.name + ' IndexedDB database. ' + e.target.error.message + '.')));
                    };
                  }, reject);
                }));

              case 5:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function save(_x6, _x7) {
        return _ref3.apply(this, arguments);
      }

      return save;
    }()
  }, {
    key: 'removeById',
    value: function () {
      var _ref4 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee4(collection, id) {
        var _this5 = this;

        return _regeneratorRuntime2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                return _context4.abrupt('return', new _es6Promise2.default(function (resolve, reject) {
                  _this5.openTransaction(collection, true, function (txn) {
                    var store = txn.objectStore(collection);
                    var request = store.get(id);
                    store.delete(id);

                    txn.oncomplete = function () {
                      var entity = request.result;

                      if (entity) {
                        resolve(entity);
                      } else {
                        reject(new _errors.NotFoundError('An entity with id = ' + id + ' was not found in the ' + collection + (' collection on the ' + _this5.name + ' IndexedDB database.')));
                      }
                    };

                    txn.onerror = function () {
                      reject(new _errors.NotFoundError('An entity with id = ' + id + ' was not found in the ' + collection + (' collection on the ' + _this5.name + ' IndexedDB database.')));
                    };
                  }, reject);
                }));

              case 1:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function removeById(_x8, _x9) {
        return _ref4.apply(this, arguments);
      }

      return removeById;
    }()
  }, {
    key: 'clear',
    value: function () {
      var _ref5 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee5() {
        var _this6 = this;

        return _regeneratorRuntime2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                return _context5.abrupt('return', new _es6Promise2.default(function (resolve, reject) {
                  var indexedDB = global.indexedDB || global.webkitIndexedDB || global.mozIndexedDB || global.msIndexedDB;
                  var request = indexedDB.deleteDatabase(_this6.name);

                  request.onsuccess = function () {
                    dbCache = {};
                    resolve();
                  };

                  request.onerror = function (e) {
                    reject(new Error('An error occurred while clearing the ' + _this6.name + ' IndexedDB database.' + (' ' + e.target.error.message + '.')));
                  };
                }));

              case 1:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function clear() {
        return _ref5.apply(this, arguments);
      }

      return clear;
    }()
  }], [{
    key: 'isSupported',
    value: function isSupported() {
      var indexedDB = global.indexedDB || global.webkitIndexedDB || global.mozIndexedDB || global.msIndexedDB;
      return !!indexedDB;
    }
  }]);

  return IndexedDB;
}();

exports.default = IndexedDB;