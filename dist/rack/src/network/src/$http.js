'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.$Http = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _regeneratorRuntime = require('regenerator-runtime');

var _regeneratorRuntime2 = _interopRequireDefault(_regeneratorRuntime);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var angular = void 0;
var $http = void 0;

if (typeof window !== 'undefined' && typeof global.angular !== 'undefined') {
  angular = global.angular;
  var $injector = angular.injector(['ng']);
  $http = $injector.get('$http');
}

var $Http = exports.$Http = function () {
  function $Http() {
    _classCallCheck(this, $Http);
  }

  _createClass($Http, [{
    key: 'handle',
    value: function () {
      var _ref = _asyncToGenerator(_regeneratorRuntime2.default.mark(function _callee(request) {
        var url, method, headers, body, response;
        return _regeneratorRuntime2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                url = request.url;
                method = request.method;
                headers = request.headers;
                body = request.body;
                _context.prev = 4;
                _context.next = 7;
                return $http({
                  url: url,
                  method: method,
                  headers: headers,
                  data: body
                });

              case 7:
                response = _context.sent;
                return _context.abrupt('return', {
                  response: {
                    statusCode: response.status,
                    headers: response.headers(),
                    data: response.data
                  }
                });

              case 11:
                _context.prev = 11;
                _context.t0 = _context['catch'](4);
                return _context.abrupt('return', {
                  response: {
                    statusCode: _context.t0.status,
                    headers: _context.t0.headers(),
                    data: _context.t0.data
                  }
                });

              case 14:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[4, 11]]);
      }));

      function handle(_x) {
        return _ref.apply(this, arguments);
      }

      return handle;
    }()
  }], [{
    key: 'isSupported',
    value: function isSupported() {
      return !!angular;
    }
  }]);

  return $Http;
}();