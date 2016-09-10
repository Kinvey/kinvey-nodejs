'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NetworkRack = exports.CacheRack = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _kinveyJavascriptRack = require('kinvey-javascript-rack');

var _middleware = require('./middleware');

var _regeneratorRuntime = require('regenerator-runtime');

var _regeneratorRuntime2 = _interopRequireDefault(_regeneratorRuntime);

var _result = require('lodash/result');

var _result2 = _interopRequireDefault(_result);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // eslint-disable-line no-unused-vars


var Rack = function (_CoreRack) {
  _inherits(Rack, _CoreRack);

  function Rack() {
    _classCallCheck(this, Rack);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Rack).apply(this, arguments));
  }

  _createClass(Rack, [{
    key: 'execute',
    value: function () {
      var _ref = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee(request) {
        var _ref2, response;

        return _regeneratorRuntime2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return _get(Object.getPrototypeOf(Rack.prototype), 'execute', this).call(this, (0, _result2.default)(request, 'toPlainObject', request));

              case 2:
                _ref2 = _context.sent;
                response = _ref2.response;
                return _context.abrupt('return', response);

              case 5:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function execute(_x) {
        return _ref.apply(this, arguments);
      }

      return execute;
    }()
  }]);

  return Rack;
}(_kinveyJavascriptRack.Rack);

var CacheRack = exports.CacheRack = function (_Rack) {
  _inherits(CacheRack, _Rack);

  function CacheRack() {
    var name = arguments.length <= 0 || arguments[0] === undefined ? 'Cache Rack' : arguments[0];

    _classCallCheck(this, CacheRack);

    var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(CacheRack).call(this, name));

    _this2.use(new _middleware.CacheMiddleware());
    return _this2;
  }

  return CacheRack;
}(Rack);

var NetworkRack = exports.NetworkRack = function (_Rack2) {
  _inherits(NetworkRack, _Rack2);

  function NetworkRack() {
    var name = arguments.length <= 0 || arguments[0] === undefined ? 'Network Rack' : arguments[0];

    _classCallCheck(this, NetworkRack);

    var _this3 = _possibleConstructorReturn(this, Object.getPrototypeOf(NetworkRack).call(this, name));

    _this3.use(new _middleware.SerializeMiddleware());
    _this3.use(new _middleware.HttpMiddleware());
    _this3.use(new _middleware.ParseMiddleware());
    return _this3;
  }

  return NetworkRack;
}(Rack);