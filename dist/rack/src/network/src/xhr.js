'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.XHR = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _es6Promise = require('es6-promise');

var _es6Promise2 = _interopRequireDefault(_es6Promise);

var _parseHeaders = require('parse-headers');

var _parseHeaders2 = _interopRequireDefault(_parseHeaders);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var XHR = exports.XHR = function () {
  function XHR() {
    _classCallCheck(this, XHR);
  }

  _createClass(XHR, [{
    key: 'handle',
    value: function handle(request) {
      var promise = new _es6Promise2.default(function (resolve) {
        var url = request.url;
        var method = request.method;
        var headers = request.headers;
        var body = request.body;

        var xhr = new XMLHttpRequest();
        xhr.open(method, url);

        var names = Object.keys(headers);
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = names[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var name = _step.value;

            xhr.setRequestHeader(name, headers[name]);
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

        xhr.onload = xhr.ontimeout = xhr.onabort = xhr.onerror = function () {
          var statusCode = xhr.status;

          var data = xhr.response || null;
          if (xhr.response) {
            data = xhr.responseText || null;
          }

          return resolve({
            response: {
              statusCode: statusCode,
              headers: (0, _parseHeaders2.default)(xhr.getAllResponseHeaders()),
              data: data
            }
          });
        };

        xhr.send(body);
      });
      return promise;
    }
  }], [{
    key: 'isSupported',
    value: function isSupported() {
      return typeof window !== 'undefined' && typeof window.XMLHttpRequest !== 'undefined';
    }
  }]);

  return XHR;
}();