'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _middleware = require('./middleware');

var _middleware2 = _interopRequireDefault(_middleware);

var _cache = require('../cache');

var _cache2 = _interopRequireDefault(_cache);

var _enums = require('../enums');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var defaultAdapters = [_enums.CacheAdapter.IndexedDB, _enums.CacheAdapter.WebSQL, _enums.CacheAdapter.LocalStorage, _enums.CacheAdapter.Memory];

var CacheMiddleware = function (_Middleware) {
  _inherits(CacheMiddleware, _Middleware);

  function CacheMiddleware() {
    var adapters = arguments.length <= 0 || arguments[0] === undefined ? defaultAdapters : arguments[0];

    _classCallCheck(this, CacheMiddleware);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(CacheMiddleware).call(this, 'Kinvey Cache Middleware'));

    _this.adapters = adapters;
    return _this;
  }

  _createClass(CacheMiddleware, [{
    key: 'handle',
    value: function handle(request) {
      var _this2 = this;

      return _get(Object.getPrototypeOf(CacheMiddleware.prototype), 'handle', this).call(this, request).then(function (matches) {
        var method = request.method;
        var query = request.query;
        var appId = matches.appId;
        var collection = matches.collection;
        var id = matches.id;
        var data = request.data;
        var cache = new _cache2.default(appId, _this2.adapters);
        var promise = undefined;

        if (method === _enums.HttpMethod.GET) {
          if (id) {
            if (id === '_count') {
              promise = cache.count(collection, query);
            } else if (id === '_group') {
              promise = cache.group(collection, data);
            } else {
              promise = cache.findById(collection, id);
            }
          } else {
            promise = cache.find(collection, query);
          }
        } else if (method === _enums.HttpMethod.POST || method === _enums.HttpMethod.PUT) {
          promise = cache.save(collection, data);
        } else if (method === _enums.HttpMethod.DELETE) {
          if (id) {
            promise = cache.removeById(collection, id);
          } else {
            promise = cache.remove(collection, query);
          }
        }

        return promise.then(function (result) {
          var statusCode = _enums.StatusCode.Ok;

          if (method === _enums.HttpMethod.POST) {
            statusCode = _enums.StatusCode.Created;
          }

          request.response = {
            statusCode: statusCode,
            headers: {},
            data: result
          };

          return request;
        });
      });
    }
  }]);

  return CacheMiddleware;
}(_middleware2.default);

exports.default = CacheMiddleware;