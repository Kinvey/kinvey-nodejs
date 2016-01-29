'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _auth = require('../auth');

var _auth2 = _interopRequireDefault(_auth);

var _model = require('./model');

var _model2 = _interopRequireDefault(_model);

var _query = require('../query');

var _query2 = _interopRequireDefault(_query);

var _errors = require('../errors');

var _enums = require('../enums');

var _assign = require('lodash/object/assign');

var _assign2 = _interopRequireDefault(_assign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var filesNamespace = process.env.KINVEY_FILE_NAMESPACE || 'blob';

var File = function (_Model) {
  _inherits(File, _Model);

  function File() {
    _classCallCheck(this, File);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(File).apply(this, arguments));
  }

  _createClass(File, [{
    key: 'find',
    value: function find(query) {
      var _this2 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (query && !(query instanceof _query2.default)) {
        return Promise.reject(new _errors.KinveyError('query argument must be an instance of Kinvey.Query'));
      }

      options = (0, _assign2.default)({
        dataPolicy: _enums.ReadPolicy.NetworkFirst,
        auth: _auth2.default.default
      }, options);
      options.method = _enums.HttpMethod.GET;
      options.pathname = '/' + filesNamespace + '/' + this.client.appId;
      options.query = query;
      options.flags = {};

      if (options.tls !== false) {
        options.flags.tls = true;
      }

      if (options.ttl) {
        options.flags.ttl_in_seconds = options.ttl;
      }

      var request = new Request(options);
      var promise = request.execute().then(function (response) {
        if (options.download) {
          var promises = response.map(function (file) {
            return _this2.downloadByUrl(file, options);
          });
          return Promise.all(promises);
        }

        return response;
      });

      return promise;
    }
  }, {
    key: 'download',
    value: function download(name) {
      var _this3 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      options = (0, _assign2.default)({
        dataPolicy: _enums.ReadPolicy.NetworkFirst,
        auth: _auth2.default.default
      }, options);
      options.method = _enums.HttpMethod.GET;
      options.pathname = '/' + filesNamespace + '/' + this.client.appId + '/' + name;
      options.flags = {};

      if (options.tls !== false) {
        options.flags.tls = true;
      }

      if (options.ttl) {
        options.flags.ttl_in_seconds = options.ttl;
      }

      var request = new Request(options);
      var promise = request.execute().then(function (response) {
        if (options.stream) {
          return response;
        }

        return _this3.downloadByUrl(response, options);
      });

      return promise;
    }
  }, {
    key: 'downloadByUrl',
    value: function downloadByUrl() {
      throw new _errors.KinveyError('Method not supported');
    }
  }, {
    key: 'stream',
    value: function stream(name) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      options.stream = true;
      return this.download(name, options);
    }
  }, {
    key: 'upload',
    value: function upload() {
      throw new _errors.KinveyError('Method not supported');
    }
  }, {
    key: 'destroy',
    value: function destroy(name) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      options = (0, _assign2.default)({
        dataPolicy: _enums.ReadPolicy.NetworkFirst,
        auth: _auth2.default.default
      }, options);
      options.method = _enums.HttpMethod.DELETE;
      options.pathname = '/' + filesNamespace + '/' + this.client.appId + '/' + name;

      var request = new Request(options);
      var promise = request.execute().catch(function (err) {
        if (options.silent && err.name === 'BLOB_NOT_FOUND') {
          return { count: 0 };
        }

        return Promise.reject(err);
      });

      return promise;
    }
  }]);

  return File;
}(_model2.default);

exports.default = File;