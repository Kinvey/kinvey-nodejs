'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CacheMiddleware = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _kinveyJavascriptRack = require('kinvey-javascript-rack');

var _storage = require('./storage');

var _kinveyJavascriptSdkCore = require('kinvey-javascript-sdk-core');

var _regeneratorRuntime = require('regenerator-runtime');

var _regeneratorRuntime2 = _interopRequireDefault(_regeneratorRuntime);

var _isEmpty = require('lodash/isEmpty');

var _isEmpty2 = _interopRequireDefault(_isEmpty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // eslint-disable-line no-unused-vars


var dbCache = {};

var CacheMiddleware = exports.CacheMiddleware = function (_Middleware) {
  _inherits(CacheMiddleware, _Middleware);

  function CacheMiddleware() {
    var name = arguments.length <= 0 || arguments[0] === undefined ? 'Cache Middleware' : arguments[0];

    _classCallCheck(this, CacheMiddleware);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(CacheMiddleware).call(this, name));
  }

  _createClass(CacheMiddleware, [{
    key: 'openDatabase',
    value: function openDatabase(name) {
      if (!name) {
        throw new _kinveyJavascriptSdkCore.KinveyError('A name is required to open a database.');
      }

      var db = dbCache[name];

      if (!db) {
        db = new _storage.DB(name);
      }

      return db;
    }
  }, {
    key: 'handle',
    value: function () {
      var _ref = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee(request) {
        var method, body, appKey, collection, entityId, db, data, response;
        return _regeneratorRuntime2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                method = request.method;
                body = request.body;
                appKey = request.appKey;
                collection = request.collection;
                entityId = request.entityId;
                db = this.openDatabase(appKey);
                data = void 0;

                if (!(method === 'GET')) {
                  _context.next = 19;
                  break;
                }

                if (!entityId) {
                  _context.next = 14;
                  break;
                }

                _context.next = 11;
                return db.findById(collection, entityId);

              case 11:
                data = _context.sent;
                _context.next = 17;
                break;

              case 14:
                _context.next = 16;
                return db.find(collection);

              case 16:
                data = _context.sent;

              case 17:
                _context.next = 41;
                break;

              case 19:
                if (!(method === 'POST' || method === 'PUT')) {
                  _context.next = 25;
                  break;
                }

                _context.next = 22;
                return db.save(collection, body);

              case 22:
                data = _context.sent;
                _context.next = 41;
                break;

              case 25:
                if (!(method === 'DELETE')) {
                  _context.next = 41;
                  break;
                }

                if (!(collection && entityId)) {
                  _context.next = 32;
                  break;
                }

                _context.next = 29;
                return db.removeById(collection, entityId);

              case 29:
                data = _context.sent;
                _context.next = 41;
                break;

              case 32:
                if (collection) {
                  _context.next = 38;
                  break;
                }

                _context.next = 35;
                return db.clear();

              case 35:
                data = _context.sent;
                _context.next = 41;
                break;

              case 38:
                _context.next = 40;
                return db.remove(collection, body);

              case 40:
                data = _context.sent;

              case 41:
                response = {
                  statusCode: method === 'POST' ? 201 : 200,
                  headers: {},
                  data: data
                };


                if (!data || (0, _isEmpty2.default)(data)) {
                  response.statusCode = 204;
                }

                return _context.abrupt('return', { response: response });

              case 44:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function handle(_x2) {
        return _ref.apply(this, arguments);
      }

      return handle;
    }()
  }]);

  return CacheMiddleware;
}(_kinveyJavascriptRack.Middleware);