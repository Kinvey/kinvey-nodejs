'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _es6Promise = require('es6-promise');

var _es6Promise2 = _interopRequireDefault(_es6Promise);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Http = function () {
  function Http() {
    _classCallCheck(this, Http);
  }

  _createClass(Http, null, [{
    key: 'handle',
    value: function handle(request) {
      var promise = new _es6Promise2.default(function (resolve, reject) {
        var url = request.url;
        var method = request.method;
        var headers = request.headers;
        var body = request.body;
        var timeout = request.timeout;


        (0, _superagent2.default)(method, url).set(headers).send(body).timeout(timeout).end(function (error, response) {
          if (error) {
            response = error.response;
          }

          if (!response) {
            return reject(error);
          }

          return resolve({
            response: {
              statusCode: response.statusCode,
              headers: response.headers,
              data: response.body
            }
          });
        });
      });
      return promise;
    }
  }]);

  return Http;
}();

exports.default = Http;