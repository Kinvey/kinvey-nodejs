'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TitaniumHttp = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _es6Promise = require('es6-promise');

var _es6Promise2 = _interopRequireDefault(_es6Promise);

var _regeneratorRuntime = require('regenerator-runtime');

var _regeneratorRuntime2 = _interopRequireDefault(_regeneratorRuntime);

var _parseHeaders = require('parse-headers');

var _parseHeaders2 = _interopRequireDefault(_parseHeaders);

var _isFunction = require('lodash/isFunction');

var _isFunction2 = _interopRequireDefault(_isFunction);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _es6Promise2.default(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _es6Promise2.default.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Titanium = global.Titanium;

var TitaniumHttp = exports.TitaniumHttp = function () {
  function TitaniumHttp() {
    _classCallCheck(this, TitaniumHttp);
  }

  _createClass(TitaniumHttp, [{
    key: 'handle',
    value: function () {
      var _ref = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee(request) {
        var promise;
        return _regeneratorRuntime2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                promise = new _es6Promise2.default(function (resolve, reject) {
                  var url = request.url;
                  var method = request.method;
                  var headers = request.headers;
                  var body = request.body;
                  var autoRedirect = request.autoRedirect;

                  var client = Titanium.Network.createHTTPClient();

                  client.open(method, url);

                  var keys = Object.keys(headers);
                  for (var i = 0, len = keys.length; i < len; i += 1) {
                    var key = keys[i];
                    client.setRequestHeader(key, headers[key]);
                  }

                  client.autoRedirect = autoRedirect || true;

                  if ((0, _isFunction2.default)(client.setTlsVersion) && Titanium.Network.TLS_VERSION_1_2) {
                    client.setTlsVersion(Titanium.Network.TLS_VERSION_1_2);
                  }

                  client.timeout = request.timeout || 0;

                  client.onload = function onLoad() {
                    resolve({
                      response: {
                        statusCode: this.status,
                        headers: (0, _parseHeaders2.default)(this.allResponseHeaders),
                        data: this.responseText
                      }
                    });
                  };

                  client.onerror = function onError(e) {
                    reject(e.error);
                  };

                  client.send(body);
                });
                return _context.abrupt('return', promise);

              case 2:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function handle(_x) {
        return _ref.apply(this, arguments);
      }

      return handle;
    }()
  }], [{
    key: 'isSupported',
    value: function isSupported() {
      return typeof Titanium !== 'undefined' && typeof Titanium.Network !== 'undefined';
    }
  }]);

  return TitaniumHttp;
}();