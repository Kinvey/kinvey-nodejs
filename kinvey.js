/*!
 * Copyright (c) 2012 Kinvey, Inc. All rights reserved.
 *
 * Licensed to Kinvey, Inc. under one or more contributor
 * license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership.  Kinvey, Inc. licenses this file to you under the
 * Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License.  You
 * may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
(function(undefined) {

  // Save reference to global object (window in browser, global on server).
  var root = this;

  /**
   * Top-level namespace. Exported for browser and CommonJS.
   * 
   * @name Kinvey
   * @namespace
   */
  var Kinvey;
  if('undefined' !== typeof exports) {
    Kinvey = exports;
  }
  else {
    Kinvey = root.Kinvey = {};
  }

  // Define a base class for all Kinvey classes. Provides a property method for
  // class inheritance. This method is available to all child definitions.
  var Base = Object.defineProperty(function() { }, 'extend', {
    value: function(prototype, properties) {
      // Create class definition
      var constructor = prototype && prototype.hasOwnProperty('constructor') ? prototype.constructor : this;
      var def = function() {
        constructor.apply(this, arguments);
      };

      // Set prototype by merging child prototype into parents.
      def.prototype = (function(parent, child) {
        Object.getOwnPropertyNames(child).forEach(function(property) {
          Object.defineProperty(parent, property, Object.getOwnPropertyDescriptor(child, property));
        });
        return parent;
      }(Object.create(this.prototype), prototype || {}));

      // Set static properties.
      if(properties) {
        for(var prop in properties) {
          if(properties.hasOwnProperty(prop)) {
            def[prop] = properties[prop];
          }
        }
      }

      // Add extend to definition.
      Object.defineProperty(def, 'extend', Object.getOwnPropertyDescriptor(this, 'extend'));

      // Return definition.
      return def;
    }
  });

  // Convenient method for binding context to anonymous functions.
  var bind = function(thisArg, fn) {
    fn || (fn = function() { });
    return fn.bind ? fn.bind(thisArg) : function() {
      return fn.apply(thisArg, arguments);
    };
  };

  // Merges multiple source objects into one newly created object.
  var merge = function(/*sources*/) {
    var target = {};
    Array.prototype.slice.call(arguments, 0).forEach(function(source) {
      for(var prop in source) {
        target[prop] = source[prop];
      }
    });
    return target;
  };

  // Utilities.
  var fs = require('fs');
  var filename = __dirname + '/.kinvey';

  // Load cache.
  var cache = {};// container.
  try {
    cache = JSON.parse(fs.readFileSync(filename, 'utf8'));
  }
  catch(_) {
    // Will fail when file does not exist, or is malformed.
  }

  // Define the Storage class.
  var Storage = {
    get: function(key) {
      return cache[key] || null;
    },
    set: function(key, value) {
      cache[key] = value;

      // Update file cache.
      fs.writeFileSync(filename, JSON.stringify(cache), 'utf8');
    },
    remove: function(key) {
      delete cache[key];

      // Update file cache.
      fs.writeFileSync(filename, JSON.stringify(cache), 'utf8');
    }
  };

  // Utilities.
  var nodeHttp = require('http');
  var nodeHttps = require('https');
  var nodeUrl = require('url');

  // Define the Xhr mixin.
  var Xhr = (function() {
    /**
     * Base 64 encodes string.
     * 
     * @private
     * @param {string} value
     * @return {string} Encoded string.
     */
    var base64 = function(value) {
      return new Buffer(value, 'utf8').toString('base64');
    };

    /**
     * Returns authorization string.
     * 
     * @private
     * @return {Object} Authorization.
     */
    var getAuth = function() {
      // Use master secret if specified.
      if(null !== Kinvey.masterSecret) {
        return 'Basic ' + this._base64(Kinvey.appKey + ':' + Kinvey.masterSecret);
      }

      // Use Session Auth if there is a current user.
      var user = Kinvey.getCurrentUser();
      if(null !== user) {
        return 'Kinvey ' + user.getToken();
      }

      // Use application credentials as last resort.
      return 'Basic ' + this._base64(Kinvey.appKey + ':' + Kinvey.appSecret);
    };

    /**
     * Returns device information.
     * 
     * @private
     * @return {string} Device information.
     */
    var getDeviceInfo = function() {
      // Example: "linux node v0.6.13 0".
      return [
        process.platform,
        process.title,
        process.version,
        0// always set device ID to 0.
      ].map(function(value) {
        return value.toString().toLowerCase().replace(' ', '_');
      }).join(' ');
    };

    /**
     * Sends a request against Kinvey.
     * 
     * @private
     * @param {string} method Request method.
     * @param {string} url Request URL.
     * @param {string} body Request body.
     * @param {Object} options
     * @param {function(response, info)} [options.success] Success callback.
     * @param {function(error, info)} [options.error] Failure callback.
     */
    var send = function(method, url, body, options) {
      options || (options = {});
      options.success || (options.success = this.options.success);
      options.error || (options.error = this.options.error);

      // For now, include authorization in this adapter. Ideally, it should
      // have some external interface.
      if(null === Kinvey.getCurrentUser() && Kinvey.Store.AppData.USER_API !== this.api && null === Kinvey.masterSecret) {
        return Kinvey.User.create({}, merge(options, {
          success: bind(this, function() {
            this._send(method, url, body, options);
          })
        }));
      }

      // Add host to URL.
      url = Kinvey.HOST + url;

      // Headers.
      var headers = {
        Accept: 'application/json, text/javascript',
        Authorization: this._getAuth(),
        'X-Kinvey-API-Version': Kinvey.API_VERSION,
        'X-Kinvey-Device-Information': this._getDeviceInfo()
      };
      body && (headers['Content-Type'] = 'application/json; charset=utf-8');
      Kinvey.masterSecret && (headers['X-Kinvey-Master-Create-User'] = true);

      // Execute request.
      this._xhr(method, url, body, merge(options, {
        headers: headers,
        success: function(response, info) {
          // Response is expected to be either empty, or valid JSON.
          response = response ? JSON.parse(response) : null;
          options.success(response, info);
        },
        error: function(response, info) {
          // Response could be valid JSON if the error occurred at Kinvey.
          try {
            response = JSON.parse(response);
          }
          catch(_) {// Or just the error type if something else went wrong.
            var error = {
              abort: 'The request was aborted',
              error: 'The request failed',
              timeout: 'The request timed out'
            };

            // Execute application-level handler.
            response = {
              error: Kinvey.Error.REQUEST_FAILED,
              description: error[response] || error.error,
              debug: ''
            };
          }

          // Return.
          options.error(response, info);
        }
      }));
    };

    /**
     * Sends a request.
     * 
     * @private
     * @param {string} method Request method.
     * @param {string} url Request URL.
     * @param {string} body Request body.
     * @param {Object} options
     * @param {Object} [options.headers] Request headers.
     * @param {integer} [options.timeout] Request timeout (ms).
     * @param {function(status, response)} [options.success] Success callback.
     * @param {function(type)} [options.error] Failure callback.
     */
    var xhr = function(method, url, body, options) {
      options || (options = {});
      options.headers || (options.headers = {});
      options.success || (options.success = this.options.success);
      options.error || (options.error = this.options.error);

      // Add Content-Length header.
      options.headers['Content-Length'] = body ? body.length : 0;

      // Create request.
      var path = nodeUrl.parse(url);
      var adapter = 'https:' === path.protocol ? nodeHttps : nodeHttp;
      var request = adapter.request({
        host: path.hostname,
        path: path.pathname + (path.search ? path.search : ''),
        port: path.port,
        method: method,
        headers: options.headers
      }, function(response) {
        // Capture data stream.
        var data = '';
        response.on('data', function(chunk) {
          data += chunk;
        });

        // Handle response when it completes.
        // @link https://github.com/joyent/node/issues/728
        var onComplete = function() {
          // Success implicates status 2xx (Successful), or 304 (Not Modified).
          if(2 === parseInt(response.statusCode / 100, 10) || 304 === response.statusCode) {
            options.success(data, { network: true });
          }
          else {
            options.error(data, { network: true });
          }
        };
        response.on('close', onComplete);
        response.on('end', onComplete);
      });

      // Define request error handler.
      request.on('error', function(error) {
        options.error(error.error, { network: true });
      });

      // Fire request.
      body && request.write(body);// pass body.
      request.end();
    };

    // Attach to context.
    return function() {
      this._base64 = base64;
      this._getAuth = getAuth;
      this._getDeviceInfo = getDeviceInfo;
      this._send = send;
      this._xhr = xhr;
      return this;
    };
  }());

  // Current user.
  var currentUser = null;

  /**
   * API version.
   * 
   * @constant
   */
  Kinvey.API_VERSION = 2;

  /**
   * Host.
   * 
   * @constant
   */
  Kinvey.HOST = 'https://baas.kinvey.com';

  /**
   * SDK version.
   * 
   * @constant
   */
  Kinvey.SDK_VERSION = '0.9.10';

  /**
   * Returns current user, or null if not set.
   * 
   * @return {Kinvey.User} Current user.
   */
  Kinvey.getCurrentUser = function() {
    return currentUser;
  };

  /**
   * Initializes library for use with Kinvey services. Never use the master
   * secret in client-side code.
   * 
   * @example <code>
   * Kinvey.init({
   *   appKey: 'your-app-key',
   *   appSecret: 'your-app-secret'
   * });
   * </code>
   * 
   * @param {Object} options Kinvey credentials. Object expects properties:
   *          "appKey", and "appSecret" or "masterSecret". Optional: "sync".
   * @throws {Error}
   *           <ul>
   *           <li>On empty appKey,</li>
   *           <li>On empty appSecret and masterSecret.</li>
   *           </ul>
   */
  Kinvey.init = function(options) {
    options || (options = {});
    if(null == options.appKey) {
      throw new Error('appKey must be defined');
    }
    if(null == options.appSecret && null == options.masterSecret) {
      throw new Error('appSecret or masterSecret must be defined');
    }

    // Store credentials.
    Kinvey.appKey = options.appKey;
    Kinvey.appSecret = options.appSecret || null;
    Kinvey.masterSecret = options.masterSecret || null;

    // Restore current user.
    Kinvey.User._restore();

    // Synchronize app in the background.
    options.sync && Kinvey.Sync && Kinvey.Sync.application();
  };

  /**
   * Round trips a request to the server and back, helps ensure connectivity.
   * 
   * @example <code>
   * Kinvey.ping({
   *   success: function(response) {
   *     console.log('Ping successful', response.kinvey, response.version);
   *   },
   *   error: function(error) {
   *     console.log('Ping failed', error.message);
   *   }
   * });
   * </code>
   * 
   * @param {Object} [options]
   * @param {function(response, info)} [options.success] Success callback.
   * @param {function(error, info)} [options.error] Failure callback.
   */
  Kinvey.ping = function(options) {
    // Ping always targets the Kinvey backend.
    new Kinvey.Store.AppData(null).query(null, options);
  };

  /**
   * Sets the current user. This method is only used by the Kinvey.User
   * namespace.
   * 
   * @private
   * @param {Kinvey.User} user Current user.
   */
  Kinvey.setCurrentUser = function(user) {
    currentUser = user;
  };

  /**
   * Kinvey Error namespace definition. Holds all possible errors.
   * 
   * @namespace
   */
  Kinvey.Error = {
    // Client-side.
    /** @constant */
    DATABASE_ERROR: 'DatabaseError',

    /** @constant */
    NO_NETWORK: 'NoNetwork',

    /** @constant */
    OPERATION_DENIED: 'OperationDenied',

    /** @constant */
    REQUEST_FAILED: 'RequestFailed',

    /** @constant */
    RESPONSE_PROBLEM: 'ResponseProblem',

    // Server-side.
    /** @constant */
    ENTITY_NOT_FOUND: 'EntityNotFound',

    /** @constant */
    COLLECTION_NOT_FOUND: 'CollectionNotFound',

    /** @constant */
    APP_NOT_FOUND: 'AppNotFound',

    /** @constant */
    USER_NOT_FOUND: 'UserNotFound',

    /** @constant */
    BLOB_NOT_FOUND: 'BlobNotFound',

    /** @constant */
    INVALID_CREDENTIALS: 'InvalidCredentials',

    /** @constant */
    KINVEY_INTERNAL_ERROR_RETRY: 'KinveyInternalErrorRetry',

    /** @constant */
    KINVEY_INTERNAL_ERROR_STOP: 'KinveyInternalErrorStop',

    /** @constant */
    USER_ALREADY_EXISTS: 'UserAlreadyExists',

    /** @constant */
    USER_UNAVAILABLE: 'UserUnavailable',

    /** @constant */
    DUPLICATE_END_USERS: 'DuplicateEndUsers',

    /** @constant */
    INSUFFICIENT_CREDENTIALS: 'InsufficientCredentials',

    /** @constant */
    WRITES_TO_COLLECTION_DISALLOWED: 'WritesToCollectionDisallowed',

    /** @constant */
    INDIRECT_COLLECTION_ACCESS_DISALLOWED : 'IndirectCollectionAccessDisallowed',

    /** @constant */
    APP_PROBLEM: 'AppProblem',

    /** @constant */
    PARAMETER_VALUE_OUT_OF_RANGE: 'ParameterValueOutOfRange',

    /** @constant */
    CORS_DISABLED: 'CORSDisabled',

    /** @constant */
    INVALID_QUERY_SYNTAX: 'InvalidQuerySyntax',

    /** @constant */
    MISSING_QUERY: 'MissingQuery',

    /** @constant */
    JSON_PARSE_ERROR: 'JSONParseError',

    /** @constant */
    MISSING_REQUEST_HEADER: 'MissingRequestHeader',

    /** @constant */
    INCOMPLETE_REQUEST_BODY: 'IncompleteRequestBody',

    /** @constant */
    MISSING_REQUEST_PARAMETER: 'MissingRequestParameter',

    /** @constant */
    INVALID_IDENTIFIER: 'InvalidIdentifier',

    /** @constant */
    BAD_REQUEST: 'BadRequest',

    /** @constant */
    FEATURE_UNAVAILABLE: 'FeatureUnavailable',

    /** @constant */
    API_VERSION_NOT_IMPLEMENTED: 'APIVersionNotImplemented',

    /** @constant */
    API_VERSION_NOT_AVAILABLE: 'APIVersionNotAvailable',

    /** @constant */
    INPUT_VALIDATION_FAILED: 'InputValidationFailed',
    
    /** @constant */
    BLruntimeError: 'BLruntimeError'
  };

  // Define the Kinvey Entity class.
  Kinvey.Entity = Base.extend({
    // Identifier attribute.
    ATTR_ID: '_id',

    // Map.
    map: {},

    /**
     * Creates a new entity.
     * 
     * @example <code>
     * var entity = new Kinvey.Entity({}, 'my-collection');
     * var entity = new Kinvey.Entity({ key: 'value' }, 'my-collection');
     * </code>
     * 
     * @name Kinvey.Entity
     * @constructor
     * @param {Object} [attr] Attribute object.
     * @param {string} collection Owner collection.
     * @param {Object} options Options.
     * @throws {Error} On empty collection.
     */
    constructor: function(attr, collection, options) {
      if(null == collection) {
        throw new Error('Collection must not be null');
      }
      this.collection = collection;
      this.metadata = null;

      // Options.
      options || (options = {});
      this.store = Kinvey.Store.factory(options.store, this.collection, options.options);
      options.map && (this.map = options.map);

      // Parse attributes.
      this.attr = attr ? this._parseAttr(attr) : {};

      // State (used by save()).
      this._pending = false;
    },

    /** @lends Kinvey.Entity# */

    /**
     * Destroys entity.
     * 
     * @param {Object} [options]
     * @param {function(entity, info)} [options.success] Success callback.
     * @param {function(error, info)} [options.error] Failure callback.
     */
    destroy: function(options) {
      options || (options = {});
      this.store.remove(this.toJSON(), merge(options, {
        success: bind(this, function(_, info) {
          options.success && options.success(this, info);
        })
      }));
    },

    /**
     * Returns attribute, or null if not set.
     * 
     * @param {string} key Attribute key.
     * @throws {Error} On empty key.
     * @return {*} Attribute.
     */
    get: function(key) {
      if(null == key) {
        throw new Error('Key must not be null');
      }

      // Return attribute, or null if attribute is null or undefined.
      var value = this.attr[key];
      return null != value ? value : null;
    },

    /**
     * Returns id or null if not set.
     * 
     * @return {string} id
     */
    getId: function() {
      return this.get(this.ATTR_ID);
    },

    /**
     * Returns metadata.
     * 
     * @return {Kinvey.Metadata} Metadata.
     */
    getMetadata: function() {
      // Lazy load metadata object, and return it.
      this.metadata || (this.metadata = new Kinvey.Metadata(this.attr));
      return this.metadata;
    },

    /**
     * Returns whether entity is persisted.
     * 
     * @return {boolean}
     */
    isNew: function() {
      return null === this.getId();
    },

    /**
     * Loads entity by id.
     * 
     * @param {string} id Entity id.
     * @param {Object} [options]
     * @param {function(entity, info)} [options.success] Success callback.
     * @param {function(error, info)} [options.error] Failure callback.
     * @throws {Error} On empty id.
     */
    load: function(id, options) {
      if(null == id) {
        throw new Error('Id must not be null');
      }
      options || (options = {});

      this.store.query(id, merge(options, {
        success: bind(this, function(response, info) {
          this.attr = this._parseAttr(response);
          this.metadata = null;// Reset.
          options.success && options.success(this, info);
        })
      }));
    },

    /**
     * Saves entity.
     * 
     * @param {Object} [options]
     * @param {function(entity, info)} [options.success] Success callback.
     * @param {function(error, info)} [options.error] Failure callback.
     */
    save: function(options) {
      options || (options = {});

      // Refuse to save circular references.
      if(this._pending && options._ref) {
        this._pending = false;// Reset.
        options.error({
          error: Kinvey.Error.OPERATION_DENIED,
          message: 'Circular reference detected, aborting save',
          debug: ''
        }, {});
        return;
      }
      this._pending = true;

      // Save children first.
      this._saveAttr(this.attr, {
        success: bind(this, function(references) {
          // All children are saved, save parent.
          this.store.save(this.toJSON(), merge(options, {
            success: bind(this, function(response, info) {
              this._pending = false;// Reset.

              // Merge response with response of children.
              this.attr = merge(this._parseAttr(response), references);
              this.metadata = null;// Reset.

              options.success && options.success(this, info);
            }),
            error: bind(this, function(error, info) {
              this._pending = false;// Reset.
              options.error && options.error(error, info);
            })
          }));
        }),

        // One of the children failed, break on error.
        error: bind(this, function(error, info) {
          this._pending = false;// Reset.
          options.error && options.error(error, info);
        }),

        // Flag to detect any circular references. 
        _ref: true
      });
    },

    /**
     * Sets attribute.
     * 
     * @param {string} key Attribute key.
     * @param {*} value Attribute value.
     * @throws {Error} On empty key.
     */
    set: function(key, value) {
      if(null == key) {
        throw new Error('Key must not be null');
      }
      this.attr[key] = this._parse(key, value);
    },

    /**
     * Sets id.
     * 
     * @param {string} id Id.
     * @throws {Error} On empty id.
     */
    setId: function(id) {
      if(null == id) {
        throw new Error('Id must not be null');
      }
      this.set(this.ATTR_ID, id);
    },

    /**
     * Sets metadata.
     * 
     * @param {Kinvey.Metadata} metadata Metadata object.
     * @throws {Error} On invalid instance.
     */
    setMetadata: function(metadata) {
      if(metadata && !(metadata instanceof Kinvey.Metadata)) {
        throw new Error('Metadata must be an instanceof Kinvey.Metadata');
      }
      this.metadata = metadata || null;
    },

    /**
     * Returns JSON representation. Used by JSON#stringify.
     * 
     * @returns {Object} JSON representation.
     */
    toJSON: function(name) {
      // Flatten references.
      var result = this._flattenAttr(this.attr);// Copy by value.
      this.metadata && (result._acl = this.metadata.toJSON()._acl);
      return result;
    },

    /**
     * Removes attribute.
     * 
     * @param {string} key Attribute key.
     */
    unset: function(key) {
      delete this.attr[key];
    },

    /**
     * Flattens attribute value.
     * 
     * @private
     * @param {*} value Attribute value.
     * @returns {*}
     */
    _flatten: function(value) {
      if(value instanceof Object) {
        if(value instanceof Kinvey.Entity) {// Case 1: value is a reference.
          value = {
            _type: 'KinveyRef',
            _collection: value.collection,
            _id: value.getId()
          };
        }
        else if(value instanceof Array) {// Case 2: value is an array.
          // Flatten all members.
          value = value.map(bind(this, function(x) {
            return this._flatten(x);
          }));
        }
        else {
          value = this._flattenAttr(value);// Case 3: value is an object.
        }
      }
      return value;
    },

    /**
     * Flattens attributes.
     * 
     * @private
     * @param {Object} attr Attributes.
     * @returns {Object} Flattened attributes.
     */
    _flattenAttr: function(attr) {
      var result = {};
      Object.keys(attr).forEach(bind(this, function(name) {
        result[name] = this._flatten(attr[name]);
      }));
      return result;
    },

    /**
     * Parses references in name/value pair.
     * 
     * @private
     * @param {string} name Attribute name.
     * @param {*} value Attribute value.
     * @returns {*} Parsed value.
     */
    _parse: function(name, value) {
      if(value instanceof Object) {
        if(value instanceof Kinvey.Entity) { }// Skip.
        else if('KinveyRef' === value._type) {// Case 1: value is a reference.
          // Create object from reference if embedded, otherwise skip.
          if(value._obj) {
            var Entity = this.map[name] || Kinvey.Entity;// Use mapping if defined.

            // Maintain store type and configuration.
            var opts = { store: this.store.type, options: this.store.options };
            value = new Entity(value._obj, value._collection, opts);
          }
        }
        else if(value instanceof Array) {// Case 2: value is an array.
          // Loop through and parse all members.
          value = value.map(bind(this, function(x) {
            return this._parse(name, x);
          }));
        }
        else {// Case 3: value is an object.
          value = this._parseAttr(value, name);
        }
      }
      return value;
    },

    /**
     * Parses references in attributes.
     * 
     * @private
     * @param {Object} attr Attributes.
     * @param {string} [prefix] Name prefix.
     * @return {Object} Parsed attributes.
     */
    _parseAttr: function(attr, prefix) {
      var result = merge(attr);// Copy by value.
      Object.keys(attr).forEach(bind(this, function(name) {
        result[name] = this._parse((prefix ? prefix + '.' : '') + name, attr[name]);
      }));
      return result;
    },
    
    /**
     * Saves an attribute value.
     * 
     * @private
     * @param {*} value Attribute value.
     * @param {Object} options Options.
     */
    _save: function(value, options) {
      if(value instanceof Object) {
        if(value instanceof Kinvey.Entity) {// Case 1: value is a reference.
          // Only save when authorized, otherwise just return. Note any writable
          // children are not saved if the parent is not writable.
          return value.getMetadata().hasWritePermissions() ? value.save(options) : options.success(value); 
        }
        if(value instanceof Array) {// Case 2: value is an array.
          // Save every element in the array (serially), and update in place.
          var i = 0;

          // Define save handler.
          var save = bind(this, function() {
            var item = value[i];
            item ? this._save(item, merge(options, {
              success: function(response) {
                value[i++] = response;// Update.
                save();// Advance.
              }
            })) : options.success(value);
          });

          // Trigger.
          return save();
        }

        // Case 3: value is an object.
        return this._saveAttr(value, options);
      }

      // Case 4: value is a scalar.
      options.success(value);
    },

    /**
     * Saves attributes.
     * 
     * @private
     * @param {Object} attr Attributes.
     * @param {Object} options Options.
     */
    _saveAttr: function(attr, options) {
      // Save attributes serially.
      var attrs = Object.keys(attr);
      var i = 0;

      // Define save handler.
      var save = bind(this, function() {
        var name = attrs[i++];
        name ? this._save(attr[name], merge(options, {
          success: function(response) {
            attr[name] = response;// Update.
            save();// Advance.
          }
        })) : options.success(attr);
      });

      // Trigger.
      save();
    }
  });

  // Define the Kinvey Collection class.
  Kinvey.Collection = Base.extend({
    // List of entities.
    list: [],

    // Mapped entity class.
    entity: Kinvey.Entity,

    /**
     * Creates new collection.
     * 
     * @example <code>
     * var collection = new Kinvey.Collection('my-collection');
     * </code>
     * 
     * @constructor
     * @name Kinvey.Collection
     * @param {string} name Collection name.
     * @param {Object} [options] Options.
     * @throws {Error}
     *           <ul>
     *           <li>On empty name,</li>
     *           <li>On invalid query instance.</li>
     *           </ul>
     */
    constructor: function(name, options) {
      if(null == name) {
        throw new Error('Name must not be null');
      }
      this.name = name;

      // Options.
      options || (options = {});
      this.setQuery(options.query || new Kinvey.Query());
      this.store = Kinvey.Store.factory(options.store, this.name, options.options);
    },

    /** @lends Kinvey.Collection# */

    /**
     * Aggregates entities in collection.
     * 
     * @param {Kinvey.Aggregation} aggregation Aggregation object.
     * @param {Object} [options]
     * @param {function(aggregation, info)} [options.success] Success callback.
     * @param {function(error, info)} [options.error] Failure callback.
     */
    aggregate: function(aggregation, options) {
      if(!(aggregation instanceof Kinvey.Aggregation)) {
        throw new Error('Aggregation must be an instanceof Kinvey.Aggregation');
      }
      aggregation.setQuery(this.query);// respect collection query.
      this.store.aggregate(aggregation.toJSON(), options);
    },

    /**
     * Clears collection.
     * 
     * @param {Object} [options]
     * @param {function(info)} [success] Success callback.
     * @param {function(error, info)} [error] Failure callback.
     */
    clear: function(options) {
      options || (options = {});
      this.store.removeWithQuery(this.query.toJSON(), merge(options, {
        success: bind(this, function(_, info) {
          this.list = [];
          options.success && options.success(info);
        })
      }));
    },

    /**
     * Counts number of entities.
     * 
     * @example <code>
     * var collection = new Kinvey.Collection('my-collection');
     * collection.count({
     *   success: function(i) {
     *    console.log('Number of entities: ' + i);
     *   },
     *   error: function(error) {
     *     console.log('Count failed', error.description);
     *   }
     * });
     * </code>
     * 
     * @param {Object} [options]
     * @param {function(count, info)} [success] Success callback.
     * @param {function(error, info)} [error] Failure callback.
     */
    count: function(options) {
      options || (options = {});

      var aggregation = new Kinvey.Aggregation();
      aggregation.setInitial({ count: 0 });
      aggregation.setReduce(function(doc, out) {
        out.count += 1;
      });
      aggregation.setQuery(this.query);// Apply query.

      this.store.aggregate(aggregation.toJSON(), merge(options, {
        success: function(response, info) {
          options.success && options.success(response[0].count, info);
        }
      }));
    },

    /**
     * Fetches entities in collection.
     * 
     * @param {Object} [options]
     * @param {function(list, info)} [options.success] Success callback.
     * @param {function(error, info)} [options.error] Failure callback.
     */
    fetch: function(options) {
      options || (options = {});

      // Send request.
      this.store.queryWithQuery(this.query.toJSON(), merge(options, {
        success: bind(this, function(response, info) {
          this.list = [];
          response.forEach(bind(this, function(attr) {
            // Maintain collection store type and configuration.
            var opts = { store: this.store.name, options: this.store.options };
            this.list.push(new this.entity(attr, this.name, opts));
          }));
          options.success && options.success(this.list, info);
        })
      }));
    },

    /**
     * Sets query.
     * 
     * @param {Kinvey.Query} [query] Query.
     * @throws {Error} On invalid instance.
     */
    setQuery: function(query) {
      if(query && !(query instanceof Kinvey.Query)) {
        throw new Error('Query must be an instanceof Kinvey.Query');
      }
      this.query = query || new Kinvey.Query();
    }
  });

  // Function to get the cache key for this app.
  var CACHE_TAG = function() {
    return 'Kinvey.' + Kinvey.appKey;
  };

  // Define the Kinvey User class.
  Kinvey.User = Kinvey.Entity.extend({
    // Credential attributes.
    ATTR_USERNAME: 'username',
    ATTR_PASSWORD: 'password',

    // Authorization token.
    token: null,

    /**
     * Creates a new user.
     * 
     * @example <code>
     * var user = new Kinvey.User();
     * var user = new Kinvey.User({ key: 'value' });
     * </code>
     * 
     * @name Kinvey.User
     * @constructor
     * @extends Kinvey.Entity
     * @param {Object} [attr] Attributes.
     */
    constructor: function(attr) {
      Kinvey.Entity.prototype.constructor.call(this, attr, 'user');
    },

    /** @lends Kinvey.User# */

    /**
     * Destroys user. Use with caution.
     * 
     * @override
     * @see Kinvey.Entity#destroy
     */
    destroy: function(options) {
      options || (options = {});

      // Destroying the user will automatically invalidate its token, so no
      // need to logout explicitly.
      Kinvey.Entity.prototype.destroy.call(this, merge(options, {
        success: bind(this, function(_, info) {
          this._logout();
          options.success && options.success(this, info);
        })
      }));
    },

    /**
     * Returns social identity, or null if not set.
     * 
     * @return {Object} Identity.
     */
    getIdentity: function() {
      return this.get('_socialIdentity');
    },

    /**
     * Returns token, or null if not set.
     * 
     * @return {string} Token.
     */
    getToken: function() {
      return this.token;
    },

    /**
     * Returns username, or null if not set.
     * 
     * @return {string} Username.
     */
    getUsername: function() {
      return this.get(this.ATTR_USERNAME);
    },

    /**
     * Logs in user.
     * 
     * @example <code> 
     * var user = new Kinvey.User();
     * user.login('username', 'password', {
     *   success: function() {
     *     console.log('Login successful');
     *   },
     *   error: function(error) {
     *     console.log('Login failed', error);
     *   }
     * });
     * </code>
     * 
     * @param {string} username Username.
     * @param {string} password Password.
     * @param {Object} [options]
     * @param {function(entity, info)} [options.success] Success callback.
     * @param {function(error, info)} [options.error] Failure callback.
     */
    login: function(username, password, options) {
      this._doLogin({
        username: username,
        password: password
      }, options || {});
    },

    /**
     * Logs in user given a Facebook oAuth token.
     * 
     * @param {string} token oAuth token.
     * @param {Object} [attr] User attributes.
     * @param {Object} [options]
     * @param {function(entity, info)} [options.success] Success callback.
     * @param {function(error, info)} [options.error] Failure callback.
     */
    loginWithFacebook: function(token, attr, options) {
      attr || (attr = {});
      attr._socialIdentity = { facebook: { access_token: token } };
      options || (options = {});

      // Login, or create when there is no user with this Facebook identity.
      this._doLogin(attr, merge(options, {
        error: bind(this, function(error, info) {
          // If user could not be found, register.
          if(Kinvey.Error.USER_NOT_FOUND === error.error) {
            // Pass current instance as (private) option to create.
            this.attr = attr;// Required as we set a specific target below.
            return Kinvey.User.create(attr, merge(options, {
              _target: this
            }));
          }

          // Something else went wrong (invalid token?), error out.
          options.error && options.error(error, info);
        })
      }));
    },

    /**
     * Logs out user.
     * 
     * @param {Object} [options] Options.
     * @param {function(info)} [options.success] Success callback.
     * @param {function(error, info)} [options.error] Failure callback.
     */
    logout: function(options) {
      options || (options = {});

      // Make sure we only logout the current user.
      if(!this.isLoggedIn) {
        options.success && options.success({});
        return;
      }
      this.store.logout({}, merge(options, {
        success: bind(this, function(_, info) {
          this._logout();
          options.success && options.success(info);
        })
      }));
    },

    /**
     * Saves a user.
     * 
     * @override
     * @see Kinvey.Entity#save
     */
    save: function(options) {
      options || (options = {});
      if(!this.isLoggedIn) {
        options.error && options.error({
          code: Kinvey.Error.OPERATION_DENIED,
          description: 'This operation is not allowed',
          debug: 'Cannot save a user which is not logged in.'
        }, {});
        return;
      }

      // Parent method will always update.
      Kinvey.Entity.prototype.save.call(this, merge(options, {
        success: bind(this, function(_, info) {
          this._saveToDisk();// Refresh cache.
          options.success && options.success(this, info);
        })
      }));
    },

    /**
     * Removes any user saved on disk.
     * 
     * @private
     */
    _deleteFromDisk: function() {
      Storage.remove(CACHE_TAG());
    },

    /**
     * Performs login.
     * 
     * @private
     * @param {Object} attr Attributes.
     * @param {Object} options Options.
     */
    _doLogin: function(attr, options) {
      // Make sure only one user is active at the time.
      var currentUser = Kinvey.getCurrentUser();
      if(null !== currentUser) {
        currentUser.logout(merge(options, {
          success: bind(this, function() {
            this._doLogin(attr, options);
          })
        }));
        return;
      }

      // Send request.
      this.store.login(attr, merge(options, {
        success: bind(this, function(response, info) {
          // Extract token.
          var token = response._kmd.authtoken;
          delete response._kmd.authtoken;

          // Update attributes. This does not include the users password.
          this.attr = this._parseAttr(response);
          this._login(token);

          options.success && options.success(this, info);
        })
      }));
    },

    /**
     * Marks user as logged in. This method should never be called standalone,
     * but always involve some network request.
     * 
     * @private
     * @param {string} token Token.
     */
    _login: function(token) {
      // The master secret does not need a current user.
      if(null == Kinvey.masterSecret) {
        Kinvey.setCurrentUser(this);
        this.isLoggedIn = true;
        this.token = token;
        this._saveToDisk();
      }
    },

    /**
     * Marks user no longer as logged in.
     * 
     * @private
     */
    _logout: function() {
      // The master secret does not need a current user.
      if(null == Kinvey.masterSecret) {
        Kinvey.setCurrentUser(null);
        this.isLoggedIn = false;
        this.token = null;
        this._deleteFromDisk();
      }
    },

    /**
     * Saves current user to disk.
     * 
     * @private
     */
    _saveToDisk: function() {
      Storage.set(CACHE_TAG(), {
        token: this.token,
        user: this.toJSON()
      });
    }
  }, {
    /** @lends Kinvey.User */

    /**
     * Creates the current user.
     * 
     * @example <code>
     * Kinvey.User.create({
     *   username: 'username'
     * }, {
     *   success: function(user) {
     *     console.log('User created', user);
     *   },
     *   error: function(error) {
     *     console.log('User not created', error.message);
     *   }
     * });
     * </code>
     * 
     * @param {Object} attr Attributes.
     * @param {Object} [options]
     * @param {function(user)} [options.success] Success callback.
     * @param {function(error)} [options.error] Failure callback.
     * @return {Kinvey.User} The user instance (not necessarily persisted yet).
     */
    create: function(attr, options) {
      options || (options = {});

      // Make sure only one user is active at the time.
      var currentUser = Kinvey.getCurrentUser();
      if(null !== currentUser) {
        currentUser.logout(merge(options, {
          success: function() {
            Kinvey.User.create(attr, options);
          }
        }));
        return;
      }

      // Create a new user.
      var user = options._target || new Kinvey.User(attr);
      Kinvey.Entity.prototype.save.call(user, merge(options, {
        success: bind(user, function(_, info) {
          // Extract token.
          var token = this.attr._kmd.authtoken;
          delete this.attr._kmd.authtoken;
          this._login(token);

          options.success && options.success(this, info);
        })
      }));
      return user;// return the instance
    },

    /**
     * Initializes a current user. Returns the current user, otherwise creates
     * an anonymous user. This method is called internally when doing a network
     * request. Manually invoking this function is however allowed.
     * 
     * @param {Object} [options]
     * @param {function(user)} [options.success] Success callback.
     * @param {function(error)} [options.error] Failure callback.
     * @return {Kinvey.User} The user instance. (not necessarily persisted yet).
     */
    init: function(options) {
      options || (options = {});

      // Check whether there already is a current user.
      var user = Kinvey.getCurrentUser();
      if(null !== user) {
        options.success && options.success(user, {});
        return user;
      }

      // No cached user available, create anonymous user.
      return Kinvey.User.create({}, options);
    },

    /**
     * Restores user stored locally on the device. This method is called by
     * Kinvey.init(), and should not be called anywhere else.
     * 
     * @private
     */
    _restore: function() {
      // Return if there already is a current user. Safety check.
      if(null !== Kinvey.getCurrentUser()) {
        return;
      }

      // Retrieve and restore user from storage.
      var data = Storage.get(CACHE_TAG());
      if(null !== data && null != data.token && null != data.user) {
        new Kinvey.User(data.user)._login(data.token);
      }
    }
  });

  // Define the Kinvey UserCollection class.
  Kinvey.UserCollection = Kinvey.Collection.extend({
    // Mapped entity class.
    entity: Kinvey.User,

    /**
     * Creates new user collection.
     * 
     * @example <code>
     * var collection = new Kinvey.UserCollection();
     * </code>
     * 
     * @name Kinvey.UserCollection
     * @constructor
     * @extends Kinvey.Collection
     * @param {Object} options Options.
     */
    constructor: function(options) {
      Kinvey.Collection.prototype.constructor.call(this, 'user', options);
    },

    /** @lends Kinvey.UserCollection# */

    /**
     * Clears collection. This action is not allowed.
     * 
     * @override
     */
    clear: function(options) {
      options && options.error && options.error({
        code: Kinvey.Error.OPERATION_DENIED,
        description: 'This operation is not allowed',
        debug: ''
      });
    }
  });

  // Define the Kinvey Metadata class.
  Kinvey.Metadata = Base.extend({
    /**
     * Creates a new metadata instance.
     * 
     * @name Kinvey.Metadata
     * @constructor
     * @param {Object} [attr] Attributes containing metadata.
     */
    constructor: function(attr) {
      attr || (attr = {});
      this.acl = attr._acl || {};
      this.kmd = attr._kmd || {};
    },

    /** @lends Kinvey.Metadata# */

    /**
     * Adds item read permissions for user.
     * 
     * @param {string} user User id.
     */
    addReader: function(user) {
      this.acl.r || (this.acl.r = []);
      if(-1 === this.acl.r.indexOf(user)) {
        this.acl.r.push(user);
      }
    },

    /**
     * Adds item write permissions for user.
     * 
     * @param {string} user User id.
     */
    addWriter: function(user) {
      this.acl.w || (this.acl.w = []);
      if(-1 === this.acl.w.indexOf(user)) {
        this.acl.w.push(user);
      }
    },

    /**
     * Returns all readers.
     * 
     * @return {Array} List of readers.
     */
    getReaders: function() {
      return this.acl.r || [];
    },

    /**
     * Returns all writers.
     * 
     * @return {Array} List of writers.
     */
    getWriters: function() {
      return this.acl.w || [];
    },

    /**
     * Returns whether the current user owns the item. This method
     * is only useful when the class is created with a predefined
     * ACL.
     * 
     * @returns {boolean}
     */
    isOwner: function() {
      var owner = this.acl.creator;
      var currentUser = Kinvey.getCurrentUser();

      // If owner is undefined, assume entity is just created.
      if(owner) {
        return !!currentUser && owner === currentUser.getId();
      }
      return true;
    },

    /**
     * Returns last modified date, or null if not set.
     * 
     * @return {string} ISO-8601 formatted date.
     */
    lastModified: function() {
      return this.kmd.lmt || null;
    },

    /**
     * Returns whether the current user has write permissions.
     * 
     * @returns {Boolean}
     */
    hasWritePermissions: function() {
      if(this.isOwner() || this.isGloballyWritable()) {
        return true;
      }

      var currentUser = Kinvey.getCurrentUser();
      if(currentUser && this.acl.w) {
        return -1 !== this.acl.w.indexOf(currentUser.getId());
      }
      return false;
    },

    /**
     * Returns whether the item is globally readable.
     * 
     * @returns {Boolean}
     */
    isGloballyReadable: function() {
      return !!this.acl.gr;
    },

    /**
     * Returns whether the item is globally writable.
     * 
     * @returns {Boolean}
     */
    isGloballyWritable: function() {
      return !!this.acl.gw;
    },

    /**
     * Removes item read permissions for user.
     * 
     * @param {string} user User id.
     */
    removeReader: function(user) {
      if(this.acl.r) {
        var index = this.acl.r.indexOf(user);
        if(-1 !== index) {
          this.acl.r.splice(index, 1);
        }
      }
    },

    /**
     * Removes item write permissions for user.
     * 
     * @param {string} user User id.
     */
    removeWriter: function(user) {
      if(this.acl.w) {
        var index = this.acl.w.indexOf(user);
        if(-1 !== index) {
          this.acl.w.splice(index, 1);
        }
      }
    },

    /**
     * Sets whether the item is globally readable.
     * 
     * @param {Boolean} flag
     */
    setGloballyReadable: function(flag) {
      this.acl.gr = !!flag;
    },

    /**
     * Sets whether the item is globally writable.
     * 
     * @param {Boolean} flag
     */
    setGloballyWritable: function(flag) {
      this.acl.gw = !!flag;
    },

    /**
     * Returns JSON representation. Used by JSON#stringify.
     * 
     * @returns {object} JSON representation.
     */
    toJSON: function() {
      return {
        _acl: this.acl,
        _kmd: this.kmd
      };
    }
  });

  /**
   * Kinvey Resource namespace definition.
   * 
   * @namespace
   */
  Kinvey.Resource = {
    /**
     * Destroys a file.
     * 
     * @param {string} name Filename.
     * @param {Object} [options] Options.
     */
    destroy: function(name, options) {
      Kinvey.Resource._store || (Kinvey.Resource._store = Kinvey.Store.factory(Kinvey.Store.BLOB));
      Kinvey.Resource._store.remove({ name: name }, options);
    },

    /**
     * Downloads a file, or returns the download URI.
     * 
     * @param {string} name Filename.
     * @param {Object} [options] Options.
     */
    download: function(name, options) {
      Kinvey.Resource._store || (Kinvey.Resource._store = Kinvey.Store.factory(Kinvey.Store.BLOB));
      Kinvey.Resource._store.query(name, options);
    },

    /**
     * Uploads a file.
     * 
     * @param {Object} file File.
     * @param {Object} [options] Options.
     * @throws {Error} On invalid file.
     */
    upload: function(file, options) {
      // Validate file.
      if(null == file || null == file.name || null == file.data) {
        throw new Error('File should be an object containing name and data');
      }
      Kinvey.Resource._store || (Kinvey.Resource._store = Kinvey.Store.factory(Kinvey.Store.BLOB));
      Kinvey.Resource._store.save(file, options);
    },

    /**
     * We only need one instance of the blob store.
     * 
     * @private
     */
    _store: null
  };

  // Define the Kinvey Query class.
  Kinvey.Query = Base.extend({
    // Key under condition.
    currentKey: null,

    /**
     * Creates a new query.
     * 
     * @example <code>
     * var query = new Kinvey.Query();
     * </code>
     * 
     * @name Kinvey.Query
     * @constructor
     * @param {Object} [builder] One of Kinvey.Query.* builders.
     */
    constructor: function(builder) {
      this.builder = builder || Kinvey.Query.factory();
    },

    /** @lends Kinvey.Query# */

    /**
     * Sets an all condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must be an Array containing both "foo" and "bar".
     * var query = new Kinvey.Query();
     * query.on('field').all(['foo', 'bar']);
     * </code>
     * 
     * @param {Array} expected Array of expected values.
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    all: function(expected) {
      if(!(expected instanceof Array)) {
        throw new Error('Argument must be of type Array');
      }
      this._set(Kinvey.Query.ALL, expected);
      return this;
    },

    /**
     * Sets an AND condition.
     * 
     * @example <code>
     * // Attribute "field1" must have value "foo", and "field2" must have value "bar".
     * var query1 = new Kinvey.Query();
     * var query2 = new Kinvey.Query();
     * query1.on('field1').equal('foo');
     * query2.on('field2').equal('bar');
     * query1.and(query2);
     * </code>
     * 
     * @param {Kinvey.Query} query Query to AND.
     * @throws {Error} On invalid instance.
     * @return {Kinvey.Query} Current instance.
     */
    and: function(query) {
      this._set(Kinvey.Query.AND, query.builder, true);// do not throw.
      return this;
    },

    /**
     * Sets an equal condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have value "foo".
     * var query = new Kinvey.Query();
     * query.on('field').equal('foo');
     * </code>
     * 
     * @param {*} expected Expected value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    equal: function(expected) {
      this._set(Kinvey.Query.EQUAL, expected);
      return this;
    },

    /**
     * Sets an exist condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must exist.
     * var query = new Kinvey.Query();
     * query.on('field').exist();
     * </code>
     * 
     * @param {boolean} [expected] Boolean indicating whether field must be
     *          present. Defaults to true.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    exist: function(expected) {
      // Make sure the argument is of type boolean.
      expected = 'undefined' !== typeof expected ? !!expected : true;

      this._set(Kinvey.Query.EXIST, expected);
      return this;
    },

    /**
     * Sets a greater than condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value greater than 25.
     * var query = new Kinvey.Query();
     * query.on('field').greaterThan(25);
     * </code>
     * 
     * @param {*} value Compared value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    greaterThan: function(value) {
      this._set(Kinvey.Query.GREATER_THAN, value);
      return this;
    },

    /**
     * Sets a greater than equal condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value greater than or equal to 25.
     * var query = new Kinvey.Query();
     * query.on('field').greaterThanEqual(25);
     * </code>
     * 
     * @param {*} value Compared value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    greaterThanEqual: function(value) {
      this._set(Kinvey.Query.GREATER_THAN_EQUAL, value);
      return this;
    },

    /**
     * Sets an in condition on the current key. Method has underscore
     * postfix since "in" is a reserved word.
     * 
     * @example <code>
     * // Attribute "field" must be an Array containing "foo" and/or "bar".
     * var query = new Kinvey.Query();
     * query.on('field').in_(['foo', 'bar']);
     * </code>
     * 
     * @param {Array} expected Array of expected values.
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    in_: function(expected) {
      if(!(expected instanceof Array)) {
        throw new Error('Argument must be of type Array');
      }
      this._set(Kinvey.Query.IN, expected);
      return this;
    },

    /**
     * Sets a less than condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value less than 25.
     * var query = new Kinvey.Query();
     * query.on('field').lessThan(25);
     * </code>
     * 
     * @param {*} value Compared value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    lessThan: function(value) {
      this._set(Kinvey.Query.LESS_THAN, value);
      return this;
    },

    /**
     * Sets a less than equal condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value less than or equal to 25.
     * var query = new Kinvey.Query();
     * query.on('field').lessThanEqual(25);
     * </code>
     * 
     * @param {*} value Compared value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    lessThanEqual: function(value) {
      this._set(Kinvey.Query.LESS_THAN_EQUAL, value);
      return this;
    },

    /**
     * Sets a near sphere condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must be a point within a 10 mile radius of [-71, 42].
     * var query = new Kinvey.Query();
     * query.on('field').nearSphere([-71, 42], 10);
     * </code>
     * 
     * @param {Array} point Point [lng, lat].
     * @param {number} [maxDistance] Max distance from point in miles.
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    nearSphere: function(point, maxDistance) {
      if(!(point instanceof Array) || 2 !== point.length) {
        throw new Error('Point must be of type Array[lng, lat]');
      }
      this._set(Kinvey.Query.NEAR_SPHERE, {
        point: point,
        maxDistance: 'undefined' !== typeof maxDistance ? maxDistance : null
      });
      return this;
    },

    /**
     * Sets a not equal condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value not equal to "foo".
     * var query = new Kinvey.Query();
     * query.on('field').notEqual('foo');
     * </code>
     * 
     * @param {*} value Unexpected value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    notEqual: function(unexpected) {
      this._set(Kinvey.Query.NOT_EQUAL, unexpected);
      return this;
    },

    /**
     * Sets a not in condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value not equal to "foo" or "bar".
     * var query = new Kinvey.Query();
     * query.on('field').notIn(['foo', 'bar']);
     * </code>
     * 
     * @param {Array} unexpected Array of unexpected values.
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    notIn: function(unexpected) {
      if(!(unexpected instanceof Array)) {
        throw new Error('Argument must be of type Array');
      }
      this._set(Kinvey.Query.NOT_IN, unexpected);
      return this;
    },

    /**
     * Sets key under condition.
     * 
     * @param {string} key Key under condition.
     * @return {Kinvey.Query} Current instance.
     */
    on: function(key) {
      this.currentKey = key;
      return this;
    },

    /**
     * Sets an OR condition.
     * 
     * @example <code>
     * // Attribute "field1" must have value "foo", or "field2" must have value "bar".
     * var query1 = new Kinvey.Query();
     * var query2 = new Kinvey.Query();
     * query1.on('field1').equal('foo');
     * query2.on('field2').equal('bar');
     * query1.or(query2);
     * </code>
     * 
     * @param {Kinvey.Query} query Query to OR.
     * @throws {Error} On invalid instance.
     * @return {Kinvey.Query} Current instance.
     */
    or: function(query) {
      this._set(Kinvey.Query.OR, query.builder, true);// do not throw.
      return this;
    },

    /**
     * Sets a not in condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value starting with foo.
     * var query = new Kinvey.Query();
     * query.on('field').regex(/^foo/);
     * </code>
     * 
     * @param {object} expected Regular expression.
     * @throws {Error} On invalid regular expression.
     * @return {Kinvey.Query} Current instance.
     */
    regex: function(expected) {
      this._set(Kinvey.Query.REGEX, expected);
      return this;
    },

    /**
     * Resets all filters.
     * 
     * @return {Kinvey.Query} Current instance.
     */
    reset: function() {
      this.builder.reset();
      return this;
    },

    /**
     * Sets the query limit.
     * 
     * @param {number} limit Limit.
     * @return {Kinvey.Query} Current instance.
     */
    setLimit: function(limit) {
      this.builder.setLimit(limit);
      return this;
    },

    /**
     * Sets the query skip.
     * 
     * @param {number} skip Skip.
     * @return {Kinvey.Query} Current instance.
     */
    setSkip: function(skip) {
      this.builder.setSkip(skip);
      return this;
    },

    /**
     * Sets a size condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must be an Array with 25 elements.
     * var query = new Kinvey.Query();
     * query.on('field').size(25);
     * </code>
     * 
     * @param {number} expected Expected value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    size: function(expected) {
      this._set(Kinvey.Query.SIZE, expected);
      return this;
    },

    /**
     * Sets the query sort.
     * 
     * @param {number} [direction] Sort direction, or null to reset sort.
     *          Defaults to ascending.
     * @return {Kinvey.Query} Current instance.
     */
    sort: function(direction) {
      if(null !== direction) {
        direction = direction || Kinvey.Query.ASC;
      }
      this.builder.setSort(this.currentKey, direction);
      return this;
    },

    /**
     * Returns JSON representation.
     * 
     * @return {Object} JSON representation.
     */
    toJSON: function() {
      return this.builder.toJSON();
    },

    /**
     * Sets a within box condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must be a point within the box [-72, 41], [-70, 43].
     * var query = new Kinvey.Query();
     * query.on('field').withinBox([[-72, 41], [-70, 43]]);
     * </code>
     * 
     * @param {Array} points Array of two points [[lng, lat], [lng, lat]].
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    withinBox: function(points) {
      if(!(points instanceof Array) || 2 !== points.length) {
        throw new Error('Points must be of type Array[[lng, lat], [lng, lat]]');
      }
      this._set(Kinvey.Query.WITHIN_BOX, points);
      return this;
    },

    /**
     * Sets a within center sphere condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must be a point within a 10 mile radius of [-71, 42].
     * var query = new Kinvey.Query();
     * query.on('field').withinCenterSphere([-72, 41], 0.0025);
     * </code>
     * 
     * @param {Array} point Point [lng, lat].
     * @param {number} radius Radius in radians.
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    withinCenterSphere: function(point, radius) {
      if(!(point instanceof Array) || 2 !== point.length) {
        throw new Error('Point must be of type Array[lng, lat]');
      }
      this._set(Kinvey.Query.WITHIN_CENTER_SPHERE, {
        center: point,
        radius: radius
      });
      return this;
    },

    /**
     * Sets a within polygon condition on the current key.
     * 
     * @param {Array} points Array of points [[lng, lat], ...].
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    withinPolygon: function(points) {
      if(!(points instanceof Array)) {
        throw new Error('Points must be of type Array[[lng, lat], ...]');
      }
      this._set(Kinvey.Query.WITHIN_POLYGON, points);
      return this;
    },

    /**
     * Helper function to forward condition to builder.
     * 
     * @private
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     */
    _set: function(operator, value, bypass) {
      // Bypass flag can be used to avoid throwing an error.
      if(null === this.currentKey && !bypass) {
        throw new Error('Key under condition must not be null');
      }
      this.builder.addCondition(this.currentKey, operator, value);
    }
  }, {
    /** @lends Kinvey.Query */

    // Basic operators.
    /**
     * Equal operator. Checks if an element equals the specified expression.
     * 
     * @constant
     */
    EQUAL: 16,

    /**
     * Exist operator. Checks if an element exists.
     * 
     * @constant
     */
    EXIST: 17,

    /**
     * Less than operator. Checks if an element is less than the specified
     * expression.
     * 
     * @constant
     */
    LESS_THAN: 18,

    /**
     * Less than or equal to operator. Checks if an element is less than or
     * equal to the specified expression.
     * 
     * @constant
     */
    LESS_THAN_EQUAL: 19,

    /**
     * Greater than operator. Checks if an element is greater than the
     * specified expression.
     * 
     * @constant
     */
    GREATER_THAN: 20,

    /**
     * Greater than or equal to operator. Checks if an element is greater
     * than or equal to the specified expression.
     * 
     * @constant
     */
    GREATER_THAN_EQUAL: 21,

    /**
     * Not equal operator. Checks if an element does not equals the
     * specified expression.
     * 
     * @constant
     */
    NOT_EQUAL: 22,

    /**
     * Regular expression operator. Checks if an element matches the specified
     * expression.
     * 
     * @constant
     */
    REGEX: 23,

    // Geoqueries.
    /**
     * Near sphere operator. Checks if an element is close to the point in
     * the specified expression.
     * 
     * @constant
     */
    NEAR_SPHERE: 1024,

    /**
     * Within box operator. Checks if an element is within the box shape as
     * defined by the expression.
     * 
     * @constant
     */
    WITHIN_BOX: 1025,

    /**
     * Within center sphere operator. Checks if an element is within a
     * center sphere as defined by the expression.
     * 
     * @constant
     */
    WITHIN_CENTER_SPHERE: 1026,

    /**
     * Within polygon operator. Checks if an element is within a polygon
     * shape as defined by the expression.
     * 
     * @constant
     */
    WITHIN_POLYGON: 1027,

    /**
     * Max distance operator. Checks if an element is within a certain
     * distance to the point in the specified expression. This operator
     * requires the use of the near operator as well.
     * 
     * @constant
     */
    MAX_DISTANCE: 1028,

    // Set membership
    /**
     * In operator. Checks if an element matches any values in the specified
     * expression.
     * 
     * @constant
     */
    IN: 2048,

    /**
     * Not in operator. Checks if an element does not match any value in the
     * specified expression.
     * 
     * @constant
     */
    NOT_IN: 2049,

    // Joining operators.
    /**
     * And operator. Supported implicitly.
     * 
     * @constant
     */
    AND: 4096,

    /**
     * Or operator. Not supported.
     * 
     * @constant
     */
    OR: 4097,

    // Array operators.
    /**
     * All operator. Checks if an element matches all values in the
     * specified expression
     * 
     * @constant
     */
    ALL: 8192,

    /**
     * Size operator. Checks if the size of an element matches the specified
     * expression.
     * 
     * @constant
     */
    SIZE: 8193,

    // Sort operators.
    /**
     * Ascending sort operator.
     * 
     * @constant
     */
    ASC: 16384,

    /**
     * Descending sort operator.
     * 
     * @constant
     */
    DESC: 16385,

    /**
     * Returns a query builder.
     * 
     * @return {Object} One of Kinvey.Query.* builders.
     */
    factory: function() {
      // Currently, only the Mongo builder is supported.
      return new Kinvey.Query.MongoBuilder();
    }
  });

  // Define the Kinvey Query MongoBuilder class.
  Kinvey.Query.MongoBuilder = Base.extend({
    // Conditions.
    limit: null,
    skip: null,
    sort: null,
    query: null,

    /**
     * Creates a new MongoDB query builder.
     * 
     * @name Kinvey.Query.MongoBuilder
     * @constructor
     */
    constructor: function() {
      //
    },

    /** @lends Kinvey.Query.MongoBuilder# */

    /**
     * Adds condition.
     * 
     * @param {string} field Field.
     * @param {number} condition Condition.
     * @param {*} value Expression.
     * @throws {Error} On unsupported condition.
     */
    addCondition: function(field, condition, value) {
      switch(condition) {
        // Basic operators.
        // @see http://www.mongodb.org/display/DOCS/Advanced+Queries
        case Kinvey.Query.EQUAL:
          this._set(field, value);
          break;
        case Kinvey.Query.EXIST:
          this._set(field, { $exists: value });
          break;
        case Kinvey.Query.LESS_THAN:
          this._set(field, {$lt: value});
          break;
        case Kinvey.Query.LESS_THAN_EQUAL:
          this._set(field, {$lte: value});
          break;
        case Kinvey.Query.GREATER_THAN:
          this._set(field, {$gt: value});
          break;
        case Kinvey.Query.GREATER_THAN_EQUAL:
          this._set(field, {$gte: value});
          break;
        case Kinvey.Query.NOT_EQUAL:
          this._set(field, {$ne: value});
          break;
        case Kinvey.Query.REGEX:
          // Filter through RegExp, this will throw an error on invalid regex.
          var regex = new RegExp(value);
          var options = ((regex.global) ? 'g' : '') + ((regex.ignoreCase) ? 'i' : '') + ((regex.multiline) ? 'm' : '');
          this._set(field, { $regex: regex.source, $options: options });
          break;

        // Geoqueries.
        // @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
        case Kinvey.Query.NEAR_SPHERE:
          var query = { $nearSphere: value.point };
          value.maxDistance && (query.$maxDistance = value.maxDistance);
          this._set(field, query);
          break;
        case Kinvey.Query.WITHIN_BOX:
          this._set(field, {$within: {$box: value}});
          break;
        case Kinvey.Query.WITHIN_CENTER_SPHERE:
          this._set(field, {$within: {$centerSphere: [value.center, value.radius] }});
          break;
        case Kinvey.Query.WITHIN_POLYGON:
          this._set(field, {$within: {$polygon: value}});
          break;

        // Set membership.
        // @see http://www.mongodb.org/display/DOCS/Advanced+Queries
        case Kinvey.Query.IN:
          this._set(field, {$in: value});
          break;
        case Kinvey.Query.NOT_IN:
          this._set(field, {$nin: value});
          break;

        // Joining operators.
        case Kinvey.Query.AND:
          if(!(value instanceof Kinvey.Query.MongoBuilder)) {
            throw new Error('Query must be of type Kinvey.Query.Mongobuilder');
          }
          this.query = { $and: [this.query || {}, value.query || {}] };
          break;
        case Kinvey.Query.OR:
          if(!(value instanceof Kinvey.Query.MongoBuilder)) {
            throw new Error('Query must be of type Kinvey.Query.Mongobuilder');
          }
          this.query = { $or: [this.query || {}, value.query || {}] };
          break;

        // Array operators.
        // @see http://www.mongodb.org/display/DOCS/Advanced+Queries
        case Kinvey.Query.ALL:
          this._set(field, {$all: value});
          break;
        case Kinvey.Query.SIZE:
          this._set(field, {$size: value});
          break;

        // Other operator.
        default:
          throw new Error('Condition ' + condition + ' is not supported');
      }
    },

    /**
     * Resets query.
     * 
     */
    reset: function() {
      this.query = null;
    },

    /**
     * Sets query limit.
     * 
     * @param {number} limit Limit, or null to reset limit.
     */
    setLimit: function(limit) {
      this.limit = limit;
    },

    /**
     * Sets query skip.
     * 
     * @param {number} skip Skip, or null to reset skip.
     */
    setSkip: function(skip) {
      this.skip = skip;
    },

    /**
     * Sets query sort.
     * 
     * @param {string} field Field.
     * @param {number} direction Sort direction, or null to reset sort.
     */
    setSort: function(field, direction) {
      if(null == direction) {
        this.sort = null;// hard reset
        return;
      }

      // Set sort value.
      var value = Kinvey.Query.ASC === direction ? 1 : -1;
      this.sort = {};// reset
      this.sort[field] = value;
    },

    /**
     * Returns JSON representation. Used by JSON#stringify.
     * 
     * @return {Object} JSON representation.
     */
    toJSON: function() {
      var result = {};
      this.limit && (result.limit = this.limit);
      this.skip && (result.skip = this.skip);
      this.sort && (result.sort = this.sort);
      this.query && (result.query = this.query);
      return result;
    },

    /**
     * Helper function to add expression to field.
     * 
     * @private
     */
    _set: function(field, expression) {
      this.query || (this.query = {});
      if(!(expression instanceof Object)) {// simple condition
        this.query[field] = expression;
        return;
      }

      // Complex condition.
      this.query[field] instanceof Object || (this.query[field] = {});
      for(var operator in expression) {
        if(expression.hasOwnProperty(operator)) {
          this.query[field][operator] = expression[operator];
        }
      }
    }
  });

  // Define the Kinvey Aggregation class.
  Kinvey.Aggregation = Base.extend({
    /**
     * Creates a new aggregation.
     * 
     * @example <code>
     * var aggregation = new Kinvey.Aggregation();
     * </code>
     * 
     * @name Kinvey.Aggregation
     * @constructor
     * @param {Object} [builder] One of Kinvey.Aggregation.* builders.
     */
    constructor: function(builder) {
      this.builder = builder || Kinvey.Aggregation.factory();
    },

    /** @lends Kinvey.Aggregation# */

    /**
     * Adds key under condition.
     * 
     * @param {string} key Key under condition.
     * @return {Kinvey.Aggregation} Current instance.
     */
    on: function(key) {
      this.builder.on(key);
      return this;
    },

    /**
     * Sets the finalize function. Currently not supported.
     * 
     * @param {function(doc, counter)} fn Finalize function.
     * @return {Kinvey.Aggregation} Current instance.
     */
    setFinalize: function(fn) {
      this.builder.setFinalize(fn);
    },

    /**
     * Sets the initial counter object.
     * 
     * @param {Object} counter Counter object.
     * @return {Kinvey.Aggregation} Current instance.
     */
    setInitial: function(counter) {
      this.builder.setInitial(counter);
      return this;
    },

    /**
     * Sets query.
     * 
     * @param {Kinvey.Query} [query] query.
     * @throws {Error} On invalid instance.
     * @return {Kinvey.Aggregation} Current instance.
     */
    setQuery: function(query) {
      if(query && !(query instanceof Kinvey.Query)) {
        throw new Error('Query must be an instanceof Kinvey.Query');
      }
      this.builder.setQuery(query);
      return this;
    },

    /**
     * Sets the reduce function.
     * 
     * @param {function(doc, counter)} fn Reduce function.
     * @return {Kinvey.Aggregation} Current instance.
     */
    setReduce: function(fn) {
      this.builder.setReduce(fn);
      return this;
    },

    /**
     * Returns JSON representation.
     * 
     * @return {Object} JSON representation.
     */
    toJSON: function() {
      return this.builder.toJSON();
    }
  }, {
    /** @lends Kinvey.Aggregation */

    /**
     * Returns an aggregation builder.
     * 
     * @return {Object} One of Kinvey.Aggregation.* builders.
     */
    factory: function() {
      // Currently, only the Mongo builder is supported.
      return new Kinvey.Aggregation.MongoBuilder();
    }
  });

  // Define the Kinvey Aggregation MongoBuilder class.
  Kinvey.Aggregation.MongoBuilder = Base.extend({
    // Fields.
    finalize: function() { },
    initial: { count: 0 },
    keys: null,
    reduce: function(doc, out) {
      out.count++;
    },
    query: null,

    /**
     * Creates a new MongoDB aggregation builder.
     * 
     * @name Kinvey.Aggregation.MongoBuilder
     * @constructor
     */
    constructor: function() {
      // Set keys property explicitly on this instance, otherwise the prototype
      // will be overloaded.
      this.keys = {};
    },

    /** @lends Kinvey.Aggregation.MongoBuilder# */

    /**
     * Adds key under condition.
     * 
     * @param {string} key Key under condition.
     * @return {Kinvey.Aggregation} Current instance.
     */
    on: function(key) {
      this.keys[key] = true;
    },

    /**
     * Sets the finalize function.
     * 
     * @param {function(counter)} fn Finalize function.
     */
    setFinalize: function(fn) {
      this.finalize = fn;
    },

    /**
     * Sets the initial counter object.
     * 
     * @param {Object} counter Counter object.
     */
    setInitial: function(counter) {
      this.initial = counter;
    },

    /**
     * Sets query.
     * 
     * @param {Kinvey.Query} [query] query.
     */
    setQuery: function(query) {
      this.query = query;
      return this;
    },

    /**
     * Sets the reduce function.
     * 
     * @param {function(doc, out)} fn Reduce function.
     */
    setReduce: function(fn) {
      this.reduce = fn;
    },

    /**
     * Returns JSON representation.
     * 
     * @return {Object} JSON representation.
     */
    toJSON: function() {
      // Required fields.
      var result = {
        finalize: this.finalize.toString(),
        initial: this.initial,
        key: this.keys,
        reduce: this.reduce.toString()
      };

      // Optional fields.
      var query = this.query && this.query.toJSON().query;
      query && (result.condition = query);

      return result;
    }
  });

  /**
   * Kinvey Store namespace. Home to all stores.
   * 
   * @namespace
   */
  Kinvey.Store = {
    /**
     * AppData store.
     * 
     * @constant
     */
    APPDATA: 'appdata',

    /**
     * Blob store.
     * 
     * @constant
     */
    BLOB: 'blob',

    /**
     * Returns store.
     * 
     * @param {string} name Store name.
     * @param {string} collection Collection name.
     * @param {Object} options Store options.
     * @return {Kinvey.Store.*} One of Kinvey.Store.*.
     */
    factory: function(name, collection, options) {
      // Create store by name.
      if(Kinvey.Store.BLOB === name) {
        return new Kinvey.Store.Blob(collection, options);
      }

      // By default, use the AppData store.
      return new Kinvey.Store.AppData(collection, options);
    }
  };

  // Define the Kinvey.Store.AppData class.
  Kinvey.Store.AppData = Base.extend({
    // Store name.
    name: Kinvey.Store.APPDATA,

    // Default options.
    options: {
      timeout: 10000,// Timeout in ms.

      success: function() { },
      error: function() { }
    },

    /**
     * Creates a new store.
     * 
     * @name Kinvey.Store.AppData
     * @constructor
     * @param {string} collection Collection name.
     * @param {Object} [options] Options.
     */
    constructor: function(collection, options) {
      this.api = Kinvey.Store.AppData.USER_API === collection ? Kinvey.Store.AppData.USER_API : Kinvey.Store.AppData.APPDATA_API;
      this.collection = collection;

      // Options.
      options && this.configure(options);
    },

    /** @lends Kinvey.Store.AppData# */

    /**
     * Aggregates objects from the store.
     * 
     * @param {Object} aggregation Aggregation.
     * @param {Object} [options] Options.
     */
    aggregate: function(aggregation, options) {
      var url = this._getUrl({ id: '_group' });
      this._send('POST', url, JSON.stringify(aggregation), options);
    },

    /**
     * Configures store.
     * 
     * @param {Object} options
     * @param {function(response, info)} [options.success] Success callback.
     * @param {function(error, info)} [options.error] Failure callback.
     * @param {integer} [options.timeout] Request timeout (in milliseconds).
     */
    configure: function(options) {
      'undefined' !== typeof options.timeout && (this.options.timeout = options.timeout);

      options.success && (this.options.success = options.success);
      options.error && (this.options.error = options.error);
    },

    /**
     * Logs in user.
     * 
     * @param {Object} object
     * @param {Object} [options] Options.
     */
    login: function(object, options) {
      var url = this._getUrl({ id: 'login' });
      this._send('POST', url, JSON.stringify(object), options);
    },

    /**
     * Logs out user.
     * 
     * @param {Object} object
     * @param {Object} [options] Options.
     */
    logout: function(object, options) {
      var url = this._getUrl({ id: '_logout' });
      this._send('POST', url, null, options);
    },

    /**
     * Queries the store for a specific object.
     * 
     * @param {string} id Object id.
     * @param {Object} [options] Options.
     */
    query: function(id, options) {
      options || (options = {});

      var url = this._getUrl({ id: id, resolve: options.resolve });
      this._send('GET', url, null, options);
    },

    /**
     * Queries the store for multiple objects.
     * 
     * @param {Object} query Query object.
     * @param {Object} [options] Options.
     */
    queryWithQuery: function(query, options) {
      options || (options = {});

      var url = this._getUrl({ query: query, resolve: options.resolve });
      this._send('GET', url, null, options);
    },

    /**
     * Removes object from the store.
     * 
     * @param {Object} object Object to be removed.
     * @param {Object} [options] Options.
     */
    remove: function(object, options) {
      var url = this._getUrl({ id: object._id });
      this._send('DELETE', url, null, options);
    },

    /**
     * Removes multiple objects from the store.
     * 
     * @param {Object} query Query object.
     * @param {Object} [options] Options.
     */
    removeWithQuery: function(query, options) {
      var url = this._getUrl({ query: query });
      this._send('DELETE', url, null, options);
    },

    /**
     * Saves object to the store.
     * 
     * @param {Object} object Object to be saved.
     * @param {Object} [options] Options.
     */
    save: function(object, options) {
      // Create the object if nonexistent, update otherwise.
      var method = object._id ? 'PUT' : 'POST';

      var url = this._getUrl({ id: object._id });
      this._send(method, url, JSON.stringify(object), options);
    },

    /**
     * Encodes value for use in query string.
     * 
     * @private
     * @param {*} value Value to be encoded.
     * @return {string} Encoded value.
     */
    _encode: function(value) {
      if(value instanceof Object) {
        value = JSON.stringify(value);
      }
      return encodeURIComponent(value);
    },

    /**
     * Constructs URL.
     * 
     * @private
     * @param {Object} parts URL parts.
     * @return {string} URL.
     */
    _getUrl: function(parts) {
      var url = '/' + this.api + '/' + Kinvey.appKey + '/';

      // Only the AppData API has explicit collections.
      if(Kinvey.Store.AppData.APPDATA_API === this.api && null != this.collection) {
        url += this.collection + '/';
      }
      parts.id && (url += parts.id);

      // Build query string.
      var param = [];
      if(null != parts.query) {
        // Required query parts.
        param.push('query=' + this._encode(parts.query.query || {}));

        // Optional query parts.
        parts.query.limit && param.push('limit=' + this._encode(parts.query.limit));
        parts.query.skip && param.push('skip=' + this._encode(parts.query.skip));
        parts.query.sort && param.push('sort=' + this._encode(parts.query.sort));
      }

      // Resolve references.
      if(parts.resolve) {
        param.push('resolve=' + parts.resolve.join(','));
      }

      // Android < 4.0 caches all requests aggressively. For now, work around
      // by adding a cache busting query string.
      param.push('_=' + new Date().getTime());

      return url + '?' + param.join('&');
    }
  }, {
    // Path constants.
    APPDATA_API: 'appdata',
    USER_API: 'user'
  });

  // Apply mixin.
  Xhr.call(Kinvey.Store.AppData.prototype);

  // Define the Kinvey.Store.Blob class.
  Kinvey.Store.Blob = Base.extend({
    // Store name.
    name: Kinvey.Store.BLOB,

    // Default options.
    options: {
      timeout: 10000,// Timeout in ms.

      success: function() { },
      error: function() { }
    },

    /**
     * Creates a new store.
     * 
     * @name Kinvey.Store.Blob
     * @constructor
     * @param {string} collection Collection name.
     * @param {Object} [options] Options.
     */
    constructor: function(collection, options) {
      // Ignore the collection name, as the blob API has only one collection.
      options && this.configure(options);
    },

    /** @lends Kinvey.Store.Blob# */

    /**
     * Configures store.
     * 
     * @param {Object} options
     * @param {function(response, info)} [options.success] Success callback.
     * @param {function(error, info)} [options.error] Failure callback.
     * @param {integer} [options.timeout] Request timeout (in milliseconds).
     */
    configure: function(options) {
      'undefined' !== typeof options.timeout && (this.options.timeout = options.timeout);
      options.success && (this.options.success = options.success);
      options.error && (this.options.error = options.error);
    },

    /**
     * Downloads a file.
     * 
     * @param {string} name Filename.
     * @param {Object} [options] Options.
     */
    query: function(name, options) {
      options = this._options(options);

      // Send request to obtain the download URL.
      var url = this._getUrl('download-loc', name);
      this._send('GET', url, null, merge(options, {
        success: bind(this, function(response, info) {
          // Stop here if the user wants us to.
          if('undefined' !== typeof options.download && !options.download) {
            return options.success(response, info);
          }

          // Otherwise, download the file.
          this._xhr('GET', response.URI, null, merge(options, {
            success: function(response, info) {
              options.success({
                name: name,
                data: response
              }, info);
            },
            error: function(_, info) {
              options.error({
                error: Kinvey.Error.RESPONSE_PROBLEM,
                description: 'There was a problem downloading the file.',
                debug: ''
              }, info);
            }
          }));
        })
      }));
    },

    /**
     * Removes a file.
     * 
     * @param {Object} file File to be removed.
     * @param {Object} [options] Options.
     * @throws {Error} On invalid file.
     */
    remove: function(file, options) {
      // Validate file.
      if(null == file || null == file.name) {
        throw new Error('File should be an object containing name');
      }
      options = this._options(options);

      // Send request to obtain the delete URL.
      var url = this._getUrl('remove-loc', file.name);
      this._send('GET', url, null, merge(options, {
        success: bind(this, function(response, info) {
          // Delete the file.
          this._xhr('DELETE', response.URI, null, merge(options, {
            success: function(_, info) {
              options.success && options.success(null, info);
            },
            error: function(_, info) {
              options.error({
                error: Kinvey.Error.RESPONSE_PROBLEM,
                description: 'There was a problem deleting the file.',
                debug: ''
              }, info);
            }
          }));
        })
      }));
    },

    /**
     * Uploads a file.
     * 
     * @param {Object} file File to be uploaded.
     * @param {Object} [options] Options.
     */
    save: function(file, options) {
      options = this._options(options);

      // Send request to obtain the upload URL.
      this._send('GET', this._getUrl('upload-loc', file.name), null, merge(options, {
        success: bind(this, function(response, info) {
          // Upload the file.
          this._xhr('PUT', response.URI, file.data, merge(options, {
            success: function(_, info) {
              options.success(file, info);
            },
            error: function(_, info) {
              options.error({
                error: Kinvey.Error.RESPONSE_PROBLEM,
                description: 'There was a problem uploading the file.',
                debug: ''
              }, info);
            }
          }));
        })
      }));
    },

    /**
     * Constructs URL.
     * 
     * @private
     * @param {string} type One of download-loc, upload-loc or remove-loc.
     * @param {string} filename Filename.
     * @return {string} URL.
     */
    _getUrl: function(type, filename) {
      return '/' + Kinvey.Store.Blob.BLOB_API + '/' + Kinvey.appKey + '/' + type + '/' + filename;
    },

    /**
     * Returns full options object.
     * 
     * @private
     * @param {Object} options Options.
     * @return {Object} Options.
     */
    _options: function(options) {
      options || (options = {});
      'undefined' !== typeof options.timeout || (options.timeout = this.options.timeout);
      options.success || (options.success = this.options.success);
      options.error || (options.error = this.options.error);
      return options;
    }
  }, {
    // Path constants.
    BLOB_API: 'blob'
  });

  // Apply mixin.
  Xhr.call(Kinvey.Store.Blob.prototype);

}.call(this));