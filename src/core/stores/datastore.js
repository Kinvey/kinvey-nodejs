'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _aggregation = require('../aggregation');

var _aggregation2 = _interopRequireDefault(_aggregation);

var _deltaSetRequest = require('../requests/deltaSetRequest');

var _deltaSetRequest2 = _interopRequireDefault(_deltaSetRequest);

var _networkRequest = require('../requests/networkRequest');

var _networkRequest2 = _interopRequireDefault(_networkRequest);

var _localRequest = require('../requests/localRequest');

var _localRequest2 = _interopRequireDefault(_localRequest);

var _response = require('../requests/response');

var _response2 = _interopRequireDefault(_response);

var _enums = require('../enums');

var _errors = require('../errors');

var _client = require('../client');

var _client2 = _interopRequireDefault(_client);

var _query = require('../query');

var _query2 = _interopRequireDefault(_query);

var _auth = require('../auth');

var _auth2 = _interopRequireDefault(_auth);

var _assign = require('lodash/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _forEach = require('lodash/collection/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _clone = require('lodash/lang/clone');

var _clone2 = _interopRequireDefault(_clone);

var _map = require('lodash/collection/map');

var _map2 = _interopRequireDefault(_map);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var _find = require('lodash/collection/find');

var _find2 = _interopRequireDefault(_find);

var _isArray = require('lodash/lang/isArray');

var _isArray2 = _interopRequireDefault(_isArray);

var _isString = require('lodash/lang/isString');

var _isString2 = _interopRequireDefault(_isString);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var appdataNamespace = process.env.KINVEY_DATASTORE_NAMESPACE || 'appdata';
var syncCollectionName = process.env.KINVEY_SYNC_COLLECTION_NAME || 'sync';
var localIdPrefix = process.env.KINVEY_ID_PREFIX || 'local_';
var dataStoresMap = new Map();

var DataStore = function () {
  function DataStore(name) {
    _classCallCheck(this, DataStore);

    if (name && !(0, _isString2.default)(name)) {
      throw new _errors.KinveyError('Name must be a string.');
    }

    this.name = name;

    this.readPolicy = _enums.ReadPolicy.NetworkOnly;

    this.writePolicy = _enums.WritePolicy.NetworkOnly;

    this.client = _client2.default.sharedInstance();

    this.ttl = undefined;
  }

  _createClass(DataStore, [{
    key: '_getPathname',
    value: function _getPathname(client) {
      client = client || this.client;
      var pathname = '/' + appdataNamespace + '/' + client.appKey;

      if (this.name) {
        pathname = pathname + '/' + this.name;
      }

      return pathname;
    }
  }, {
    key: '_getSyncPathname',
    value: function _getSyncPathname(client) {
      if (!this.name) {
        throw new Error('Unable to get a sync pathname for a collection with no name.');
      }

      client = client || this.client;
      return '/' + appdataNamespace + '/' + client.appKey + '/' + syncCollectionName + '/' + this.name;
    }
  }, {
    key: 'find',
    value: function find(query) {
      var _this = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      _log2.default.debug('Retrieving the entities in the ' + this.name + ' collection.', query);

      options = (0, _assign2.default)({
        properties: null,
        timeout: undefined,
        ttl: this.ttl,
        readPolicy: this.readPolicy,
        handler: function handler() {}
      }, options);

      if (query && !(query instanceof _query2.default)) {
        return Promise.reject(new _errors.KinveyError('Invalid query. It must be an instance of the Kinvey.Query class.'));
      }

      var promise = Promise.resolve().then(function () {
        var request = undefined;
        var requestOptions = {
          method: _enums.HttpMethod.GET,
          client: _this.client,
          properties: options.properties,
          auth: _auth2.default.default,
          pathname: _this._getPathname(_this.client),
          query: query,
          timeout: options.timeout
        };

        switch (options.readPolicy) {
          case _enums.ReadPolicy.LocalOnly:
            request = new _localRequest2.default(requestOptions);
            break;
          case _enums.ReadPolicy.NetworkOnly:
            request = new _networkRequest2.default(requestOptions);
            break;
          case _enums.ReadPolicy.LocalFirst:
          default:
            request = new _deltaSetRequest2.default(requestOptions);
        }

        return request.execute();
      }).then(function (response) {
        if (response.isSuccess()) {
          return response.data;
        }

        throw response.error;
      });

      promise.then(function (response) {
        _log2.default.info('Retrieved the entities in the ' + _this.name + ' collection.', response);
      }).catch(function (err) {
        _log2.default.error('Failed to retrieve the entities in the ' + _this.name + ' collection.', err);
      });

      return promise;
    }
  }, {
    key: 'group',
    value: function group(aggregation) {
      var _this2 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      _log2.default.debug('Grouping the entities in the ' + this.name + ' collection.', aggregation, options);

      options = (0, _assign2.default)({
        properties: null,
        timeout: undefined,
        ttl: this.ttl,
        readPolicy: this.readPolicy,
        handler: function handler() {}
      }, options);

      if (!(aggregation instanceof _aggregation2.default)) {
        return Promise.reject(new _errors.KinveyError('Invalid aggregation. ' + 'It must be an instance of the Kinvey.Aggregation class.'));
      }

      var promise = Promise.resolve().then(function () {
        var request = undefined;
        var requestOptions = {
          method: _enums.HttpMethod.GET,
          client: _this2.client,
          properties: options.properties,
          auth: _auth2.default.default,
          pathname: _this2._getPathname(_this2.client) + '/_group',
          data: aggregation.toJSON(),
          timeout: options.timeout
        };

        switch (options.readPolicy) {
          case _enums.ReadPolicy.LocalOnly:
            request = new _localRequest2.default(requestOptions);
            break;
          case _enums.ReadPolicy.NetworkOnly:
            request = new _networkRequest2.default(requestOptions);
            break;
          case _enums.ReadPolicy.LocalFirst:
          default:
            request = new _deltaSetRequest2.default(requestOptions);
        }

        return request.execute();
      }).then(function (response) {
        if (response.isSuccess()) {
          return response.data;
        }

        throw response.error;
      });

      promise.then(function (response) {
        _log2.default.info('Grouped the entities in the ' + _this2.name + ' collection.', response);
      }).catch(function (err) {
        _log2.default.error('Failed to group the entities in the ' + _this2.name + ' collection.', err);
      });

      return promise;
    }
  }, {
    key: 'count',
    value: function count(query) {
      var _this3 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      _log2.default.debug('Counting the number of entities in the ' + this.name + ' collection.', query);

      options = (0, _assign2.default)({
        properties: null,
        timeout: undefined,
        ttl: this.ttl,
        readPolicy: this.readPolicy,
        handler: function handler() {}
      }, options);

      if (query && !(query instanceof _query2.default)) {
        return Promise.reject(new _errors.KinveyError('Invalid query. It must be an instance of the Kinvey.Query class.'));
      }

      var promise = Promise.resolve().then(function () {
        var request = undefined;
        var requestOptions = {
          method: _enums.HttpMethod.GET,
          client: _this3.client,
          properties: options.properties,
          auth: _auth2.default.default,
          pathname: _this3._getPathname(_this3.client) + '/_count',
          query: query,
          timeout: options.timeout
        };

        switch (options.readPolicy) {
          case _enums.ReadPolicy.LocalOnly:
            request = new _localRequest2.default(requestOptions);
            break;
          case _enums.ReadPolicy.NetworkOnly:
            request = new _networkRequest2.default(requestOptions);
            break;
          case _enums.ReadPolicy.LocalFirst:
          default:
            request = new _deltaSetRequest2.default(requestOptions);
        }

        return request.execute();
      }).then(function (response) {
        if (response.isSuccess()) {
          return response.data;
        }

        throw response.error;
      });

      promise.then(function (response) {
        _log2.default.info('Counted the number of entities in the ' + _this3.name + ' collection.', response);
      }).catch(function (err) {
        _log2.default.error('Failed to count the number of entities in the ' + _this3.name + ' collection.', err);
      });

      return promise;
    }
  }, {
    key: 'findById',
    value: function findById(id) {
      var _this4 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (!id) {
        _log2.default.warn('No id was provided to retrieve a entity.', id);
        return Promise.resolve(null);
      }

      _log2.default.debug('Retrieving a entity in the ' + this.name + ' collection with id = ' + id + '.');

      options = (0, _assign2.default)({
        properties: null,
        timeout: undefined,
        ttl: this.ttl,
        readPolicy: this.readPolicy,
        handler: function handler() {}
      }, options);

      var promise = Promise.resolve().then(function () {
        var request = undefined;
        var requestOptions = {
          method: _enums.HttpMethod.GET,
          client: _this4.client,
          properties: options.properties,
          auth: _auth2.default.default,
          pathname: _this4._getPathname(_this4.client) + '/' + id,
          timeout: options.timeout
        };

        switch (options.readPolicy) {
          case _enums.ReadPolicy.LocalOnly:
            request = new _localRequest2.default(requestOptions);
            break;
          case _enums.ReadPolicy.NetworkOnly:
            request = new _networkRequest2.default(requestOptions);
            break;
          case _enums.ReadPolicy.LocalFirst:
          default:
            request = new _deltaSetRequest2.default(requestOptions);
        }

        return request.execute();
      }).then(function (response) {
        if (response.isSuccess()) {
          return (0, _isArray2.default)(response.data) && response.data.length === 1 ? response.data[0] : response.data;
        }

        throw response.error;
      });

      promise.then(function (response) {
        _log2.default.info('Retrieved the entity in the ' + _this4.name + ' collection with id = ' + id + '.', response);
      }).catch(function (err) {
        _log2.default.error('Failed to retrieve the entity in the ' + _this4.name + ' collection with id = ' + id + '.', err);
      });

      return promise;
    }
  }, {
    key: 'save',
    value: function save(doc) {
      var _this5 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (!doc) {
        _log2.default.warn('No doc was provided to be saved.', doc);
        return Promise.resolve(null);
      }

      if (doc._id) {
        _log2.default.warn('Doc argument contains an _id. Calling update instead.', doc);
        return this.update(doc, options);
      }

      _log2.default.debug('Saving the entity(s) to the ' + this.name + ' collection.', doc);

      options = (0, _assign2.default)({
        properties: null,
        timeout: undefined,
        writePolicy: this.writePolicy,
        skipSync: false,
        handler: function handler() {}
      }, options);

      var promise = Promise.resolve().then(function () {
        var request = undefined;
        var requestOptions = {
          method: _enums.HttpMethod.POST,
          client: _this5.client,
          properties: options.properties,
          auth: _auth2.default.default,
          pathname: _this5._getPathname(_this5.client),
          data: doc,
          timeout: options.timeout
        };

        switch (options.writePolicy) {
          case _enums.WritePolicy.NetworkOnly:
            request = new _networkRequest2.default(requestOptions);
            break;
          case _enums.WritePolicy.LocalOnly:
          case _enums.WritePolicy.LocalFirst:
          default:
            request = new _localRequest2.default(requestOptions);
        }

        return request.execute();
      }).then(function (response) {
        if (response && response.isSuccess()) {
          if (!options.skipSync && (options.writePolicy === _enums.WritePolicy.LocalOnly || options.writePolicy === _enums.WritePolicy.LocalFirst)) {
            return _this5._updateSync(response.data, options).then(function () {
              return response;
            });
          }
        }

        return response;
      }).then(function (response) {
        if (response && response.isSuccess()) {
          if (!options.skipSync && options.writePolicy === _enums.WritePolicy.LocalFirst) {
            return _this5.push(options).then(function (result) {
              var singular = false;
              var data = response.data;

              if (!(0, _isArray2.default)(data)) {
                singular = true;
                data = [data];
              }

              data = (0, _map2.default)(data, function (doc) {
                var syncResult = (0, _find2.default)(result.success, function (syncResult) {
                  return syncResult._id === doc._id;
                });

                if (syncResult) {
                  return syncResult.doc;
                }
              });

              if (singular) {
                response.data = data[0];
              } else {
                response.data = data;
              }

              return response;
            });
          }
        }

        return response;
      }).then(function (response) {
        if (response.isSuccess()) {
          return response.data;
        }

        throw response.error;
      });

      promise.then(function (response) {
        _log2.default.info('Saved the entity(s) to the ' + _this5.name + ' collection.', response);
      }).catch(function (err) {
        _log2.default.error('Failed to save the entity(s) to the ' + _this5.name + ' collection.', err);
      });

      return promise;
    }
  }, {
    key: 'update',
    value: function update(doc) {
      var _this6 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (!doc) {
        _log2.default.warn('No doc was provided to be saved.', doc);
        return Promise.resolve(null);
      }

      if (!doc._id) {
        _log2.default.warn('Doc argument does not contain an _id. Calling save instead.', doc);
        return this.save(doc, options);
      }

      _log2.default.debug('Updating the entity(s) to the ' + this.name + ' collection.', doc);

      options = (0, _assign2.default)({
        properties: null,
        timeout: undefined,
        writePolicy: this.writePolicy,
        skipSync: false,
        handler: function handler() {}
      }, options);

      var promise = Promise.resolve().then(function () {
        var request = undefined;
        var requestOptions = {
          method: _enums.HttpMethod.PUT,
          client: _this6.client,
          properties: options.properties,
          auth: _auth2.default.default,
          pathname: _this6._getPathname(_this6.client) + '/' + doc._id,
          data: doc,
          timeout: options.timeout
        };

        switch (options.writePolicy) {
          case _enums.WritePolicy.NetworkOnly:
            request = new _networkRequest2.default(requestOptions);
            break;
          case _enums.WritePolicy.LocalOnly:
          case _enums.WritePolicy.LocalFirst:
          default:
            request = new _localRequest2.default(requestOptions);
        }

        return request.execute();
      }).then(function (response) {
        if (response && response.isSuccess()) {
          if (!options.skipSync && (options.writePolicy === _enums.WritePolicy.LocalOnly || options.writePolicy === _enums.WritePolicy.LocalFirst)) {
            return _this6._updateSync(response.data, options).then(function () {
              return response;
            });
          }
        }

        return response;
      }).then(function (response) {
        if (response && response.isSuccess()) {
          if (!options.skipSync && options.writePolicy === _enums.WritePolicy.LocalFirst) {
            return _this6.push(options).then(function (result) {
              var singular = false;
              var data = response.data;

              if (!(0, _isArray2.default)(data)) {
                singular = true;
                data = [data];
              }

              data = (0, _map2.default)(data, function (doc) {
                var syncResult = (0, _find2.default)(result.success, function (syncResult) {
                  return syncResult._id === doc._id;
                });

                if (syncResult) {
                  return syncResult.doc;
                }
              });

              if (singular) {
                response.data = data[0];
              } else {
                response.data = data;
              }

              return response;
            });
          }
        }

        return response;
      }).then(function (response) {
        if (response.isSuccess()) {
          return response.data;
        }

        throw response.error;
      });

      promise.then(function (response) {
        _log2.default.info('Updated the entity(s) to the ' + _this6.name + ' collection.', response);
      }).catch(function (err) {
        _log2.default.error('Failed to update the entity(s) to the ' + _this6.name + ' collection.', err);
      });

      return promise;
    }
  }, {
    key: 'remove',
    value: function remove(query) {
      var _this7 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      _log2.default.debug('Removing the models in the ' + this.name + ' collection.', query);

      options = (0, _assign2.default)({
        properties: null,
        timeout: undefined,
        writePolicy: this.writePolicy,
        skipSync: false,
        handler: function handler() {}
      }, options);

      if (query && !(query instanceof _query2.default)) {
        return Promise.reject(new _errors.KinveyError('Invalid query. It must be an instance of the Kinvey.Query class.'));
      }

      var promise = Promise.resolve().then(function () {
        var request = undefined;
        var requestOptions = {
          method: _enums.HttpMethod.DELETE,
          client: _this7.client,
          properties: options.properties,
          auth: _auth2.default.default,
          pathname: _this7._getPathname(_this7.client),
          query: query,
          timeout: options.timeout
        };

        switch (options.writePolicy) {
          case _enums.WritePolicy.NetworkOnly:
            request = new _networkRequest2.default(requestOptions);
            break;
          case _enums.WritePolicy.LocalOnly:
          case _enums.WritePolicy.LocalFirst:
          default:
            request = new _localRequest2.default(requestOptions);
        }

        return request.execute();
      }).then(function (response) {
        if (response && response.isSuccess()) {
          if (!options.skipSync && (options.writePolicy === _enums.WritePolicy.LocalOnly || options.writePolicy === _enums.WritePolicy.LocalFirst)) {
            return _this7._updateSync(response.data.entities, options).then(function () {
              return response;
            });
          }
        }

        return response;
      }).then(function (response) {
        if (response && response.isSuccess()) {
          if (!options.skipSync && options.writePolicy === _enums.WritePolicy.LocalFirst) {
            return _this7.push(options).then(function () {
              return response;
            });
          }
        }

        return response;
      }).then(function (response) {
        if (response.isSuccess()) {
          return response.data;
        }

        throw response.error;
      });

      promise.then(function (response) {
        _log2.default.info('Removed the models in the ' + _this7.name + ' collection.', response);
      }).catch(function (err) {
        _log2.default.error('Failed to remove the models in the ' + _this7.name + ' collection.', err);
      });

      return promise;
    }
  }, {
    key: 'removeById',
    value: function removeById(id) {
      var _this8 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (!id) {
        _log2.default.warn('No id was provided to be removed.', id);
        return Promise.resolve(null);
      }

      _log2.default.debug('Removing a model in the ' + this.name + ' collection with id = ' + id + '.');

      options = (0, _assign2.default)({
        properties: null,
        timeout: undefined,
        writePolicy: this.writePolicy,
        skipSync: false,
        handler: function handler() {}
      }, options);

      var promise = Promise.resolve().then(function () {
        var request = undefined;
        var requestOptions = {
          method: _enums.HttpMethod.DELETE,
          client: _this8.client,
          properties: options.properties,
          auth: _auth2.default.default,
          pathname: _this8._getPathname(_this8.client) + '/' + id,
          timeout: options.timeout
        };

        switch (options.writePolicy) {
          case _enums.WritePolicy.NetworkOnly:
            request = new _networkRequest2.default(requestOptions);
            break;
          case _enums.WritePolicy.LocalOnly:
          case _enums.WritePolicy.LocalFirst:
          default:
            request = new _localRequest2.default(requestOptions);
        }

        return request.execute();
      }).then(function (response) {
        if (response && response.isSuccess()) {
          if (!options.skipSync && (options.writePolicy === _enums.WritePolicy.LocalOnly || options.writePolicy === _enums.WritePolicy.LocalFirst)) {
            return _this8._updateSync(response.data.entities, options).then(function () {
              return response;
            });
          }
        }

        return response;
      }).then(function (response) {
        if (response && response.isSuccess()) {
          if (!options.skipSync && options.writePolicy === _enums.WritePolicy.LocalFirst) {
            return _this8.push(options).then(function () {
              return response;
            });
          }
        }

        return response;
      }).then(function (response) {
        if (response.isSuccess()) {
          return response.data;
        }

        throw response.error;
      });

      promise.then(function (response) {
        _log2.default.info('Removed the model in the ' + _this8.name + ' collection with id = ' + id + '.', response);
      }).catch(function (err) {
        _log2.default.error('Failed to remove the model in the ' + _this8.name + ' collection with id = ' + id + '.', err);
      });

      return promise;
    }
  }, {
    key: 'push',
    value: function push() {
      var _this9 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options = (0, _assign2.default)({
        properties: null,
        timeout: undefined,
        handler: function handler() {}
      }, options);

      var promise = Promise.resolve().then(function () {
        var request = new _localRequest2.default({
          method: _enums.HttpMethod.GET,
          client: _this9.client,
          properties: options.properties,
          pathname: _this9._getSyncPathname(_this9.client),
          timeout: options.timeout
        });
        return request.execute();
      }).then(function (response) {
        if (response && response.isSuccess()) {
          var _ret = function () {
            var localStore = DataStore.getInstance(_this9.name, _enums.StoreType.Local);
            var shouldSave = [];
            var shouldRemove = [];
            var docs = response.data.docs;
            var ids = Object.keys(docs);
            var size = response.data.size;

            var promises = (0, _map2.default)(ids, function (id) {
              var metadata = docs[id];
              var requestOptions = (0, _clone2.default)(metadata);
              return localStore.get(id, requestOptions).then(function (doc) {
                shouldSave.push(doc);
                return doc;
              }).catch(function (err) {
                if (err instanceof _errors.NotFoundError) {
                  shouldRemove.push(id);
                  return null;
                }

                throw err;
              });
            });

            return {
              v: Promise.all(promises).then(function () {
                var networkStore = DataStore.getInstance(_this9.name, _enums.StoreType.Network);
                var saved = (0, _map2.default)(shouldSave, function (doc) {
                  var metadata = docs[doc._id];
                  var requestOptions = (0, _clone2.default)(metadata);
                  requestOptions.skipSync = true;

                  if (doc._id.indexOf(localIdPrefix) === 0) {
                    var _ret2 = function () {
                      var prevId = doc._id;
                      doc._id = undefined;

                      return {
                        v: networkStore.save(doc, requestOptions).then(function (doc) {
                          return localStore.save(doc, requestOptions);
                        }).then(function (doc) {
                          return localStore.remove(prevId, requestOptions).then(function (result) {
                            if (result.count === 1) {
                              size = size - 1;
                              delete docs[prevId];
                              return {
                                _id: prevId,
                                doc: doc
                              };
                            }

                            return result;
                          });
                        }).catch(function (err) {
                          doc._id = prevId;
                          return {
                            _id: doc._id,
                            error: err
                          };
                        })
                      };
                    }();

                    if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
                  }

                  return networkStore.update(doc, requestOptions).then(function (doc) {
                    size = size - 1;
                    delete docs[doc._id];
                    return {
                      _id: doc._id,
                      doc: doc
                    };
                  }).catch(function (err) {
                    return {
                      _id: doc._id,
                      error: err
                    };
                  });
                });

                var removed = (0, _map2.default)(shouldRemove, function (id) {
                  var metadata = docs[id];
                  var requestOptions = (0, _clone2.default)(metadata);

                  return networkStore.remove(id, requestOptions).then(function (result) {
                    if (result.count === 1) {
                      size = size - 1;
                      delete docs[id];
                      return {
                        _id: id
                      };
                    }

                    return result;
                  }).catch(function (err) {
                    return {
                      _id: id,
                      error: err
                    };
                  });
                });

                return Promise.all([Promise.all(saved), Promise.all(removed)]);
              }).then(function (responses) {
                var savedResponses = responses[0];
                var removedResponses = responses[1];
                var result = {
                  collection: _this9.name,
                  success: [],
                  error: []
                };

                (0, _forEach2.default)(savedResponses, function (savedResponse) {
                  if (savedResponse.error) {
                    result.error.push(savedResponse);
                  } else {
                    result.success.push(savedResponse);
                  }
                });

                (0, _forEach2.default)(removedResponses, function (removedResponse) {
                  if (removedResponse.error) {
                    result.error.push(removedResponse);
                  } else {
                    result.success.push(removedResponse);
                  }
                });

                return result;
              }).then(function (result) {
                var data = response.data;
                data.size = size;
                data.docs = docs;
                var request = new _localRequest2.default({
                  method: _enums.HttpMethod.PUT,
                  client: _this9.client,
                  properties: options.properties,
                  pathname: _this9._getSyncPathname(_this9.client),
                  data: data,
                  timeout: options.timeout
                });
                return request.execute().then(function () {
                  return result;
                });
              })
            };
          }();

          if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        }

        return response;
      }).catch(function (err) {
        if (err instanceof _errors.NotFoundError) {
          return {
            collection: _this9.name,
            success: [],
            error: []
          };
        }

        throw err;
      });

      return promise;
    }
  }, {
    key: 'pull',
    value: function pull(query) {
      var _this10 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var promise = this.syncCount(null, options).then(function (count) {
        if (count > 0) {
          throw new Error('Unable to pull data. You must push the pending sync items first.', 'Call store.push() to push the pending sync items before you pull new data.');
        }

        options.readPolicy = _enums.ReadPolicy.NetworkOnly;
        return _this10.find(query, options);
      });

      return promise;
    }
  }, {
    key: 'sync',
    value: function sync(query) {
      var _this11 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var promise = this.push(null, options).then(function (pushResponse) {
        return _this11.pull(query, options).then(function (pullResponse) {
          return {
            push: pushResponse,
            sync: {
              collection: _this11.name,
              entities: pullResponse
            }
          };
        });
      });

      return promise;
    }
  }, {
    key: 'syncCount',
    value: function syncCount(query) {
      var _this12 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      options = (0, _assign2.default)({
        properties: null,
        timeout: undefined,
        ttl: this.ttl,
        handler: function handler() {}
      }, options);

      if (query && !(query instanceof _query2.default)) {
        return Promise.reject(new _errors.KinveyError('Invalid query. It must be an instance of the Kinvey.Query class.'));
      }

      var promise = Promise.resolve().then(function () {
        var request = new _localRequest2.default({
          method: _enums.HttpMethod.GET,
          client: _this12.client,
          properties: options.properties,
          auth: _auth2.default.default,
          pathname: _this12._getSyncPathname(_this12.client),
          query: query,
          timeout: options.timeout
        });
        return request.execute();
      }).then(function (response) {
        if (response.isSuccess()) {
          return response.data.size || 0;
        }

        throw response.error;
      }).catch(function (err) {
        if (err instanceof _errors.NotFoundError) {
          return 0;
        }

        throw err;
      });

      return promise;
    }
  }, {
    key: '_updateSync',
    value: function _updateSync(docs) {
      var _this13 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (!this.name) {
        return Promise.reject(new _errors.KinveyError('Unable to add entities to the sync table for a store with no name.'));
      }

      if (!docs) {
        return Promise.resolve(null);
      }

      options = (0, _assign2.default)({
        properties: null,
        timeout: undefined,
        ttl: this.ttl,
        handler: function handler() {}
      }, options);

      var promise = Promise.resolve().then(function () {
        var request = new _localRequest2.default({
          method: _enums.HttpMethod.GET,
          client: _this13.client,
          properties: options.properties,
          auth: _auth2.default.default,
          pathname: _this13._getSyncPathname(_this13.client),
          timeout: options.timeout
        });
        return request.execute();
      }).catch(function (err) {
        if (err instanceof _errors.NotFoundError) {
          return new _response2.default({
            statusCode: _enums.StatusCode.Ok,
            data: {
              _id: _this13.name,
              docs: {},
              size: 0
            }
          });
        }

        throw err;
      }).then(function (response) {
        if (response && response.isSuccess()) {
          var _ret3 = function () {
            var syncData = response.data || {
              _id: _this13.name,
              docs: {},
              size: 0
            };

            if (!(0, _isArray2.default)(docs)) {
              docs = [docs];
            }

            (0, _forEach2.default)(docs, function (doc) {
              if (doc._id) {
                if (!syncData.docs.hasOwnProperty(doc._id)) {
                  syncData.size = syncData.size + 1;
                }

                syncData.docs[doc._id] = {
                  lmt: doc._kmd ? doc._kmd.lmt : null
                };
              }
            });

            var request = new _localRequest2.default({
              method: _enums.HttpMethod.PUT,
              client: _this13.client,
              properties: options.properties,
              auth: options.auth,
              pathname: _this13._getSyncPathname(_this13.client),
              data: syncData,
              timeout: options.timeout
            });
            return {
              v: request.execute()
            };
          }();

          if ((typeof _ret3 === 'undefined' ? 'undefined' : _typeof(_ret3)) === "object") return _ret3.v;
        }

        return response;
      }).then(function () {
        return null;
      });

      return promise;
    }
  }], [{
    key: 'getInstance',
    value: function getInstance(name) {
      var type = arguments.length <= 1 || arguments[1] === undefined ? _enums.StoreType.Cache : arguments[1];

      var store = dataStoresMap.get(name + '_' + type);

      if (!store) {
        store = new DataStore(name);

        switch (type) {
          case _enums.StoreType.Sync:
            store.readPolicy = _enums.ReadPolicy.LocalOnly;
            store.writePolicy = _enums.WritePolicy.LocalOnly;
            break;
          case _enums.StoreType.Network:
            store.readPolicy = _enums.ReadPolicy.NetworkOnly;
            store.writePolicy = _enums.WritePolicy.NetworkOnly;
            break;
          case _enums.StoreType.Cache:
          default:
            store.readPolicy = _enums.ReadPolicy.LocalFirst;
            store.writePolicy = _enums.WritePolicy.LocalFirst;
        }

        dataStoresMap.set(name + '_' + type, store);
      }

      return store;
    }
  }]);

  return DataStore;
}();

exports.default = DataStore;