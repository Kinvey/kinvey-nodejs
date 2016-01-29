'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _rack = require('./rack');

var _rack2 = _interopRequireDefault(_rack);

var _serialize = require('./serialize');

var _serialize2 = _interopRequireDefault(_serialize);

var _http = require('./http');

var _http2 = _interopRequireDefault(_http);

var _parse = require('./parse');

var _parse2 = _interopRequireDefault(_parse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var sharedInstanceSymbol = Symbol();

var NetworkRack = function (_Rack) {
  _inherits(NetworkRack, _Rack);

  function NetworkRack() {
    var name = arguments.length <= 0 || arguments[0] === undefined ? 'Kinvey Network Rack' : arguments[0];

    _classCallCheck(this, NetworkRack);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(NetworkRack).call(this, name));

    _this.use(new _serialize2.default());
    _this.use(new _http2.default());
    _this.use(new _parse2.default());
    return _this;
  }

  _createClass(NetworkRack, null, [{
    key: 'sharedInstance',
    value: function sharedInstance() {
      var instance = NetworkRack[sharedInstanceSymbol];

      if (!instance) {
        instance = new NetworkRack();
        NetworkRack[sharedInstanceSymbol] = instance;
      }

      return instance;
    }
  }]);

  return NetworkRack;
}(_rack2.default);

exports.default = NetworkRack;