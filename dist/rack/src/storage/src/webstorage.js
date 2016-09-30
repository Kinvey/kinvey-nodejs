'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SessionStorage = exports.LocalStorage = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _errors = require('../../../../errors');

var _regeneratorRuntime = require('regenerator-runtime');

var _regeneratorRuntime2 = _interopRequireDefault(_regeneratorRuntime);

var _keyBy = require('lodash/keyBy');

var _keyBy2 = _interopRequireDefault(_keyBy);

var _merge = require('lodash/merge');

var _merge2 = _interopRequireDefault(_merge);

var _values = require('lodash/values');

var _values2 = _interopRequireDefault(_values);

var _forEach = require('lodash/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _findIndex = require('lodash/findIndex');

var _findIndex2 = _interopRequireDefault(_findIndex);

var _find = require('lodash/find');

var _find2 = _interopRequireDefault(_find);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var idAttribute = process && process.env && process.env.KINVEY_ID_ATTRIBUTE || undefined || '_id';
var masterCollectionName = 'master';

var WebStorage = function () {
  function WebStorage() {
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'kinvey';

    _classCallCheck(this, WebStorage);

    this.name = name;
  }

  _createClass(WebStorage, [{
    key: 'masterCollectionName',
    get: function get() {
      return this.name + '_' + masterCollectionName;
    }
  }]);

  return WebStorage;
}();

exports.default = WebStorage;

var LocalStorage = exports.LocalStorage = function (_WebStorage) {
  _inherits(LocalStorage, _WebStorage);

  function LocalStorage(name) {
    _classCallCheck(this, LocalStorage);

    var _this = _possibleConstructorReturn(this, (LocalStorage.__proto__ || Object.getPrototypeOf(LocalStorage)).call(this, name));

    global.localStorage.setItem(_this.masterCollectionName, JSON.stringify([]));
    return _this;
  }

  _createClass(LocalStorage, [{
    key: 'find',
    value: function () {
      var _ref = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee(collection) {
        var entities;
        return _regeneratorRuntime2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                entities = global.localStorage.getItem('' + this.name + collection);

                if (!entities) {
                  _context.next = 3;
                  break;
                }

                return _context.abrupt('return', JSON.parse(entities));

              case 3:
                return _context.abrupt('return', entities);

              case 4:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function find(_x2) {
        return _ref.apply(this, arguments);
      }

      return find;
    }()
  }, {
    key: 'findById',
    value: function () {
      var _ref2 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee2(collection, id) {
        var entities, entity;
        return _regeneratorRuntime2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return this.find(collection);

              case 2:
                entities = _context2.sent;
                entity = (0, _find2.default)(entities, function (entity) {
                  return entity[idAttribute] === id;
                });

                if (entity) {
                  _context2.next = 6;
                  break;
                }

                throw new _errors.NotFoundError('An entity with _id = ' + id + ' was not found in the ' + collection + (' collection on the ' + this.name + ' localstorage database.'));

              case 6:
                return _context2.abrupt('return', entity);

              case 7:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function findById(_x3, _x4) {
        return _ref2.apply(this, arguments);
      }

      return findById;
    }()
  }, {
    key: 'save',
    value: function () {
      var _ref3 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee3(collection, entities) {
        var collections, existingEntities, existingEntitiesById, entitiesById, existingEntityIds;
        return _regeneratorRuntime2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this.find(this.masterCollectionName);

              case 2:
                collections = _context3.sent;


                if ((0, _findIndex2.default)(collections, collection) === -1) {
                  collections.push(collection);
                  global.localStorage.setItem(this.masterCollectionName, JSON.stringify(collections));
                }

                _context3.next = 6;
                return this.find(collection);

              case 6:
                existingEntities = _context3.sent;
                existingEntitiesById = (0, _keyBy2.default)(existingEntities, idAttribute);
                entitiesById = (0, _keyBy2.default)(entities, idAttribute);
                existingEntityIds = Object.keys(existingEntitiesById);


                (0, _forEach2.default)(existingEntityIds, function (id) {
                  var existingEntity = existingEntitiesById[id];
                  var entity = entitiesById[id];

                  if (entity) {
                    entitiesById[id] = (0, _merge2.default)(existingEntity, entity);
                  }
                });

                global.localStorage.setItem('' + this.name + collection, JSON.stringify((0, _values2.default)(entitiesById)));
                return _context3.abrupt('return', entities);

              case 13:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function save(_x5, _x6) {
        return _ref3.apply(this, arguments);
      }

      return save;
    }()
  }, {
    key: 'removeById',
    value: function () {
      var _ref4 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee4(collection, id) {
        var entities, entitiesById, entity;
        return _regeneratorRuntime2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.find(collection);

              case 2:
                entities = _context4.sent;
                entitiesById = (0, _keyBy2.default)(entities, idAttribute);
                entity = entitiesById[id];

                if (entity) {
                  _context4.next = 7;
                  break;
                }

                throw new _errors.NotFoundError('An entity with _id = ' + id + ' was not found in the ' + collection + ' ' + ('collection on the ' + this.name + ' memory database.'));

              case 7:

                delete entitiesById[id];
                _context4.next = 10;
                return this.save(collection, (0, _values2.default)(entitiesById));

              case 10:
                return _context4.abrupt('return', entity);

              case 11:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function removeById(_x7, _x8) {
        return _ref4.apply(this, arguments);
      }

      return removeById;
    }()
  }, {
    key: 'clear',
    value: function () {
      var _ref5 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee5() {
        var _this2 = this;

        var collections;
        return _regeneratorRuntime2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this.find(this.masterCollectionName);

              case 2:
                collections = _context5.sent;


                (0, _forEach2.default)(collections, function (collection) {
                  global.localStorage.removeItem('' + _this2.name + collection);
                });

                global.localStorage.setItem(this.masterCollectionName, JSON.stringify([]));

              case 5:
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
      if (global.localStorage) {
        var item = 'testLocalStorageSupport';
        try {
          global.localStorage.setItem(item, item);
          global.localStorage.removeItem(item);
          return true;
        } catch (e) {
          return false;
        }
      }

      return false;
    }
  }]);

  return LocalStorage;
}(WebStorage);

var SessionStorage = exports.SessionStorage = function (_WebStorage2) {
  _inherits(SessionStorage, _WebStorage2);

  function SessionStorage(name) {
    _classCallCheck(this, SessionStorage);

    var _this3 = _possibleConstructorReturn(this, (SessionStorage.__proto__ || Object.getPrototypeOf(SessionStorage)).call(this, name));

    global.sessionStorage.setItem(_this3.masterCollectionName, JSON.stringify([]));
    return _this3;
  }

  _createClass(SessionStorage, [{
    key: 'find',
    value: function () {
      var _ref6 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee6(collection) {
        var entities;
        return _regeneratorRuntime2.default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                entities = global.sessionStorage.getItem('' + this.name + collection);

                if (!entities) {
                  _context6.next = 3;
                  break;
                }

                return _context6.abrupt('return', JSON.parse(entities));

              case 3:
                return _context6.abrupt('return', entities);

              case 4:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function find(_x9) {
        return _ref6.apply(this, arguments);
      }

      return find;
    }()
  }, {
    key: 'findById',
    value: function () {
      var _ref7 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee7(collection, id) {
        var entities, entity;
        return _regeneratorRuntime2.default.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                _context7.next = 2;
                return this.find(collection);

              case 2:
                entities = _context7.sent;
                entity = (0, _find2.default)(entities, function (entity) {
                  return entity[idAttribute] === id;
                });

                if (entity) {
                  _context7.next = 6;
                  break;
                }

                throw new _errors.NotFoundError('An entity with _id = ' + id + ' was not found in the ' + collection + (' collection on the ' + this.name + ' localstorage database.'));

              case 6:
                return _context7.abrupt('return', entity);

              case 7:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function findById(_x10, _x11) {
        return _ref7.apply(this, arguments);
      }

      return findById;
    }()
  }, {
    key: 'save',
    value: function () {
      var _ref8 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee8(collection, entities) {
        var collections, existingEntities, existingEntitiesById, entitiesById, existingEntityIds;
        return _regeneratorRuntime2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.next = 2;
                return this.find(this.masterCollectionName);

              case 2:
                collections = _context8.sent;


                if ((0, _findIndex2.default)(collections, collection) === -1) {
                  collections.push(collection);
                  global.sessionStorage.setItem(this.masterCollectionName, JSON.stringify(collections));
                }

                _context8.next = 6;
                return this.find(collection);

              case 6:
                existingEntities = _context8.sent;
                existingEntitiesById = (0, _keyBy2.default)(existingEntities, idAttribute);
                entitiesById = (0, _keyBy2.default)(entities, idAttribute);
                existingEntityIds = Object.keys(existingEntitiesById);


                (0, _forEach2.default)(existingEntityIds, function (id) {
                  var existingEntity = existingEntitiesById[id];
                  var entity = entitiesById[id];

                  if (entity) {
                    entitiesById[id] = (0, _merge2.default)(existingEntity, entity);
                  }
                });

                global.sessionStorage.setItem('' + this.name + collection, JSON.stringify((0, _values2.default)(entitiesById)));
                return _context8.abrupt('return', entities);

              case 13:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function save(_x12, _x13) {
        return _ref8.apply(this, arguments);
      }

      return save;
    }()
  }, {
    key: 'removeById',
    value: function () {
      var _ref9 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee9(collection, id) {
        var entities, entitiesById, entity;
        return _regeneratorRuntime2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                _context9.next = 2;
                return this.find(collection);

              case 2:
                entities = _context9.sent;
                entitiesById = (0, _keyBy2.default)(entities, idAttribute);
                entity = entitiesById[id];

                if (entity) {
                  _context9.next = 7;
                  break;
                }

                throw new _errors.NotFoundError('An entity with _id = ' + id + ' was not found in the ' + collection + ' ' + ('collection on the ' + this.name + ' memory database.'));

              case 7:

                delete entitiesById[id];
                global.sessionStorage.setItem('' + this.name + collection, JSON.stringify((0, _values2.default)(entitiesById)));

                return _context9.abrupt('return', entity);

              case 10:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function removeById(_x14, _x15) {
        return _ref9.apply(this, arguments);
      }

      return removeById;
    }()
  }, {
    key: 'clear',
    value: function () {
      var _ref10 = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee10() {
        var _this4 = this;

        var collections;
        return _regeneratorRuntime2.default.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                _context10.next = 2;
                return this.find(this.masterCollectionName);

              case 2:
                collections = _context10.sent;


                (0, _forEach2.default)(collections, function (collection) {
                  global.sessionStorage.removeItem('' + _this4.name + collection);
                });

                global.sessionStorage.setItem(this.masterCollectionName, JSON.stringify([]));

              case 5:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function clear() {
        return _ref10.apply(this, arguments);
      }

      return clear;
    }()
  }], [{
    key: 'isSupported',
    value: function isSupported() {
      if (global.sessionStorage) {
        var item = 'testSessionStorageSupport';
        try {
          global.sessionStorage.setItem(item, item);
          global.sessionStorage.removeItem(item);
          return true;
        } catch (e) {
          return false;
        }
      }

      return false;
    }
  }]);

  return SessionStorage;
}(WebStorage);