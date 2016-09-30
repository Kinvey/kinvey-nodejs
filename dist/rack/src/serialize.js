'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _middleware = require('./middleware');

var _middleware2 = _interopRequireDefault(_middleware);

var _es6Promise = require('es6-promise');

var _es6Promise2 = _interopRequireDefault(_es6Promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SerializeMiddleware = function (_Middleware) {
  _inherits(SerializeMiddleware, _Middleware);

  function SerializeMiddleware() {
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Serialize Middleware';

    _classCallCheck(this, SerializeMiddleware);

    return _possibleConstructorReturn(this, (SerializeMiddleware.__proto__ || Object.getPrototypeOf(SerializeMiddleware)).call(this, name));
  }

  _createClass(SerializeMiddleware, [{
    key: 'handle',
    value: function handle(request) {
      if (request && request.body) {
        var contentType = request.headers['content-type'] || request.headers['Content-Type'];

        if (contentType) {
          if (contentType.indexOf('application/json') === 0) {
            request.body = JSON.stringify(request.body);
          } else if (contentType.indexOf('application/x-www-form-urlencoded') === 0) {
            var body = request.body;
            var keys = Object.keys(body);
            var str = [];

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = keys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var key = _step.value;

                str.push(global.encodeURIComponent(key) + '=' + global.encodeURIComponent(body[key]));
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }

            request.body = str.join('&');
          }
        }
      }

      return _es6Promise2.default.resolve({ request: request });
    }
  }]);

  return SerializeMiddleware;
}(_middleware2.default);

exports.default = SerializeMiddleware;