'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HttpMiddleware = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _middleware = require('kinvey-javascript-sdk-core/dist/rack/middleware');

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var HttpMiddleware = exports.HttpMiddleware = function (_KinveyMiddleware) {
  _inherits(HttpMiddleware, _KinveyMiddleware);

  function HttpMiddleware() {
    var name = arguments.length <= 0 || arguments[0] === undefined ? 'Kinvey Node Http Middleware' : arguments[0];

    _classCallCheck(this, HttpMiddleware);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(HttpMiddleware).call(this, name));
  }

  _createClass(HttpMiddleware, [{
    key: 'handle',
    value: function handle(request) {
      return _get(Object.getPrototypeOf(HttpMiddleware.prototype), 'handle', this).call(this, request).then(function () {
        var promise = new Promise(function (resolve, reject) {
          var url = request.url;
          var method = request.method;
          var headers = request.headers;
          var body = request.body;
          var followRedirect = request.followRedirect;


          (0, _request2.default)({
            url: url,
            method: method,
            headers: headers.toJSON(),
            body: body,
            followRedirect: followRedirect
          }, function (error, response, data) {
            if (error) {
              if (error.code === 'ENOTFOUND') {
                return reject(new Error('It looks like you do not have a network connection. ' + 'Please check that you are connected to a network and try again.'));
              }

              return reject(error);
            }

            request.response = {
              statusCode: response.statusCode,
              headers: response.headers,
              data: data
            };

            return resolve(request);
          });
        });
        return promise;
      });
    }
  }]);

  return HttpMiddleware;
}(_middleware.KinveyMiddleware);