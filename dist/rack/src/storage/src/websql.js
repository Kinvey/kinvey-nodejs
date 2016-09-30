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

var _map = require('lodash/map');

var _map2 = _interopRequireDefault(_map);

var _forEach = require('lodash/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _isArray = require('lodash/isArray');

var _isArray2 = _interopRequireDefault(_isArray);

var _isFunction = require('lodash/isFunction');

var _isFunction2 = _interopRequireDefault(_isFunction);

var _isString = require('lodash/isString');

var _isString2 = _interopRequireDefault(_isString);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _es6Promise2.default(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _es6Promise2.default.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var idAttribute = process && process.env && process.env.KINVEY_ID_ATTRIBUTE || undefined || '_id';
var masterCollectionName = 'sqlite_master';
var size = 5 * 1000 * 1000;
var dbCache = {};

var WebSQL = function () {
  function WebSQL() {
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'kinvey';

    _classCallCheck(this, WebSQL);

    this.name = name;
  }

  _createClass(WebSQL, [{
    key: 'openDatabase',
    value: function openDatabase() {
      var db = dbCache[this.name];

      if (!db) {
        db = global.openDatabase(this.name, 1, '', size);
        dbCache[this.name] = db;
      }

      return db;
    }
  }, {
    key: 'openTransaction',
    value: function openTransaction(collection, query, parameters) {
      var _this = this;

      var write = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

      var db = this.openDatabase();
      var escapedCollection = '"' + collection + '"';
      var isMaster = collection === masterCollectionName;
      var isMulti = (0, _isArray2.default)(query);
      query = isMulti ? query : [[query, parameters]];

      var promise = new _es6Promise2.default(function (resolve, reject) {
        var writeTxn = write || !(0, _isFunction2.default)(db.readTransaction);
        db[writeTxn ? 'transaction' : 'readTransaction'](function (tx) {
          if (write && !isMaster) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS ' + escapedCollection + ' ' + '(key BLOB PRIMARY KEY NOT NULL, value BLOB NOT NULL)');
          }

          var pending = query.length;
          var responses = [];

          if (pending === 0) {
            resolve(isMulti ? responses : responses.shift());
          } else {
            (0, _forEach2.default)(query, function (parts) {
              var sql = parts[0].replace('#{collection}', escapedCollection);

              tx.executeSql(sql, parts[1], function (_, resultSet) {
                var response = {
                  rowCount: resultSet.rowsAffected,
                  result: []
                };

                if (resultSet.rows.length) {
                  for (var i = 0, len = resultSet.rows.length; i < len; i += 1) {
                    try {
                      var value = resultSet.rows.item(i).value;
                      var entity = isMaster ? value : JSON.parse(value);
                      response.result.push(entity);
                    } catch (error) {}
                  }
                }

                responses.push(response);
                pending -= 1;

                if (pending === 0) {
                  resolve(isMulti ? responses : responses.shift());
                }
              });
            });
          }
        }, function (error) {
          error = (0, _isString2.default)(error) ? error : error.message;

          if (error && error.indexOf('no such table') === -1) {
            return reject(new _errors.NotFoundError('The ' + collection + ' collection was not found on' + (' the ' + _this.name + ' WebSQL database.')));
          }

          var query = 'SELECT name AS value from #{collection} WHERE type = ? AND name = ?';
          var parameters = ['table', collection];

          return _this.openTransaction(masterCollectionName, query, parameters).then(function (response) {
            if (response.result.length === 0) {
              return reject(new _errors.NotFoundError('The ' + collection + ' collection was not found on' + (' the ' + _this.name + ' WebSQL database.')));
            }

            return reject(new Error('Unable to open a transaction for the ' + collection + (' collection on the ' + _this.name + ' WebSQL database.')));
          }).catch(function (error) {
            reject(new Error('Unable to open a transaction for the ' + collection + (' collection on the ' + _this.name + ' WebSQL database.'), error));
          });
        });
      });

      return promise;
    }
  }, {
    key: 'find',
    value: function () {
      var _ref = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee(collection) {
        var sql, response;
        return _regeneratorRuntime2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                sql = 'SELECT value FROM #{collection}';
                _context.next = 3;
                return this.openTransaction(collection, sql, []);

              case 3:
                response = _context.sent;
                return _context.abrupt('return', response.result);

              case 5:
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
        var sql, response, entities;
        return _regeneratorRuntime2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                sql = 'SELECT value FROM #{collection} WHERE key = ?';
                _context2.next = 3;
                return this.openTransaction(collection, sql, [id]);

              case 3:
                response = _context2.sent;
                entities = response.result;

                if (!(entities.length === 0)) {
                  _context2.next = 7;
                  break;
                }

                throw new _errors.NotFoundError('An entity with _id = ' + id + ' was not found in the ' + collection + (' collection on the ' + this.name + ' WebSQL database.'));

              case 7:
                return _context2.abrupt('return', entities[0]);

              case 8:
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
        var queries;
        return _regeneratorRuntime2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                queries = [];

                entities = (0, _map2.default)(entities, function (entity) {
                  queries.push(['REPLACE INTO #{collection} (key, value) VALUES (?, ?)', [entity[idAttribute], JSON.stringify(entity)]]);

                  return entity;
                });

                _context3.next = 4;
                return this.openTransaction(collection, queries, null, true);

              case 4:
                return _context3.abrupt('return', entities);

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
        var queries, response, entities, count;
        return _regeneratorRuntime2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                queries = [['SELECT value FROM #{collection} WHERE key = ?', [id]], ['DELETE FROM #{collection} WHERE key = ?', [id]]];
                _context4.next = 3;
                return this.openTransaction(collection, queries, null, true);

              case 3:
                response = _context4.sent;
                entities = response[0].result;
                count = response[1].rowCount;

                count = count || entities.length;

                if (!(count === 0)) {
                  _context4.next = 9;
                  break;
                }

                throw new _errors.NotFoundError('An entity with _id = ' + id + ' was not found in the ' + collection + (' collection on the ' + this.name + ' WebSQL database.'));

              case 9:
                return _context4.abrupt('return', entities[0]);

              case 10:
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
        var response, tables, queries;
        return _regeneratorRuntime2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this.openTransaction(masterCollectionName, 'SELECT name AS value FROM #{collection} WHERE type = ?', ['table'], false);

              case 2:
                response = _context5.sent;
                tables = response.result;

                if (!(tables.length === 0)) {
                  _context5.next = 6;
                  break;
                }

                return _context5.abrupt('return', null);

              case 6:
                queries = tables.filter(function (table) {
                  return (/^[a-zA-Z0-9\-]{1,128}/.test(table)
                  );
                }).map(function (table) {
                  return ['DROP TABLE IF EXISTS \'' + table + '\''];
                });
                _context5.next = 9;
                return this.openTransaction(masterCollectionName, queries, null, true);

              case 9:
                dbCache = {};
                return _context5.abrupt('return', null);

              case 11:
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
      return !!global.openDatabase;
    }
  }]);

  return WebSQL;
}();

exports.default = WebSQL;