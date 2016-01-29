'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _datastore = require('./datastore');

var _datastore2 = _interopRequireDefault(_datastore);

var _client = require('../client');

var _client2 = _interopRequireDefault(_client);

var _networkRequest = require('../requests/networkRequest');

var _networkRequest2 = _interopRequireDefault(_networkRequest);

var _errors = require('../errors');

var _enums = require('../enums');

var _auth = require('../auth');

var _auth2 = _interopRequireDefault(_auth);

var _file = require('../models/file');

var _file2 = _interopRequireDefault(_file);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var _assign = require('lodash/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _isObject = require('lodash/lang/isObject');

var _isObject2 = _interopRequireDefault(_isObject);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var filesNamespace = process.env.KINVEY_FILES_NAMESPACE || 'blob';

var Files = function (_DataStore) {
  _inherits(Files, _DataStore);

  function Files() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Files);

    options.model = _file2.default;
    return _possibleConstructorReturn(this, Object.getPrototypeOf(Files).call(this, 'files', options));
  }

  _createClass(Files, [{
    key: 'getPathname',
    value: function getPathname(client) {
      client = client || this.client;
      return '/' + filesNamespace + '/' + this.client.appId;
    }
  }, {
    key: 'find',
    value: function find(query) {
      var _this2 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      options = (0, _assign2.default)({
        download: false,
        tls: false,
        ttl: undefined,
        flags: {}
      }, options);
      options.dataPolicy = _enums.DataPolicy.NetworkOnly;

      if (options.tls !== false) {
        options.flags.tls = true;
      }

      if (options.ttl) {
        options.flags.ttl_in_seconds = options.ttl;
      }

      var promise = _get(Object.getPrototypeOf(Files.prototype), 'find', this).call(this, query, options).then(function (files) {
        if (options.download) {
          var promises = files.map(function (file) {
            return _this2.downloadByUrl(file, options);
          });

          return Promise.all(promises);
        }

        return files;
      });
      return promise;
    }
  }, {
    key: 'download',
    value: function download(name) {
      var _this3 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      options = (0, _assign2.default)({
        auth: this.auth,
        client: this.client,
        flags: {}
      }, options);

      if (options.tls !== false) {
        options.flags.tls = true;
      }

      if (options.ttl) {
        options.flags.ttl_in_seconds = options.ttl;
      }

      var request = new _networkRequest2.default({
        dataPolicy: _enums.DataPolicy.NetworkOnly,
        auth: options.auth,
        client: options.client,
        method: _enums.HttpMethod.GET,
        pathname: this.getPathname(options.client) + '/' + name,
        flags: options.flags
      });
      var promise = request.execute().then(function (response) {
        if (options.stream) {
          _log2.default.info('Returning the file only because of the stream flag.');
          return new _this3.model(response.data, options);
        }

        return _this3.downloadByUrl(response.data, options);
      });

      return promise;
    }
  }, {
    key: 'downloadByUrl',
    value: function downloadByUrl(metadataOrUrl) {
      var metadata = metadataOrUrl;

      if (!(0, _isObject2.default)(metadataOrUrl)) {
        metadata = {
          _downloadURL: metadataOrUrl
        };
      }

      var sharedClient = _client2.default.sharedInstance();
      var client = new _client2.default({
        appId: sharedClient.appId,
        appSecret: sharedClient.appSecret,
        masterSecret: sharedClient.masterSecret,
        encryptionKey: sharedClient.encryptionKey,
        apiUrl: metadata._downloadURL,
        allowHttp: true
      });

      var request = new _networkRequest2.default({
        method: _enums.HttpMethod.GET,
        pathname: _url2.default.parse(metadata._downloadURL).path,
        client: client
      });
      request.setHeader('Accept', metadata.mimeType || 'application-octet-stream');
      request.removeHeader('Content-Type');
      request.removeHeader('X-Kinvey-Api-Version');
      request.setResponseType = _enums.ResponseType.Blob;

      var promise = request.execute().then(function (data) {
        metadata._data = data;
        return metadata;
      }).catch(function (err) {
        throw new _errors.KinveyError('The file could not be downloaded from the provided url.', err);
      });

      return promise;
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
    value: function upload(file) {
      var _this4 = this;

      var metadata = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      metadata = metadata || {};
      metadata._filename = metadata._filename || file._filename || file.name;
      metadata.size = metadata.size || file.size || file.length;
      metadata.mimeType = metadata.mimeType || file.mimeType || file.type || 'application/octet-stream';

      options = (0, _assign2.default)({
        auth: this.auth,
        client: this.client,
        public: false,
        contentType: metadata.mimeType
      }, options);

      if (options.public) {
        metadata._public = true;
      }

      var request = new _networkRequest2.default({
        dataPolicy: _enums.DataPolicy.NetworkOnly,
        auth: options.auth,
        client: options.client,
        data: metadata
      });

      if (metadata._id) {
        request.method = _enums.HttpMethod.PUT;
        request.pathname = this.getPathname(options.client) + '/' + metadata._id;
      } else {
        request.method = _enums.HttpMethod.POST;
        request.pathname = this.getPathname(options.client);
      }

      var promise = request.execute().then(function (response) {
        var uploadUrl = response.data._uploadURL;
        var uploadUrlParts = _url2.default.parse(uploadUrl);
        var headers = response.data._requiredHeaders || {};
        headers['Content-Type'] = metadata.mimeType;
        headers['Content-Length'] = metadata.size;

        delete response.data._expiresAt;
        delete response.data._requiredHeaders;
        delete response.data._uploadURL;

        var client = new _client2.default({
          appId: options.client.appId,
          appSecret: options.client.appSecret,
          masterSecret: options.client.masterSecret,
          encryptionKey: options.client.encryptionKey,
          apiUrl: uploadUrl,
          allowHttp: true
        });

        var uploadRequest = new _networkRequest2.default({
          dataPolicy: _enums.DataPolicy.NetworkOnly,
          auth: _auth2.default.none,
          method: _enums.HttpMethod.PUT,
          pathname: uploadUrlParts.pathname,
          flags: uploadUrlParts.query,
          data: file,
          client: client
        });
        uploadRequest.clearHeaders();
        uploadRequest.addHeaders(headers);

        return uploadRequest.execute().then(function () {
          response.data._data = file;
          return new _this4.model(response.data, options);
        });
      });

      return promise;
    }
  }, {
    key: 'delete',
    value: function _delete(name) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var promise = _get(Object.getPrototypeOf(Files.prototype), 'delete', this).call(this, name, options).catch(function (err) {
        if (options.silent && err instanceof _errors.BlobNotFoundError) {
          return { count: 0 };
        }

        throw err;
      });

      return promise;
    }
  }]);

  return Files;
}(_datastore2.default);

exports.default = Files;