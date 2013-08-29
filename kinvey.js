/*!
 * Copyright (c) 2013 Kinvey, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function() {

  // Setup.
  // ------

  // Establish the root object; `window` in the browser, `global` on the
  // server.
  var root = this;

  // Disable debug mode unless declared already.
  if('undefined' === typeof KINVEY_DEBUG) {
    /**
     * Debug mode. This is a global variable, which can be set anywhere,
     * anytime. Not available in the minified version of the library.
     *
     * @global
     * @type {boolean}
     * @default
     */
    KINVEY_DEBUG = false;
  }

  // Lightweight wrapper for `console.log` for easy debugging.
  // http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
  var log = function() {
    log.history = log.history || []; // Store logs to an array for reference.
    log.history.push(arguments);
    if(root.console) {
      root.console.log.call(root.console, Array.prototype.slice.call(arguments));
    }
  };

  // Define a function which returns a fresh copy of the library. Copies are
  // fully isolated from each other, making it very easy to communicate with
  // different apps within the same JavaScript-context.
  var kinveyFn = function() {
    /**
     * The library namespace. Contains all library functionality. Invoke as a
     * function (e.g. `Kinvey()`) to obtain a fresh copy of the library.
     *
     * @exports Kinvey
     */
    var Kinvey = function(options) {
      // Debug.
      if(KINVEY_DEBUG) {
        log('Obtaining a fresh copy of the library.', arguments);
      }

      // Create a fresh copy of the library.
      var Kinvey = kinveyFn();

      // Initialize the library if `options` are provided. If not, the
      // application should call `Kinvey.init` on the return value.
      if(null != options) {
        Kinvey.init(options);
      }

      // Return the copy.
      return Kinvey;
    };

    // From here, all library functionality will be appended to `Kinvey`.

    // Constants.
    // ----------

    /**
     * The Kinvey server.
     *
     * @constant
     * @type {string}
     * @default
     */
    Kinvey.API_ENDPOINT = 'https://baas.kinvey.com';

    /**
     * The Kinvey API version used when communicating with `Kinvey.API_ENDPOINT`.
     *
     * @constant
     * @type {string}
     * @default
     */
    Kinvey.API_VERSION = '3';

    /**
     * The current version of the library.
     *
     * @constant
     * @type {string}
     * @default
     */
    Kinvey.SDK_VERSION = '1.1.0';

    // Properties.
    // -----------

    /**
     * Kinvey App Key.
     *
     * @private
     * @type {?string}
     */
    Kinvey.appKey = null;

    /**
     * Kinvey App Secret.
     *
     * @private
     * @type {?string}
     */
    Kinvey.appSecret = null;

    /**
     * Kinvey Master Secret.
     *
     * @private
     * @type {?string}
     */
    Kinvey.masterSecret = null;

    // Top-level functionality.
    // ------------------------

    // The namespaces of the Kinvey service.
    var DATA_STORE = 'appdata';
    var FILES = 'blob';
    var RPC = 'rpc';
    var USERS = 'user';
    /*var USER_GROUPS = 'group';*/

    // The library has a concept of an active user which represents the person
    // using the app. There can only be one user per copy of the library.

    // The active user.
    var activeUser = null;

    // Status flag indicating whether the active user is ready to be used.
    var activeUserReady = false;

    /**
     * Restores the active user (if any) from disk.
     *
     * @param {Object} options Options.
     * @returns {Promise} The active user, or `null` if there is no active user.
     */
    var restoreActiveUser = function(options) {
      // Retrieve the authtoken from storage. If there is an authtoken, restore the
      // active user from disk.
      var promise = Storage.get('activeUser');
      return promise.then(function(user) {
        // If there is no active user, set to `null`.
        if(null == user) {
          return Kinvey.setActiveUser(null);
        }

        // Debug.
        if(KINVEY_DEBUG) {
          log('Restoring the active user.');
        }

        // Set the active user to a near-empty user with only id and authtoken set.
        var previous = Kinvey.setActiveUser({
          _id: user[0],
          _kmd: {
            authtoken: user[1]
          }
        });

        // If not `options.refresh`, return here.
        if(false === options.refresh) {
          return Kinvey.getActiveUser();
        }

        // Retrieve the user. The `Kinvey.User.me` method will also update the
        // active user. If `INVALID_CREDENTIALS`, reset the active user.
        return Kinvey.User.me().then(null, function(error) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Failed to restore the active user.', error);
          }

          // Reset the active user.
          if(Kinvey.Error.INVALID_CREDENTIALS === error.name) {
            Kinvey.setActiveUser(previous);
          }
          return Kinvey.Defer.reject(error);
        });
      });
    };

    /**
 * Returns the active user.
 *
 * @throws {Error} `Kinvey.getActiveUser` can only be called after the promise
     returned by `Kinvey.init` fulfills or rejects.
 * @returns {?Object} The active user, or `null` if there is no active user.
 */
    Kinvey.getActiveUser = function() {
      // Validate preconditions.
      if(false === activeUserReady) {
        throw new Kinvey.Error('Kinvey.getActiveUser can only be called after the ' +
          'promise returned by Kinvey.init fulfills or rejects.');
      }

      return activeUser;
    };

    /**
     * Sets the active user.
     *
     * @param {?Object} user The active user, or `null` to reset.
     * @throws {Kinvey.Error} `user` must contain: `_kmd.authtoken`.
     * @returns {?Object} The previous active user, or `null` if there was no
     *            previous active user.
     */
    Kinvey.setActiveUser = function(user) {
      // Debug.
      if(KINVEY_DEBUG) {
        log('Setting the active user.', arguments);
      }

      // Validate arguments.
      if(null != user && !(null != user._id && null != user._kmd && null != user._kmd.authtoken)) {
        throw new Kinvey.Error('user argument must contain: _id, _kmd.authtoken.');
      }

      // At this point, the active user is ready to be used (even though the
      // user data is not retrieved yet).
      if(false === activeUserReady) {
        activeUserReady = true;
      }

      var result = Kinvey.getActiveUser(); // Previous.
      activeUser = user;

      // Update disk state in the background.
      if(null != user) { // Save the active user.
        Storage.save('activeUser', [user._id, user._kmd.authtoken]);
      }
      else { // Delete the active user.
        Storage.destroy('activeUser');
      }

      // Return the previous active user.
      return result;
    };

    /**
     * Initializes the library for use with Kinvey services.
     *
     * @param {Options}  options Options.
     * @param {string}   options.appKey        App Key.
     * @param {string}  [options.appSecret]    App Secret.
     * @param {string}  [options.masterSecret] Master Secret. **Never use the
     *          Master Secret in client-side code.**
     * @param {boolean} [options.refresh=true] Refresh the active user (if any).
     * @param {Object}  [options.sync]         Synchronization options.
     * @throws {Kinvey.Error} `options` must contain: `appSecret` or
     *                          `masterSecret`.
     * @returns {Promise} The active user.
     */
    Kinvey.init = function(options) {
      // Debug.
      if(KINVEY_DEBUG) {
        log('Initializing the copy of the library.', arguments);
      }

      // Validate arguments.
      options = options || {};
      if(null == options.appKey) {
        throw new Kinvey.Error('options argument must contain: appKey.');
      }
      if(null == options.appSecret && null == options.masterSecret) {
        throw new Kinvey.Error('options argument must contain: appSecret and/or masterSecret.');
      }

      // The active user is not ready yet.
      activeUserReady = false;

      // Save credentials.
      Kinvey.appKey = options.appKey;
      Kinvey.appSecret = null != options.appSecret ? options.appSecret : null;
      Kinvey.masterSecret = null != options.masterSecret ? options.masterSecret : null;

      // Initialize the synchronization namespace and restore the active user.
      var promise = Kinvey.Sync.init(options.sync).then(function() {
        return restoreActiveUser(options);
      });
      return wrapCallbacks(promise, options);
    };

    /**
     * Pings the Kinvey service.
     *
     * @param {Object} [options] Options.
     * @returns {Promise} The response.
     */
    Kinvey.ping = function(options) {
      // Debug.
      if(KINVEY_DEBUG) {
        log('Pinging the Kinvey service.', arguments);
      }

      // Cast arguments.
      options = options || {};

      // The top-level ping is not compatible with `options.nocache`.
      options.nocache = null == Kinvey.appKey ? false : options.nocache;

      // Prepare the response. If the library copy has not been initialized yet,
      // ping anonymously.
      var promise = Kinvey.Persistence.read({
        namespace: DATA_STORE,
        auth: null != Kinvey.appKey ? Auth.All : Auth.None
      }, options);

      // Debug.
      if(KINVEY_DEBUG) {
        promise.then(function(response) {
          log('Pinged the Kinvey service.', response);
        }, function(error) {
          log('Failed to ping the Kinvey service.', error);
        });
      }

      // Return the response.
      return wrapCallbacks(promise, options);
    };

    // Error-handling.
    // ---------------

    // https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Error

    /**
     * The Kinvey Error class. Thrown whenever the library encounters an error.
     *
     * @memberof! <global>
     * @class Kinvey.Error
     * @extends {Error}
     * @param {string} msg Error message.
     */
    Kinvey.Error = function(msg) {
      // Add stack for debugging purposes.
      this.name = 'Kinvey.Error';
      this.message = msg;
      this.stack = (new Error()).stack;

      // Debug.
      if(KINVEY_DEBUG) {
        log('A Kinvey.Error was thrown.', this.message, this.stack);
      }
    };
    Kinvey.Error.prototype = new Error();
    Kinvey.Error.prototype.constructor = Kinvey.Error;

    // ### Error definitions.

    // #### Server.
    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.ENTITY_NOT_FOUND = 'EntityNotFound';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.COLLECTION_NOT_FOUND = 'CollectionNotFound';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.APP_NOT_FOUND = 'AppNotFound';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.USER_NOT_FOUND = 'UserNotFound';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.BLOB_NOT_FOUND = 'BlobNotFound';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.INVALID_CREDENTIALS = 'InvalidCredentials';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.KINVEY_INTERNAL_ERROR_RETRY = 'KinveyInternalErrorRetry';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.KINVEY_INTERNAL_ERROR_STOP = 'KinveyInternalErrorStop';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.USER_ALREADY_EXISTS = 'UserAlreadyExists';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.USER_UNAVAILABLE = 'UserUnavailable';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.DUPLICATE_END_USERS = 'DuplicateEndUsers';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.INSUFFICIENT_CREDENTIALS = 'InsufficientCredentials';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.WRITES_TO_COLLECTION_DISALLOWED = 'WritesToCollectionDisallowed';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.INDIRECT_COLLECTION_ACCESS_DISALLOWED = 'IndirectCollectionAccessDisallowed';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.APP_PROBLEM = 'AppProblem';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.PARAMETER_VALUE_OUT_OF_RANGE = 'ParameterValueOutOfRange';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.CORS_DISABLED = 'CORSDisabled';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.INVALID_QUERY_SYNTAX = 'InvalidQuerySyntax';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.MISSING_QUERY = 'MissingQuery';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.JSON_PARSE_ERROR = 'JSONParseError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.MISSING_REQUEST_HEADER = 'MissingRequestHeader';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.INCOMPLETE_REQUEST_BODY = 'IncompleteRequestBody';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.MISSING_REQUEST_PARAMETER = 'MissingRequestParameter';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.INVALID_IDENTIFIER = 'InvalidIdentifier';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.BAD_REQUEST = 'BadRequest';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.FEATURE_UNAVAILABLE = 'FeatureUnavailable';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.API_VERSION_NOT_IMPLEMENTED = 'APIVersionNotImplemented';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.API_VERSION_NOT_AVAILABLE = 'APIVersionNotAvailable';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.INPUT_VALIDATION_FAILED = 'InputValidationFailed';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.BL_RUNTIME_ERROR = 'BLRuntimeError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.BL_SYNTAX_ERROR = 'BLSyntaxError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.BL_TIMEOUT_ERROR = 'BLTimeoutError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.OAUTH_TOKEN_REFRESH_ERROR = 'OAuthTokenRefreshError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.BL_VIOLATION_ERROR = 'BLViolationError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.BL_INTERNAL_ERROR = 'BLInternalError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.THIRD_PARTY_TOS_UNACKED = 'ThirdPartyTOSUnacked';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.STALE_REQUEST = 'StaleRequest';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.DATA_LINK_PARSE_ERROR = 'DataLinkParseError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.NOT_IMPLEMENTED_ERROR = 'NotImplementedError';

    // #### Client.
    /**
     * @memberOf Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.ALREADY_LOGGED_IN = 'AlreadyLoggedIn';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.DATABASE_ERROR = 'DatabaseError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.MISSING_APP_CREDENTIALS = 'MissingAppCredentials';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.MISSING_MASTER_CREDENTIALS = 'MissingMasterCredentials';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.NO_ACTIVE_USER = 'NoActiveUser';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.REQUEST_ABORT_ERROR = 'RequestAbortError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.REQUEST_ERROR = 'RequestError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.REQUEST_TIMEOUT_ERROR = 'RequestTimeoutError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.SOCIAL_ERROR = 'SocialError';

    /**
     * @memberof Kinvey.Error
     * @constant
     * @default
     */
    Kinvey.Error.SYNC_ERROR = 'SyncError';

    // All client-side errors are fully declared below.
    var ClientError = {};

    /**
     * Already logged in error.
     *
     * @constant
     * @type {Object}
     * @default
     */
    ClientError[Kinvey.Error.ALREADY_LOGGED_IN] = {
      name: Kinvey.Error.ALREADY_LOGGED_IN,
      description: 'You are already logged in with another user.',
      debug: 'If you want to switch users, logout the active user first ' + 'using `Kinvey.User.logout`, then try again.'
    };

    /**
     * Database error.
     *
     * @constant
     * @type {Object}
     * @default
     */
    ClientError[Kinvey.Error.DATABASE_ERROR] = {
      name: Kinvey.Error.DATABASE_ERROR,
      description: 'The database used for local persistence encountered an error.',
      debug: ''
    };

    /**
     * Missing app credentials.
     *
     * @constant
     * @type {Object}
     * @default
     */
    ClientError[Kinvey.Error.MISSING_APP_CREDENTIALS] = {
      name: Kinvey.Error.MISSING_APP_CREDENTIALS,
      description: 'Missing credentials: `Kinvey.appKey` and/or `Kinvey.appSecret`.',
      debug: 'Did you forget to call `Kinvey.init`?'
    };

    /**
     * Missing master credentials.
     *
     * @constant
     * @type {Object}
     * @default
     */
    ClientError[Kinvey.Error.MISSING_MASTER_CREDENTIALS] = {
      name: Kinvey.Error.MISSING_MASTER_CREDENTIALS,
      description: 'Missing credentials: `Kinvey.appKey` and/or `Kinvey.masterSecret`.',
      debug: 'Did you forget to call `Kinvey.init` with your Master Secret?'
    };

    /**
     * No active user.
     *
     * @constant
     * @type {Object}
     * @default
     */
    ClientError[Kinvey.Error.NO_ACTIVE_USER] = {
      name: Kinvey.Error.NO_ACTIVE_USER,
      description: 'You need to be logged in to execute this request.',
      debug: 'Try creating a user using `Kinvey.User.signup`, or login an ' + 'existing user using `Kinvey.User.login`.'
    };

    /**
     * Request abort error.
     *
     * @constant
     * @type {Object}
     * @default
     */
    ClientError[Kinvey.Error.REQUEST_ABORT_ERROR] = {
      name: Kinvey.Error.REQUEST_TIMEOUT_ERROR,
      description: 'The request was aborted.',
      debug: ''
    };

    /**
     * Request error.
     *
     * @constant
     * @type {Object}
     * @default
     */
    ClientError[Kinvey.Error.REQUEST_ERROR] = {
      name: Kinvey.Error.REQUEST_ERROR,
      description: 'The request failed.',
      debug: ''
    };

    /**
     * Request timeout error.
     *
     * @constant
     * @type {Object}
     * @default
     */
    ClientError[Kinvey.Error.REQUEST_TIMEOUT_ERROR] = {
      name: Kinvey.Error.REQUEST_TIMEOUT_ERROR,
      description: 'The request timed out.',
      debug: ''
    };

    /**
     * Social error.
     *
     * @constant
     * @type {Object}
     * @default
     */
    ClientError[Kinvey.Error.SOCIAL_ERROR] = {
      name: Kinvey.Error.SOCIAL_ERROR,
      description: 'The social identity cannot be obtained.',
      debug: ''
    };

    /**
     * Sync error.
     *
     * @constant
     * @type {Object}
     * @default
     */
    ClientError[Kinvey.Error.SYNC_ERROR] = {
      name: Kinvey.Error.SYNC_ERROR,
      description: 'The synchronization operation cannot be completed.',
      debug: ''
    };

    // The `description` and `debug` properties can be overridden if desired. The
    // function below makes it easy to customize client errors.

    /**
     * Creates a new client-side error object.
     *
     * @param {string} name Error name (one of `Kinvey.Error.*` constants).
     * @param {Object} [dict] Dictionary.
     * @param {string} [dict.description] Error description.
     * @param {*} [dict.debug] Error debugging information.
     * @returns {Object} Client-side error object.
     */
    var clientError = function(name, dict) {
      // Cast arguments.
      var error = ClientError[name] || {
        name: name
      };

      // Return the error structure.
      dict = dict || {};
      return {
        name: error.name,
        description: dict.description || error.description || '',
        debug: dict.debug || error.debug || ''
      };
    };

    // Utils.
    // ------

    // Use the fastest possible means to execute a task in a future turn of the
    // event loop. Borrowed from [q](http://documentup.com/kriskowal/q/).
    var nextTick;
    if('function' === typeof root.setImmediate) { // IE10, Node.js 0.9+.
      nextTick = root.setImmediate;
    }
    else if('undefined' !== typeof process && process.nextTick) { // Node.js <0.9.
      nextTick = process.nextTick;
    }
    else { // Most browsers.
      nextTick = function(fn) {
        root.setTimeout(fn, 0);
      };
    }

    // Wraps asynchronous callbacks so they get called when a promise fulfills or
    // rejects. The `success` and `error` properties are extracted from `options`
    // at run-time, allowing intermediate process to alter the callbacks.
    var wrapCallbacks = function(promise, options) {
      promise.then(function(value) {
        if(options.success) { // Invoke the success handler.
          options.success(value);
        }
      }, function(reason) {
        if(options.error) { // Invoke the error handler.
          options.error(reason);
        }
      }).then(null, function(err) {
        // If an exception occurs, the promise would normally catch it. Since we
        // are using asynchronous callbacks, exceptions should be thrown all the
        // way.
        nextTick(function() {
          throw err;
        });
      });
      return promise;
    };

    // Create helper functions that are used throughout the library. Inspired by
    // [underscore.js](http://underscorejs.org/).
    var isArray = Array.isArray || function(arg) {
        return '[object Array]' === Object.prototype.toString.call(arg);
      };
    var isFunction = function(fn) {
      if('function' !== typeof / . / ) {
        return 'function' === typeof fn;
      }
      return '[object Function]' === Object.prototype.toString.call(fn);
    };
    var isNumber = function(number) {
      return '[object Number]' === Object.prototype.toString.call(number) && !isNaN(number);
    };
    var isObject = function(obj) {
      return Object(obj) === obj;
    };
    var isRegExp = function(regExp) {
      return '[object RegExp]' === Object.prototype.toString.call(regExp);
    };

    var isString = function(str) {
      return '[object String]' === Object.prototype.toString.call(str);
    };

    var isEmpty = function(obj) {
      if(null == obj) {
        return true;
      }
      if(isArray(obj) || isString(obj)) {
        return 0 === obj.length;
      }
      for(var key in obj) {
        if(obj.hasOwnProperty(key)) {
          return false;
        }
      }
      return true;
    };

    // The library internals rely on adapters to implement certain functionalities.
    // Adapters must implement these functionalities according to an interface. An
    // adapter is applied to the internals through a `use` function.

    // If no adapter is specified, the internals throw an error instead.
    var methodNotImplemented = function(methodName) {
      return function() {
        throw new Kinvey.Error('Method not implemented: ' + methodName);
      };
    };

    // An adapter can be applied by a `use` function attached to an internal
    // namespace. Adapters must implement the `nsInterface`.
    var use = function(nsInterface) {
      return function(adapter) {
        var namespace = this;

        // Debug.
        if(KINVEY_DEBUG) {
          log('Applying an adapter.', namespace, adapter);
        }

        // Validate adapter.
        adapter = adapter || {};
        nsInterface.forEach(function(methodName) {
          if('function' !== typeof adapter[methodName]) {
            throw new Kinvey.Error('Adapter must implement method: ' + methodName);
          }
        });

        // Apply adapter to the internals.
        nsInterface.forEach(function(methodName) {
          namespace[methodName] = function() {
            // Ensure the adapter is used as `this` context.
            return adapter[methodName].apply(adapter, arguments);
          };
        });
      };
    };

    // Define the request Option type for documentation purposes.

    /**
     * @typedef {Object} Options
     * @property {function} [error]        Failure callback.
     * @property {Array}    [exclude]      List of relational fields not to save.
     *             Use in conjunction with `save` or `update`.
     * @property {boolean}  [fallback]     Fallback to the network if the request
     *             failed locally. Use in conjunction with `offline`.
     * @property {boolean}  [fileTls=true] Use the https protocol to communicate
     *             with GCS.
     * @property {integer}  [fileTtl]      A custom expiration time (in seconds).
     * @property {boolean}  [nocache=true] Use cache busting.
     * @property {boolean}  [offline]      Initiate the request locally.
     * @property {boolean}  [refresh]      Persist the response locally.
     * @property {Object}   [relations]    Map of relational fields to collections.
     * @property {boolean}  [skipBL]       Skip Business Logic. Use in conjunction
     *             with Master Secret.
     * @property {function} [success]      Success callback.
     * @property {integer}  [timeout]      The request timeout (ms).
     * @property {boolean}  [trace=false]  Add the request id to the error object
     *             for easy request tracking (in case of contacting support).
     */

    // Define the `Storage` namespace, used to store application state.
    /**
     * @private
     * @namespace Storage
     */
    var Storage = /** @lends Storage */ {
      /**
       * Prepares a deletion from storage.
       *
       * @param {string} key The key.
       * @returns {Promise}
       */
      destroy: function(key) {
        return Storage._destroy(Storage._key(key));
      },

      /**
       * Prepares a retrieval from storage.
       *
       * @param {string} key The key.
       * @returns {Promise}
       */
      get: function(key) {
        return Storage._get(Storage._key(key));
      },

      /**
       * Prepares a save to storage.
       *
       * @param {string} key The key.
       * @param {*} value The value.
       * @returns {Promise}
       */
      save: function(key, value) {
        return Storage._save(Storage._key(key), value);
      },

      /**
       * Deletes a value from storage.
       *
       * @private
       * @abstract
       * @method
       * @param {string} key The key.
       * @returns {Promise}
       */
      _destroy: methodNotImplemented('Storage.destroy'),

      /**
       * Retrieves a value from storage.
       *
       * @private
       * @abstract
       * @method
       * @param {string} key The key.
       * @returns {*} The value.
       * @returns {Promise}
       */
      _get: methodNotImplemented('Storage.get'),

      /**
       * Formats the key.
       *
       * @private
       * @param {string} key The key.
       * @returns {string} The formatted key.
       */
      _key: function(key) {
        // Namespace the key, so it is unique to the Kinvey application.
        return ['Kinvey', Kinvey.appKey, key].join('.');
      },

      /**
       * Saves a value to storage.
       *
       * @private
       * @abstract
       * @method
       * @param {string} key The key.
       * @param {*} value The value.
       */
      _save: methodNotImplemented('Storage.set'),

      /**
       * Sets the implementation of `Storage` to the specified adapter.
       *
       * @method
       * @param {Object} adapter Object implementing the `Storage` interface.
       */
      use: use(['_destroy', '_get', '_save'])
    };

    // Deferreds.
    // ----------

    // The library relies on deferreds for asynchronous communication. The internal
    // implementation is defined by an adapter. Adapters must implement the
    // [Promises/A+ spec](http://promises-aplus.github.io/promises-spec/).

    /**
     * @memberof! <global>
     * @namespace Kinvey.Defer
     */
    Kinvey.Defer = /** @lends Kinvey.Defer */ {
      /**
       * Turns an array of promises into a promise for an array. If any of the
       * promises gets rejected, the whole array is rejected immediately.
       *
       * @param {Promise[]} promises List of promises.
       * @throws {Kinvey.Error} `promises` must be of type: `Array`.
       * @returns {Promise} The promise.
       */
      all: function(promises) {
        // Validate arguments.
        if(!isArray(promises)) {
          throw new Kinvey.Error('promises argument must be of type: Array.');
        }

        // If there are no promises, resolve immediately.
        var pending = promises.length;
        if(0 === pending) {
          return Kinvey.Defer.resolve([]);
        }

        // Prepare the response.
        var deferred = Kinvey.Defer.deferred();

        // For every promise, add its value to the response if fulfilled. If all
        // promises are fulfilled, fulfill the array promise. If one of the members
        // fail, reject the array promise immediately.
        var response = [];
        promises.forEach(function(promise, index) {
          promise.then(function(value) {
            // Update counter and append response in-place.
            pending -= 1;
            response[index] = value;

            // If all promises are fulfilled, fulfill the array promise.
            if(0 === pending) {
              deferred.resolve(response);
            }
          }, function(error) { // A member got rejected, reject the whole array.
            deferred.reject(error);
          });
        });

        // Return the promise.
        return deferred.promise;
      },

      /**
       * Fulfills a promise immediately.
       *
       * @param {*} value The fulfillment value.
       * @returns {Promise} The promise.
       */
      resolve: function(value) {
        var deferred = Kinvey.Defer.deferred();
        deferred.resolve(value);
        return deferred.promise;
      },

      /**
       * Rejects a promise immediately.
       *
       * @param {*} reason The rejection reason.
       * @returns {Promise} The promise.
       */
      reject: function(reason) {
        var deferred = Kinvey.Defer.deferred();
        deferred.reject(reason);
        return deferred.promise;
      },

      /**
       * Creates a deferred (pending promise).
       *
       * @abstract
       * @method
       * @returns {Object} The deferred.
       */
      deferred: methodNotImplemented('Kinvey.Defer.deferred'),

      /**
       * Sets the implementation of `Kinvey.Defer` to the specified adapter.
       *
       * @method
       * @param {Object} adapter Object implementing the `Kinvey.Defer` interface.
       */
      use: use(['deferred'])
    };

    // Define the Promise type for documentation purposes.

    /**
     * @typedef {Object} Promise
     * @property {function} then The accessor to the current state or eventual
     *             fulfillment value or rejection reason.
     */

    // Authentication.
    // ---------------

    // Access to the Kinvey service is authenticated through user credentials,
    // Master Secret, or App Secret. A combination of these is often (but not
    // always) accepted. Therefore, an extensive set of all possible combinations
    // is gathered here and presented as authentication policies.

    /**
     * @private
     * @namespace Auth
     */
    var Auth = /** @lends Auth */ {

      // All policies must return a {Promise}. The value of a resolved promise must
      // be an object containing `scheme` and `username` and `password` or
      // `credentials`. The reason of rejection must be a `Kinvey.Error` constant.

      // https://tools.ietf.org/html/rfc2617

      /**
       * Authenticate through (1) user credentials, (2) Master Secret, or (3) App
       * Secret.
       *
       * @returns {Promise}
       */
      All: function() {
        return Auth.Session().then(null, Auth.Basic);
      },

      /**
       * Authenticate through App Secret.
       *
       * @returns {Promise}
       */
      App: function() {
        // Validate preconditions.
        if(null == Kinvey.appKey || null == Kinvey.appSecret) {
          var error = clientError(Kinvey.Error.MISSING_APP_CREDENTIALS);
          return Kinvey.Defer.reject(error);
        }

        // Prepare the response.
        var promise = Kinvey.Defer.resolve({
          scheme: 'Basic',
          username: Kinvey.appKey,
          password: Kinvey.appSecret
        });

        // Debug
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Authenticating through App Secret.', response);
          });
        }

        // Return the response.
        return promise;
      },

      /**
       * Authenticate through (1) Master Secret, or (2) App Secret.
       *
       * @returns {Promise}
       */
      Basic: function() {
        return Auth.Master().then(null, Auth.App);
      },

      /**
       * Authenticate through (1) user credentials, or (2) Master Secret.
       *
       * @returns {Promise}
       */
      Default: function() {
        return Auth.Session().then(null, function(error) {
          return Auth.Master().then(null, function() {
            // Most likely, the developer did not create a user. Return a useful
            // error.
            return Kinvey.Defer.reject(error);
          });
        });
      },

      /**
       * Authenticate through Master Secret.
       *
       * @returns {Promise}
       */
      Master: function() {
        // Validate preconditions.
        if(null == Kinvey.appKey || null == Kinvey.masterSecret) {
          var error = clientError(Kinvey.Error.MISSING_MASTER_CREDENTIALS);
          return Kinvey.Defer.reject(error);
        }

        // Prepare the response.
        var promise = Kinvey.Defer.resolve({
          scheme: 'Basic',
          username: Kinvey.appKey,
          password: Kinvey.masterSecret
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Authenticating through Master Secret.', response);
          });
        }

        // Return the response.
        return promise;
      },

      /**
       * Do not authenticate.
       *
       * @returns {Promise}
       */
      None: function() {
        return Kinvey.Defer.resolve(null);
      },

      /**
       * Authenticate through user credentials.
       *
       * @returns {Promise}
       */
      Session: function() {
        // Validate preconditions.
        var user = Kinvey.getActiveUser();
        if(null === user) {
          var error = clientError(Kinvey.Error.NO_ACTIVE_USER);
          return Kinvey.Defer.reject(error);
        }

        // Prepare the response.
        var promise = Kinvey.Defer.resolve({
          scheme: 'Kinvey',
          credentials: user._kmd.authtoken
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Authenticating through user credentials.', response);
          });
        }

        // Return the response.
        return promise;
      }
    };

    /* globals angular: true, Backbone: true, Ember: true, jQuery: true, ko: true, Titanium: true */

    // Device information.
    // -------------------

    // Build the device information string sent along with every network request.
    // <js-library>/<version> [(<library>/<version>,...)] <platform> <version> <manufacturer> <id>
    var deviceInformation = function() {
      var browser, platform, version, manufacturer, id, libraries = [];

      // Helper function to detect the browser name and version.
      var browserDetect = function(ua) {
        // Cast arguments.
        ua = ua.toLowerCase();

        // User-Agent patterns.
        var rChrome = /(chrome)\/([\w]+)/;
        var rFirefox = /(firefox)\/([\w.]+)/;
        var rIE = /(msie) ([\w.]+)/i;
        var rOpera = /(opera)(?:.*version)?[ \/]([\w.]+)/;
        var rSafari = /(safari)\/([\w.]+)/;

        return rChrome.exec(ua) || rFirefox.exec(ua) || rIE.exec(ua) ||
          rOpera.exec(ua) || rSafari.exec(ua) || [];
      };

      // Platforms.
      if('undefined' !== typeof root.cordova &&
        'undefined' !== typeof root.device) { // PhoneGap
        var device = root.device;
        libraries.push('phonegap/' + device.cordova);
        platform = device.platform;
        version = device.version;
        manufacturer = device.model;
        id = device.uuid;
      }
      else if('undefined' !== typeof Titanium) { // Titanium.
        libraries.push('titanium/' + Titanium.getVersion());

        // If mobileweb, extract browser information.
        if('mobileweb' === Titanium.Platform.getName()) {
          browser = browserDetect(Titanium.Platform.getModel());
          platform = browser[1];
          version = browser[2];
          manufacturer = Titanium.Platform.getOstype();
        }
        else {
          platform = Titanium.Platform.getOsname();
          version = Titanium.Platform.getVersion();
          manufacturer = Titanium.Platform.getManufacturer();
        }
        id = Titanium.Platform.getId();
      }
      else if('undefined' !== typeof process) { // Node.js
        platform = process.title;
        version = process.version;
        manufacturer = process.platform;
      }

      // Libraries.
      if('undefined' !== typeof angular) { // AngularJS.
        libraries.push('angularjs/' + angular.version.full);
      }
      if('undefined' !== typeof Backbone) { // Backbone.js.
        libraries.push('backbonejs/' + Backbone.VERSION);
      }
      if('undefined' !== typeof Ember) { // Ember.js.
        libraries.push('emberjs/' + Ember.VERSION);
      }
      if('undefined' !== typeof jQuery) { // jQuery.
        libraries.push('jquery/' + jQuery.fn.jquery);
      }
      if('undefined' !== typeof ko) { // Knockout.
        libraries.push('knockout/' + ko.version);
      }
      if('undefined' !== typeof Zepto) { // Zepto.js.
        libraries.push('zeptojs');
      }

      // Default platform, most likely this is just a plain web app.
      if(null == platform && root.navigator) {
        browser = browserDetect(root.navigator.userAgent);
        platform = browser[1];
        version = browser[2];
        manufacturer = root.navigator.platform;
      }

      // Return the device information string.
      var parts = ['js-nodejs/1.1.0'];
      if(0 !== libraries.length) { // Add external library information.
        parts.push('(' + libraries.sort().join(', ') + ')');
      }
      return parts.concat(
        [
          platform,
          version,
          manufacturer,
          id
        ].map(function(part) {
          return null != part ? part.toString().replace(/\s/g, '_').toLowerCase() : 'unknown';
        })
      ).join(' ');
    };

    // ACL.
    // ----

    // Wrapper for setting permissions on document-level (i.e. entities and users).

    /**
     * The Kinvey.Acl class.
     *
     * @memberof! <global>
     * @class Kinvey.Acl
     * @param {Object} [document] The document.
     * @throws {Kinvey.Error} `document` must be of type: `Object`.
     */
    Kinvey.Acl = function(document) {
      // Validate arguments.
      if(null != document && !isObject(document)) {
        throw new Kinvey.Error('document argument must be of type: Object.');
      }

      // Cast arguments.
      document = document || {};
      document._acl = document._acl || {};

      /**
       * The ACL.
       *
       * @private
       * @type {Object}
       */
      this._acl = document._acl;
    };

    // Define the ACL methods.
    Kinvey.Acl.prototype = /** @lends Kinvey.Acl# */ {
      /**
       * Adds a user to the list of users that are explicitly allowed to read the
       * entity.
       *
       * @param {string} user The user id.
       * @returns {Kinvey.Acl} The ACL.
       */
      addReader: function(user) {
        this._acl.r = this._acl.r || [];
        if(-1 === this._acl.r.indexOf(user)) {
          this._acl.r.push(user);
        }
        return this;
      },

      /**
       * Adds a user group to the list of user groups that are explicitly allowed
       * to read the entity.
       *
       * @param {string} group The group id.
       * @returns {Kinvey.Acl} The ACL.
       */
      addReaderGroup: function(group) {
        this._acl.groups = this._acl.groups || {};
        this._acl.groups.r = this._acl.groups.r || [];
        if(-1 === this._acl.groups.r.indexOf(group)) {
          this._acl.groups.r.push(group);
        }
        return this;
      },

      /**
       * Adds a user group to the list of user groups that are explicitly allowed
       * to modify the entity.
       *
       * @param {string} group The group id.
       * @returns {Kinvey.Acl} The ACL.
       */
      addWriterGroup: function(group) {
        this._acl.groups = this._acl.groups || {};
        this._acl.groups.w = this._acl.groups.w || [];
        if(-1 === this._acl.groups.w.indexOf(group)) {
          this._acl.groups.w.push(group);
        }
        return this;
      },

      /**
       * Adds a user to the list of users that are explicitly allowed to modify the
       * entity.
       *
       * @param {string} user The user id.
       * @returns {Kinvey.Acl} The ACL.
       */
      addWriter: function(user) {
        this._acl.w = this._acl.w || [];
        if(-1 === this._acl.w.indexOf(user)) {
          this._acl.w.push(user);
        }
        return this;
      },

      /**
       * Returns the user id of the user that originally created the entity.
       *
       * @returns {?string} The user id, or `null` if not set.
       */
      getCreator: function() {
        return this._acl.creator || null;
      },

      /**
       * Returns the list of users that are explicitly allowed to read the entity.
       *
       * @returns {Array} The list of users.
       */
      getReaders: function() {
        return this._acl.r || [];
      },

      /**
       * Returns the list of user groups that are explicitly allowed to read the
       * entity.
       *
       * @returns {Array} The list of user groups.
       */
      getReaderGroups: function() {
        return this._acl.groups ? this._acl.groups.r : [];
      },

      /**
       * Returns the list of user groups that are explicitly allowed to read the
       * entity.
       *
       * @returns {Array} The list of user groups.
       */
      getWriterGroups: function() {
        return this._acl.groups ? this._acl.groups.w : [];
      },

      /**
       * Returns the list of users that are explicitly allowed to modify the
       * entity.
       *
       * @returns {Array} The list of users.
       */
      getWriters: function() {
        return this._acl.w || [];
      },

      /**
       * Returns whether the entity is globally readable.
       *
       * @returns {boolean}
       */
      isGloballyReadable: function() {
        return this._acl.gr || false;
      },

      /**
       * Returns whether the entity is globally writable.
       *
       * @returns {boolean}
       */
      isGloballyWritable: function() {
        return this._acl.gw || false;
      },

      /**
       * Removes a user from the list of users that are explicitly allowed to read
       * the entity.
       *
       * @param {string} user The user id.
       * @returns {Kinvey.Acl} The ACL.
       */
      removeReader: function(user) {
        var pos;
        if(this._acl.r && -1 !== (pos = this._acl.r.indexOf(user))) {
          this._acl.r.splice(pos, 1);
        }
        return this;
      },

      /**
       * Removes a user group from the list of user groups that are explicitly
       * allowed to read the entity.
       *
       * @param {string} group The group id.
       * @returns {Kinvey.Acl} The ACL.
       */
      removeReaderGroup: function(group) {
        var pos;
        if(this._acl.groups && this._acl.groups.r && -1 !== (pos = this._acl.groups.r.indexOf(group))) {
          this._acl.groups.r.splice(pos, 1);
        }
        return this;
      },

      /**
       * Removes a user group from the list of user groups that are explicitly
       * allowed to modify the entity.
       *
       * @param {string} group The group id.
       * @returns {Kinvey.Acl} The ACL.
       */
      removeWriterGroup: function(group) {
        var pos;
        if(this._acl.groups && this._acl.groups.w && -1 !== (pos = this._acl.groups.w.indexOf(group))) {
          this._acl.groups.w.splice(pos, 1);
        }
        return this;
      },

      /**
       * Removes a user from the list of users that are explicitly allowed to
       * modify the entity.
       *
       * @param {string} user The user id.
       * @returns {Kinvey.Acl} The ACL.
       */
      removeWriter: function(user) {
        var pos;
        if(this._acl.w && -1 !== (pos = this._acl.w.indexOf(user))) {
          this._acl.w.splice(pos, 1);
        }
        return this;
      },

      /**
       * Specifies whether the entity is globally readable.
       *
       * @param {boolean} [gr=true] Make the entity globally readable.
       * @returns {Kinvey.Acl} The ACL.
       */
      setGloballyReadable: function(gr) {
        this._acl.gr = gr || false;
        return this;
      },

      /**
       * Specifies whether the entity is globally writable.
       *
       * @param {boolean} [gw=true] Make the entity globally writable.
       * @returns {Kinvey.Acl}
       */
      setGloballyWritable: function(gw) {
        this._acl.gw = gw || false;
        return this;
      },

      /**
       * Returns JSON representation of the document ACL.
       *
       * @returns {Object} The document ACL.
       */
      toJSON: function() {
        return this._acl;
      }
    };

    // Aggregation.
    // ------------

    // The `Kinvey.Group` class provides an easy way to build aggregations, which
    // can then be passed to one of the REST API wrappers to group application
    // data. Internally, the class builds a MongoDB aggregation.

    /**
     * The `Kinvey.Group` class.
     *
     * @memberof! <global>
     * @class Kinvey.Group
     */
    Kinvey.Group = function() {
      /**
       * The query applied to the result set.
       *
       * @private
       * @type {?Kinvey.Query}
       */
      this._query = null;

      /**
       * The initial structure of the document to be returned.
       *
       * @private
       * @type {Object}
       */
      this._initial = {};

      /**
       * The fields to group by.
       *
       * @private
       * @type {Object}
       */
      this._key = {};

      /**
       * The MapReduce function.
       *
       * @private
       * @type {string}
       */
      this._reduce = function() {}.toString();
    };

    // Define the aggregation methods.
    Kinvey.Group.prototype = /** @lends Kinvey.Group# */ {
      /**
       * Sets the field to group by.
       *
       * @param {string} field The field.
       * @returns {Kinvey.Group} The aggregation.
       */
      by: function(field) {
        this._key[field] = true;
        return this;
      },

      /**
       * Sets the initial structure of the document to be returned.
       *
       * @param {Object|string} objectOrKey The initial structure, or key to set.
       * @param {*} value [value] The value of `key`.
       * @throws {Kinvey.Error} `object` must be of type: `Object`.
       * @returns {Kinvey.Group} The aggregation.
       */
      initial: function(objectOrKey, value) {
        // Validate arguments.
        if('undefined' === typeof value && !isObject(objectOrKey)) {
          throw new Kinvey.Error('objectOrKey argument must be of type: Object.');
        }

        // Set or append the initial structure.
        if(isObject(objectOrKey)) {
          this._initial = objectOrKey;
        }
        else {
          this._initial[objectOrKey] = value;
        }
        return this;
      },

      /**
       * Post processes the raw response by applying sort, limit, and skip. These
       * modifiers are provided through the aggregation query.
       *
       * @param {Array} response The raw response.
       * @throws {Kinvey.Error} `response` must be of type: `Array`.
       * @returns {Array} The processed response.
       */
      postProcess: function(response) {
        // If there is a query, process it.
        if(null === this._query) {
          return response;
        }
        return this._query._postProcess(response);
      },

      /**
       * Sets the query to apply to the result set.
       *
       * @param {Kinvey.Query} query The query.
       * @throws {Kinvey.Error} `query` must be of type: `Kinvey.Query`.
       * @returns {Kinvey.Group} The aggregation.
       */
      query: function(query) {
        // Validate arguments.
        if(!(query instanceof Kinvey.Query)) {
          throw new Kinvey.Error('query argument must be of type: Kinvey.Query.');
        }

        this._query = query;
        return this;
      },

      /**
       * Sets the MapReduce function.
       *
       * @param {function|string} fn The function.
       * @throws {Kinvey.Error} `fn` must be of type: `function` or `string`.
       * @returns {Kinvey.Group} The aggregation.
       */
      reduce: function(fn) {
        // Cast arguments.
        if(isFunction(fn)) {
          fn = fn.toString();
        }

        // Validate arguments.
        if(!isString(fn)) {
          throw new Kinvey.Error('fn argument must be of type: function or string.');
        }

        this._reduce = fn;
        return this;
      },

      /**
       * Returns JSON representation of the aggregation.
       *
       * @returns {Object} JSON object-literal.
       */
      toJSON: function() {
        return {
          key: this._key,
          initial: this._initial,
          reduce: this._reduce,
          condition: null !== this._query ? this._query.toJSON().filter : {}
        };
      }
    };

    // Pre-define a number of reduce functions. All return a preseeded
    // `Kinvey.Group`.

    /**
     * Counts all elements in the group.
     *
     * @memberof Kinvey.Group
     * @param {string} [field] The field, or `null` to perform a global count.
     * @returns {Kinvey.Group} The aggregation.
     */
    Kinvey.Group.count = function(field) {
      // Return the aggregation.
      var agg = new Kinvey.Group();

      // If a field was specified, count per field.
      if(null != field) {
        agg.by(field);
      }

      agg.initial({
        result: 0
      });
      agg.reduce(function(doc, out) {
        out.result += 1;
      });
      return agg;
    };

    /**
     * Sums together the numeric values for the specified field.
     *
     * @memberof Kinvey.Group
     * @param {string} field The field.
     * @returns {Kinvey.Group} The aggregation.
     */
    Kinvey.Group.sum = function(field) {
      // Escape arguments.
      field = field.replace('\'', '\\\'');

      // Return the aggregation.
      var agg = new Kinvey.Group();
      agg.initial({
        result: 0
      });
      agg.reduce('function(doc, out) { out.result += doc["' + field + '"]; }');
      return agg;
    };

    /**
     * Finds the minimum of the numeric values for the specified field.
     *
     * @memberof Kinvey.Group
     * @param {string} field The field.
     * @returns {Kinvey.Group} The aggregation.
     */
    Kinvey.Group.min = function(field) {
      // Escape arguments.
      field = field.replace('\'', '\\\'');

      // Return the aggregation.
      var agg = new Kinvey.Group();
      agg.initial({
        result: 'Infinity'
      });
      agg.reduce('function(doc, out) { out.result = Math.min(out.result, doc["' + field + '"]); }');
      return agg;
    };

    /**
     * Finds the maximum of the numeric values for the specified field.
     *
     * @memberof Kinvey.Group
     * @param {string} field The field.
     * @returns {Kinvey.Group} The aggregation.
     */
    Kinvey.Group.max = function(field) {
      // Escape arguments.
      field = field.replace('\'', '\\\'');

      // Return the aggregation.
      var agg = new Kinvey.Group();
      agg.initial({
        result: '-Infinity'
      });
      agg.reduce('function(doc, out) { out.result = Math.max(out.result, doc["' + field + '"]); }');
      return agg;
    };

    /**
     * Finds the average of the numeric values for the specified field.
     *
     * @memberof Kinvey.Group
     * @param {string} field The field.
     * @returns {Kinvey.Group} The aggregation.
     */
    Kinvey.Group.average = function(field) {
      // Escape arguments.
      field = field.replace('\'', '\\\'');

      // Return the aggregation.
      var agg = new Kinvey.Group();
      agg.initial({
        count: 0,
        result: 0
      });
      agg.reduce(
        'function(doc, out) {' +
        '  out.result = (out.result * out.count + doc["' + field + '"]) / (out.count + 1);' +
        '  out.count += 1;' +
        '}'
      );
      return agg;
    };

    // Custom Endpoints.
    // -----------------

    /**
     * Executes a custom command.
     *
     * @param {string} id The endpoint.
     * @param {Object} [args] Command arguments.
     * @param {Options} [options] Options.
     * @returns {Promise} The response.
     */
    Kinvey.execute = function(id, args, options) {
      // Debug.
      if(KINVEY_DEBUG) {
        log('Executing custom command.', arguments);
      }

      // Cast arguments.
      options = options || {};

      // Prepare the response.
      var promise = Kinvey.Persistence.create({
        namespace: RPC,
        collection: 'custom',
        id: id,
        data: args,
        auth: Auth.Default
      }, options).then(null, function(error) {
        // If `REQUEST_ERROR`, the debug object may hold an actual custom response.
        if(Kinvey.Error.REQUEST_ERROR === error.name && isObject(error.debug)) {
          return Kinvey.Defer.reject(error.debug);
        }
        return Kinvey.Defer.reject(error);
      });

      // Debug.
      if(KINVEY_DEBUG) {
        promise.then(function(response) {
          log('Executed the custom command.', response);
        }, function(error) {
          log('Failed to execute the custom command.', error);
        });
      }

      // Return the response.
      return wrapCallbacks(promise, options);
    };

    // Data Store.
    // -----------

    // REST API wrapper for data storage.

    /**
     * @memberof! <global>
     * @namespace Kinvey.DataStore
     */
    Kinvey.DataStore = /** @lends Kinvey.DataStore */ {
      /**
       * Retrieves all documents matching the provided query.
       *
       * @param {string} collection Collection.
       * @param {Kinvey.Query} [query] The query.
       * @param {Options} [options] Options.
       * @throws {Kinvey.Error} `query` must be of type: `Kinvey.Query`.
       * @returns {Promise} A list of documents.
       */
      find: function(collection, query, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Retrieving documents by query.', arguments);
        }

        // Validate arguments.
        if(null != query && !(query instanceof Kinvey.Query)) {
          throw new Kinvey.Error('query argument must be of type: Kinvey.Query.');
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.read({
          namespace: DATA_STORE,
          collection: collection,
          query: query,
          auth: Auth.Default,
          local: {
            req: true,
            res: true
          }
        }, options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Retrieved the documents by query.', response);
          }, function(error) {
            log('Failed to retrieve the documents by query.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Retrieves a document.
       *
       * @param {string} collection Collection.
       * @param {string} id Document id.
       * @param {Options} [options] Options.
       * @returns {Promise} The document.
       */
      get: function(collection, id, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Retrieving a document.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.read({
          namespace: DATA_STORE,
          collection: collection,
          id: id,
          auth: Auth.Default,
          local: {
            req: true,
            res: true
          }
        }, options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Retrieved the document.', response);
          }, function(error) {
            log('Failed to retrieve the document.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Saves a (new) document.
       *
       * @param {string} collection Collection.
       * @param {Object} document Document.
       * @param {Options} [options] Options.
       * @returns {Promise} The new document.
       */
      save: function(collection, document, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Saving a (new) document.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // If the document has an `_id`, perform an update instead.
        if(null != document._id) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('The document has an _id, updating instead.', arguments);
          }

          return Kinvey.DataStore.update(collection, document, options);
        }

        // Prepare the response.
        var promise = Kinvey.Persistence.create({
          namespace: DATA_STORE,
          collection: collection,
          data: document,
          auth: Auth.Default,
          local: {
            req: true,
            res: true
          }
        }, options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Saved the new document.', response);
          }, function(error) {
            log('Failed to save the new document.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Updates an existing document. If the document does not exist, however, it
       * is created.
       *
       * @param {string} collection Collection.
       * @param {Object} document Document.
       * @param {Options} [options] Options.
       * @throws {Kinvey.Error} `document` must contain: `_id`.
       * @returns {Promise} The (new) document.
       */
      update: function(collection, document, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Updating a document.', arguments);
        }

        // Validate arguments.
        if(null == document._id) {
          throw new Kinvey.Error('document argument must contain: _id');
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.update({
          namespace: DATA_STORE,
          collection: collection,
          id: document._id,
          data: document,
          auth: Auth.Default,
          local: {
            req: true,
            res: true
          }
        }, options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Updated the document.', response);
          }, function(error) {
            log('Failed to update the document.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Deletes all documents matching the provided query.
       *
       * @param {string} collection Collection.
       * @param {Kinvey.Query} [query] The query.
       * @param {Options} [options] Options.
       * @throws {Kinvey.Error} `query` must be of type: `Kinvey.Query`.
       * @returns {Promise} The response.
       */
      clean: function(collection, query, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Deleting documents by query.', arguments);
        }

        // Cast and validate arguments.
        options = options || {};
        query = query || new Kinvey.Query();
        if(!(query instanceof Kinvey.Query)) {
          throw new Kinvey.Error('query argument must be of type: Kinvey.Query.');
        }

        // Prepare the response.
        var promise = Kinvey.Persistence.destroy({
          namespace: DATA_STORE,
          collection: collection,
          query: query,
          auth: Auth.Default,
          local: {
            req: true,
            res: true
          }
        }, options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Deleted the documents.', response);
          }, function(error) {
            log('Failed to delete the documents.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Deletes a document.
       *
       * @param {string} collection Collection.
       * @param {string} id Document id.
       * @param {Options} [options] Options.
       * @param {boolean} [options.silent=false] Succeed if the document did not
       *          exist prior to deleting.
       * @returns {Promise} The response.
       */
      destroy: function(collection, id, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Deleting a document.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.destroy({
          namespace: DATA_STORE,
          collection: collection,
          id: id,
          auth: Auth.Default,
          local: {
            req: true,
            res: true
          }
        }, options).then(null, function(error) {
          // If `options.silent`, treat `ENTITY_NOT_FOUND` as success.
          if(options.silent && Kinvey.Error.ENTITY_NOT_FOUND === error.name) {
            // Debug.
            if(KINVEY_DEBUG) {
              log('The document does not exist. Returning success because of the silent flag.');
            }

            return {
              count: 0
            }; // The response.
          }
          return Kinvey.Defer.reject(error);
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Deleted the document.', response);
          }, function(error) {
            log('Failed to delete the document.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Performs a count operation.
       *
       * @param {string} collection The collection.
       * @param {Kinvey.Query} [query] The query.
       * @param {Options} [options] Options.
       * @throws {Kinvey.Error} `query` must be of type: `Kinvey.Query`.
       * @returns {Promise} The response.
       */
      count: function(collection, query, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Counting the number of documents.', arguments);
        }

        // Validate arguments.
        if(null != query && !(query instanceof Kinvey.Query)) {
          throw new Kinvey.Error('query argument must be of type: Kinvey.Query.');
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.read({
          namespace: DATA_STORE,
          collection: collection,
          id: '_count',
          query: query,
          auth: Auth.Default,
          local: {
            req: true
          }
        }, options).then(function(response) {
          return response.count;
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Counted the number of documents.', response);
          }, function(error) {
            log('Failed to count the number of documents.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Performs a group operation.
       *
       * @param {string} collection The collection.
       * @param {Kinvey.Aggregation} aggregation The aggregation.
       * @param {Options} [options] Options.
       * @throws {Kinvey.Error} `aggregation` must be of type `Kinvey.Group`.
       * @returns {Promise} The response.
       */
      group: function(collection, aggregation, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Grouping documents', arguments);
        }

        // Validate arguments.
        if(!(aggregation instanceof Kinvey.Group)) {
          throw new Kinvey.Error('aggregation argument must be of type: Kinvey.Group.');
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.create({
          namespace: DATA_STORE,
          collection: collection,
          id: '_group',
          data: aggregation.toJSON(),
          auth: Auth.Default,
          local: {
            req: true
          }
        }, options).then(function(response) {
          // Process the raw response.
          return aggregation.postProcess(response);
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Grouped the documents.', response);
          }, function(error) {
            log('Failed to group the documents.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      }
    };

    /* jshint sub: true */

    // Files.
    // ------

    // REST API wrapper for files.

    /**
     * @memberof! <global>
     * @namespace Kinvey.File
     */
    Kinvey.File = /** @lends Kinvey.File */ {
      /**
       * Deletes a file.
       *
       * @param {string} name Name.
       * @param {Options} [options] Options.
       * @param {boolean} [options.silent=false] Succeed if the file did not exist
       *          prior to deleting.
       * @returns {Promise} The response.
       */
      destroy: function(id, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Deleting a file.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.destroy({
          namespace: FILES,
          id: id,
          auth: Auth.Default
        }, options).then(null, function(error) {
          // If `options.silent`, treat `BLOB_NOT_FOUND` as success.
          if(options.silent && Kinvey.Error.BLOB_NOT_FOUND === error.name) {
            // Debug.
            if(KINVEY_DEBUG) {
              log('The file does not exist. Returning success because of the silent flag.');
            }

            // Return the response.
            return {
              count: 0
            };
          }
          return Kinvey.Defer.reject(error);
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Deleted the file.', response);
          }, function(error) {
            log('Failed to delete the file.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Downloads a file.
       *
       * @param {string} id File id.
       * @param {Options} [options] Options.
       * @param {boolean} [options.stream=false] Stream instead of download.
       * @param {boolean} [options.tls=true] Use the https protocol to communicate
       *          with GCS.
       * @param {integer} [options.ttl] A custom expiration time (in seconds).
       * @returns {Promise} The file metadata if `options.stream`, a file resource
       *            otherwise.
       */
      download: function(id, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Downloading a file.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Build the flags.
        var flags = {};
        if(false !== options.tls) {
          flags.tls = true;
        }
        if(options.ttl) {
          flags.ttl_in_seconds = options.ttl;
        }

        // Prepare the response.
        var promise = Kinvey.Persistence.read({
          namespace: FILES,
          id: id,
          flags: flags,
          auth: Auth.Default
        }, options).then(function(response) {
          // If `options.stream`, return the file metadata instead of the resource.
          if(options.stream) {
            // Debug.
            if(KINVEY_DEBUG) {
              log('Returning the file metadata only because of the stream flag.');
            }
            return response;
          }

          // Temporarily reset some options to avoid invoking the callbacks
          // multiple times.
          var success = options.success;
          var error = options.error;
          delete options.success;
          delete options.error;

          // Download the actual file, and return the composite response.
          return Kinvey.File.downloadByUrl(response, options).then(function(response) {
            // Restore the options and return the response.
            options.success = success;
            options.error = error;
            return response;
          }, function(reason) {
            // Restore the options and return the error.
            options.success = success;
            options.error = error;
            return Kinvey.Defer.reject(reason);
          });
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Downloaded the file.', response);
          }, function(error) {
            log('Failed to download the file.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Downloads a file given its URL or metadata object.
       *
       * @param {Object|string} metadataOrUrl File download URL, or metadata.
       * @param {Options} [options]           Options.
       * @param {Object}  [options.headers]   Any request headers to send to GCS.
       * @returns {Promise} The file metadata and resource.
       */
      downloadByUrl: function(metadataOrUrl, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Downloading a file by URL.', arguments);
        }

        // Cast arguments.
        var metadata = isObject(metadataOrUrl) ? metadataOrUrl : {
          _downloadURL: metadataOrUrl
        };
        options = options || {};
        options.file = metadata.mimeType || 'application-octet-stream';
        options.headers = options.headers || {};
        delete options.headers['Content-Type'];

        // Download the file, and return a composite response.
        var url = metadata._downloadURL;
        var download = Kinvey.Persistence.Net.request('GET', url, null, options.headers, options);
        download = download.then(function(data) {
          metadata._data = data; // Merge into the file metadata.
          return metadata;
        }, function(reason) {
          // Since the error originates from a different host, convert it into a
          // `BLOB_NOT_FOUND` client-side error.
          var error = clientError(Kinvey.Error.REQUEST_ERROR, {
            description: 'This file could not be downloaded from the provided URL.',
            debug: reason
          });
          return Kinvey.Defer.reject(error);
        });

        // Debug.
        if(KINVEY_DEBUG) {
          download.then(function(response) {
            log('Downloaded the file by URL.', response);
          }, function(error) {
            log('Failed to download a file by URL.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(download, options);
      },

      /**
       * Retrieves all files matching the provided query.
       *
       * @param {Kinvey.Query} [query] The query.
       * @param {Object} [options] Options.
       * @param {boolean} [options.download] Download the actual file resources.
       * @param {boolean} [options.tls=true] Use the https protocol to communicate
       *          with GCS.
       * @param {integer} [options.ttl] A custom expiration time.
       * @throws {Kinvey.Error} `query` must be of type: `Kinvey.Query`.
       * @returns {Promise} A list of files.
       */
      find: function(query, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Retrieving files by query.', arguments);
        }

        // Validate arguments.
        if(null != query && !(query instanceof Kinvey.Query)) {
          throw new Kinvey.Error('query argument must be of type: Kinvey.Query.');
        }

        // Cast arguments.
        options = options || {};

        // Build the flags.
        var flags = {};
        if(false !== options.tls) {
          flags.tls = true;
        }
        if(options.ttl) {
          flags.ttl_in_seconds = options.ttl;
        }

        // Prepare the response.
        var promise = Kinvey.Persistence.read({
          namespace: FILES,
          query: query,
          flags: flags,
          auth: Auth.Default
        }, options).then(function(response) {
          // If `options.download`, download the file resources.
          if(options.download) {
            // Debug.
            if(KINVEY_DEBUG) {
              log('Obtaining the file resources.', response);
            }

            // Temporarily reset some options to avoid invoking the callbacks
            // multiple times.
            var success = options.success;
            var error = options.error;
            delete options.success;
            delete options.error;

            // Download the actual files in parallel, and return the composite
            // response.
            var promises = response.map(function(file) {
              return Kinvey.File.downloadByUrl(file, options);
            });
            return Kinvey.Defer.all(promises).then(function(response) {
              // Restore the options and return the response.
              options.success = success;
              options.error = error;
              return response;
            }, function(reason) {
              // Restore the options and return the error.
              options.success = success;
              options.error = error;
              return Kinvey.Defer.reject(reason);
            });
          }
          return response;
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Retrieved the files by query.', response);
          }, function(error) {
            log('Failed to retrieve the files by query.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Streams a file.
       *
       * @param {string} name Name.
       * @param {Options} [options] Options.
       * @param {boolean} [options.tls=true] Use the https protocol to communicate
       *          with GCS.
       * @param {integer} [options.ttl] A custom expiration time.
       * @returns {Promise} The download URI.
       */
      stream: function(name, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Streaming a file.', arguments);
        }

        // Forward to `Kinvey.File.download`, with the `stream` flag set.
        options = options || {};
        options.stream = true;
        return Kinvey.File.download(name, options);
      },

      /**
       * Uploads a file.
       *
       * @param {*}       file               The file.
       * @param {Object}  [data]             The files’ metadata.
       * @param {Options} [options]          Options.
       * @param {boolean} [options.public]   Mark the file publicly-readable.
       * @param {boolean} [options.tls=true] Use the https protocol to communicate
       *          with GCS.
       * @returns {Promise} The response.
       */
      upload: function(file, data, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Uploading a file.', arguments);
        }

        // Cast arguments.
        file = file || {};
        data = data || {};
        options = options || {};

        // Attempt to extract metadata from the file resource.
        if(null == data._filename && (null != file._filename || null != file.name)) {
          data._filename = file._filename || file.name;
        }
        if(null == data.size && (null != file.size || null != file.length)) {
          data.size = file.size || file.length;
        }
        data.mimeType = data.mimeType || file.mimeType || file.type || 'application/octet-stream';

        // Apply options.
        if(options['public']) {
          data._public = true;
        }
        options.contentType = data.mimeType;

        // Prepare the response.
        var promise = null != data._id ? Kinvey.Persistence.update({
          namespace: FILES,
          id: data._id,
          data: data,
          flags: false !== options.tls ? {
            tls: true
          } : null,
          auth: Auth.Default
        }, options) : Kinvey.Persistence.create({
          namespace: FILES,
          data: data,
          flags: false !== options.tls ? {
            tls: true
          } : null,
          auth: Auth.Default
        }, options);

        // Prepare the actual file upload.
        promise = promise.then(function(response) {
          var url = response._uploadURL;
          var headers = response._requiredHeaders || {};
          headers['Content-Type'] = options.contentType;

          // Delete fields from the response.
          delete response._expiresAt;
          delete response._requiredHeaders;
          delete response._uploadURL;

          // Upload the file, and return a composite response.
          var upload = Kinvey.Persistence.Net.request('PUT', url, file, headers, options);
          return upload.then(function() {
            response._data = file; // Merge into the file metadata.
            return response;
          });
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Uploaded the file.', response);
          }, function(error) {
            log('Failed to upload the file.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      }
    };

    // Metadata.
    // ---------

    // Patch JavaScript implementations lacking ISO-8601 date support.
    // http://jsfiddle.net/mplungjan/QkasD/
    var fromISO = function(dateString) {
      var date = Date.parse(dateString);
      if(date) {
        return new Date(date);
      }

      // Patch here.
      var regex = /^(\d{4}\-\d\d\-\d\d([tT][\d:\.]*)?)([zZ]|([+\-])(\d\d):?(\d\d))?$/;
      var match = dateString.match(regex);
      if(null != match[1]) {
        var day = match[1].split(/\D/).map(function(segment) {
          return root.parseInt(segment, 10) || 0;
        });
        day[1] -= 1; // Months range 0–11.
        day = new Date(Date.UTC.apply(Date, day));

        // Adjust for timezone.
        if(null != match[5]) {
          var timezone = root.parseInt(match[5], 10) / 100 * 60;
          timezone += (null != match[6] ? root.parseInt(match[6], 10) : 0);
          timezone *= ('+' === match[4]) ? -1 : 1;
          if(timezone) {
            day.setUTCMinutes(day.getUTCMinutes() * timezone);
          }
        }
        return day;
      }
      return NaN; // Invalid.
    };

    // Wrapper for accessing the `_acl` and `_kmd` properties of a document
    // (i.e. entity and users).

    /**
     * The Kinvey.Metadata class.
     *
     * @memberof! <global>
     * @class Kinvey.Metadata
     * @param {Object} document The document.
     * @throws {Kinvey.Error} `document` must be of type: `Object`.
     */
    Kinvey.Metadata = function(document) {
      // Validate arguments.
      if(!isObject(document)) {
        throw new Kinvey.Error('document argument must be of type: Object.');
      }

      /**
       * The ACL.
       *
       * @private
       * @type {Kinvey.Acl}
       */
      this._acl = null;

      /**
       * The document.
       *
       * @private
       * @type {Object}
       */
      this._document = document;
    };

    // Define the Metadata methods.
    Kinvey.Metadata.prototype = /** @lends Kinvey.Metadata# */ {
      /**
       * Returns the document ACL.
       *
       * @returns {Kinvey.Acl} The ACL.
       */
      getAcl: function() {
        if(null === this._acl) {
          this._acl = new Kinvey.Acl(this._document);
        }
        return this._acl;
      },

      /**
       * Returns the date when the entity was created.
       *
       * @returns {?Date} Created at date, or `null` if not set.
       */
      getCreatedAt: function() {
        if(null != this._document._kmd && null != this._document._kmd.ect) {
          return fromISO(this._document._kmd.ect);
        }
        return null;
      },

      /**
       * Returns the email verification status.
       *
       * @returns {?Object} The email verification status, or `null` if not set.
       */
      getEmailVerification: function() {
        if(null != this._document._kmd && null != this._document._kmd.emailVerification) {
          return this._document._kmd.emailVerification.status;
        }
        return null;
      },

      /**
       * Returns the date when the entity was last modified.
       *
       * @returns {?Date} Last modified date, or `null` if not set.
       */
      getLastModified: function() {
        if(null != this._document._kmd && null != this._document._kmd.lmt) {
          return fromISO(this._document._kmd.lmt);
        }
        return null;
      },

      /**
       * Sets the document ACL.
       *
       * @param {Kinvey.Acl} acl The ACL.
       * @throws {Kinvey.Error} `acl` must be of type: `Kinvey.Acl`.
       * @returns {Kinvey.Metadata} The metadata.
       */
      setAcl: function(acl) {
        // Validate arguments.
        if(!(acl instanceof Kinvey.Acl)) {
          throw new Kinvey.Error('acl argument must be of type: Kinvey.Acl.');
        }

        this._acl = null; // Reset.
        this._document._acl = acl.toJSON();
        return this;
      },

      /**
       * Returns JSON representation of the document.
       *
       * @returns {Object} The document.
       */
      toJSON: function() {
        return this._document;
      }
    };

    // Social Identities.
    // ------------------

    // An app can remove friction by not requiring users to create special
    // usernames and passwords just for the app. Instead, the app can offer options
    // for users to login using social identities. The flow of obtaining the tokens
    // from the social party is defined below.

    // List of supported providers.
    var supportedProviders = ['facebook', 'google', 'linkedIn', 'twitter'];

    /**
     * @private
     * @namespace
     */
    var Social = {
      /**
       * Sets the implementation of `Kinvey.Social` to the specified adapter.
       *
       * @method
       * @param {Object} adapter Object implementing the `Kinvey.Social`
       *          interface.
       */
      use: use(supportedProviders)
    };

    // Add stubs for the provider methods.
    supportedProviders.forEach(function(provider) {
      Social[provider] = methodNotImplemented('Social.' + provider);
    });

    /**
     * @memberof! <global>
     * @namespace Kinvey.Social
     */
    Kinvey.Social = /** @lends Kinvey.Social */ {
      /**
       * Links a social identity to the provided (if any) Kinvey user.
       *
       * @param {Object} [user] The associated user.
       * @param {string} provider The provider.
       * @param {Options} [options] Options.
       * @param {boolean} [options.create=true] Create a new user if no user with
       *          the provided social identity exists.
       * @throws {Kinvey.Error} `provider` is not supported.
       * @returns {Promise} The user.
       */
      connect: function(user, provider, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Linking a social identity to a Kinvey user.', arguments);
        }

        // Cast and validate arguments.
        options = options || {};
        options.create = 'undefined' !== typeof options.create ? options.create : true;
        if(!Kinvey.Social.isSupported(provider)) {
          throw new Kinvey.Error('provider argument is not supported.');
        }

        // Remove callbacks from `options` to avoid multiple calls.
        var success = options.success;
        var error = options.error;
        delete options.success;
        delete options.error;

        // Obtain the OAuth tokens for the specified provider.
        var promise = Social[provider](options).then(function(tokens) {
          // Update the user data.
          user = user || {};

          // If the user is the active user, forward to `Kinvey.User.update`.
          var activeUser = Kinvey.getActiveUser();
          user._socialIdentity = user._socialIdentity || {};
          user._socialIdentity[provider] = tokens;
          if(null !== activeUser && activeUser._id === user._id) {
            options._provider = provider; // Force tokens to be updated.
            return Kinvey.User.update(user, options);
          }

          // Attempt logging in with the tokens.
          user._socialIdentity = {};
          user._socialIdentity[provider] = tokens;
          return Kinvey.User.login(user, null, options).then(null, function(error) {
            // If `options.create`, attempt to signup as a new user if no user with
            // the identity exists.
            if(options.create && Kinvey.Error.USER_NOT_FOUND === error.name) {
              return Kinvey.User.signup(user, options);
            }
            return Kinvey.Defer.reject(error);
          });
        });

        // Restore the options.
        promise = promise.then(function(response) {
          options.success = success;
          options.error = error;
          return response;
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Linked the social identity to the Kinvey user.', response);
          }, function(error) {
            log('Failed to link a social identity to a Kinvey user.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Removes a social identity from the provided Kinvey user.
       *
       * @param {Object} [user] The user.
       * @param {string} provider The provider.
       * @param {Options} [options] Options.
       * @throws {Kinvey.Error} `provider` is not supported.
       * @returns {Promise} The user.
       */
      disconnect: function(user, provider, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Unlinking a social identity from a Kinvey user.', arguments);
        }

        // Cast and validate arguments.
        if(!Kinvey.Social.isSupported(provider)) {
          throw new Kinvey.Error('provider argument is not supported.');
        }

        // Update the user data.
        user._socialIdentity = user._socialIdentity || {};
        user._socialIdentity[provider] = null;

        // If the user exists, forward to `Kinvey.User.update`. Otherwise, resolve
        // immediately.
        if(null == user._id) {
          var promise = Kinvey.Defer.resolve(user);
          return wrapCallbacks(promise, options);
        }
        return Kinvey.User.update(user, options);
      },

      /**
       * Links a Facebook identity to the provided (if any) Kinvey user.
       *
       * @param {Object} [user] The associated user.
       * @param {Options} [options] Options.
       * @returns {Promise} The user.
       */
      facebook: function(user, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Linking a Facebook identity to a Kinvey user.', arguments);
        }

        // Forward to `Kinvey.Social.connect`.
        return Kinvey.Social.connect(user, 'facebook', options);
      },

      /**
       * Links a Google+ identity to the provided (if any) Kinvey user.
       *
       * @param {Object} [user] The associated user.
       * @param {Options} [options] Options.
       * @returns {Promise} The user.
       */
      google: function(user, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Linking a Google+ identity to a Kinvey user.', arguments);
        }

        // Forward to `Kinvey.Social.connect`.
        return Kinvey.Social.connect(user, 'google', options);
      },

      /**
       * Returns whether a social provider is supported.
       *
       * @param {string} provider The provider.
       * @returns {boolean}
       */
      isSupported: function(provider) {
        return -1 !== supportedProviders.indexOf(provider);
      },

      /**
       * Links a LinkedIn identity to the provided (if any) Kinvey user.
       *
       * @param {Object} [user] The associated user.
       * @param {Options} [options] Options.
       * @returns {Promise} The user.
       */
      linkedIn: function(user, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Linking a LinkedIn identity to a Kinvey user.', arguments);
        }

        // Forward to `Kinvey.Social.connect`.
        return Kinvey.Social.connect(user, 'linkedIn', options);
      },

      /**
       * Links a Twitter identity to the provided (if any) Kinvey user.
       *
       * @param {Object} [user] The associated user.
       * @param {Options} [options] Options.
       * @returns {Promise} The user.
       */
      twitter: function(user, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Linking a Twitter identity to a Kinvey user.', arguments);
        }

        // Forward to `Kinvey.Social.connect`.
        return Kinvey.Social.connect(user, 'twitter', options);
      }
    };

    // Users.
    // ------

    // REST API wrapper for user management with the Kinvey services. Note the
    // [active user](http://devcenter.kinvey.com/guides/users#ActiveUser) is not
    // exclusively managed in this namespace: `Kinvey.getActiveUser` and
    // `Kinvey.Auth.Session` operate on the active user as well.

    /**
     * @memberof! <global>
     * @namespace Kinvey.User
     */
    Kinvey.User = /** @lends Kinvey.User */ {
      /**
       * Signs up a new user.
       *
       * @param {Object} [data] User data.
       * @param {Options} [options] Options.
       * @returns {Promise} The new user.
       */
      signup: function(data, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Signing up a new user.', arguments);
        }

        // Forward to `Kinvey.User.create`. Signup, however, always marks the
        // created user as the active user.
        options = options || {};
        options.state = true; // Overwrite.
        return Kinvey.User.create(data, options);
      },

      /**
       * Logs in an existing user.
       * NOTE If `options._provider`, this method should trigger a BL script.
       *
       * @param {Object|string} usernameOrData Username, or user data.
       * @param {string} [password] Password.
       * @param {Options} [options] Options.
       * @param {boolean} [options._provider] Login via Business Logic. May only
       *          be used internally to provide social login for browsers.
       * @returns {Promise} The active user.
       */
      login: function(usernameOrData, password, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Logging in an existing user.', arguments);
        }

        // Validate preconditions.
        if(null !== Kinvey.getActiveUser()) {
          var error = clientError(Kinvey.Error.ALREADY_LOGGED_IN);
          return Kinvey.Defer.reject(error);
        }

        // Cast arguments.
        if(isObject(usernameOrData)) {
          options = 'undefined' !== typeof options ? options : password;
        }
        else {
          usernameOrData = {
            username: usernameOrData,
            password: password
          };
        }
        options = options || {};

        // Validate arguments.
        if(null == usernameOrData.username && null == usernameOrData.password &&
          null == usernameOrData._socialIdentity) {
          throw new Kinvey.Error('Argument must contain: username and password, or _socialIdentity.');
        }

        // Login with the specified credentials.
        var promise = Kinvey.Persistence.create({
          namespace: USERS,
          collection: options._provider ? null : 'login',
          data: usernameOrData,
          flags: options._provider ? {
            provider: options._provider
          } : {},
          auth: Auth.App,
          local: {
            res: true
          }
        }, options).then(function(user) {
          // Set and return the active user.
          Kinvey.setActiveUser(user);
          return user;
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Logged in the user.', response);
          }, function(error) {
            log('Failed to login the user.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Logs out the active user.
       *
       * @param {Options} [options] Options.
       * @param {boolean] [options.force=false] Reset the active user even if an
       *          `InvalidCredentials` error is returned.
       * @param {boolean} [options.silent=false] Succeed when there is no active
       *          user.
       * @returns {Promise} The previous active user.
       */
      logout: function(options) {
        // Cast arguments.
        options = options || {};

        // If `options.silent`, resolve immediately if there is no active user.
        var promise;
        if(options.silent && null === Kinvey.getActiveUser()) {
          promise = Kinvey.Defer.resolve(null);
        }
        else { // Otherwise, attempt to logout the active user.
          // Debug.
          if(KINVEY_DEBUG) {
            log('Logging out the active user.', arguments);
          }

          // Prepare the response.
          promise = Kinvey.Persistence.create({
            namespace: USERS,
            collection: '_logout',
            auth: Auth.Session
          }, options).then(null, function(error) {
            // If `options.force`, clear the active user on `INVALID_CREDENTIALS`.
            if(options.force && Kinvey.Error.INVALID_CREDENTIALS === error.name) {
              // Debug.
              if(KINVEY_DEBUG) {
                log('The user credentials are invalid. Returning success because of the force flag.');
              }
              return null;
            }
            return Kinvey.Defer.reject(error);
          }).then(function() {
            // Reset the active user, and return the previous active user. Make
            // sure to delete the authtoken.
            var previous = Kinvey.setActiveUser(null);
            if(null !== previous) {
              delete previous._kmd.authtoken;
            }
            return previous;
          });

          // Debug.
          if(KINVEY_DEBUG) {
            promise.then(function(response) {
              log('Logged out the active user.', response);
            }, function(error) {
              log('Failed to logout the active user.', error);
            });
          }
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Retrieves information on the active user.
       *
       * @param {Options} [options] Options.
       * @returns {Promise} The active user.
       */
      me: function(options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Retrieving information on the active user.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.read({
          namespace: USERS,
          collection: '_me',
          auth: Auth.Session,
          local: {
            req: true,
            res: true
          }
        }, options).then(function(user) {
          // The response is a fresh copy of the active user. However, the response
          // does not contain `_kmd.authtoken`. Therefore, extract it from the
          // stale copy.
          user._kmd = user._kmd || {};
          user._kmd.authtoken = Kinvey.getActiveUser()._kmd.authtoken;

          // Set and return the active user.
          Kinvey.setActiveUser(user);
          return user;
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Retrieved information on the active user.', response);
          }, function(error) {
            log('Failed to retrieve information on the active user.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Requests e-mail verification for a user.
       *
       * @param {string} username Username.
       * @param {Options} [options] Options.
       * @returns {Promise} The response.
       */
      verifyEmail: function(username, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Requesting e-mail verification.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.create({
          namespace: RPC,
          collection: username,
          id: 'user-email-verification-initiate',
          auth: Auth.App
        }, options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Requested e-mail verification.', response);
          }, function(error) {
            log('Failed to request e-mail verification.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Requests a username reminder for a user.
       *
       * @param {string} email E-mail.
       * @param {Options} [options] Options.
       * @returns {Promise} The response.
       */
      forgotUsername: function(email, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Requesting a username reminder.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.create({
          namespace: RPC,
          id: 'user-forgot-username',
          data: {
            email: email
          },
          auth: Auth.App
        }, options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Requested a username reminder.', response);
          }, function(error) {
            log('Failed to request a username reminder.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Requests a password reset for a user.
       *
       * @param {string} username Username.
       * @param {Options} [options] Options.
       * @returns {Promise} The response.
       */
      resetPassword: function(username, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Requesting a password reset.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.create({
          namespace: RPC,
          collection: username,
          id: 'user-password-reset-initiate',
          auth: Auth.App
        }, options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Requested a password reset.', response);
          }, function(error) {
            log('Failed to request a password reset.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Checks whether a username exists.
       *
       * @param {string} username Username to check.
       * @param {Options} [options] Options.
       * @returns {Promise} `true` if username exists, `false` otherwise.
       */
      exists: function(username, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Checking whether a username exists.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.create({
          namespace: RPC,
          id: 'check-username-exists',
          data: {
            username: username
          },
          auth: Auth.App
        }, options).then(function(response) {
          return response.usernameExists;
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Checked whether the username exists.', response);
          }, function(error) {
            log('Failed to check whether the username exists.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Creates a new user.
       *
       * @param {Object} [data] User data.
       * @param {Options} [options] Options.
       * @param {boolean} [options.state=true] Save the created user as the active
       *          user.
       * @returns {Promise} The new user.
       */
      create: function(data, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Creating a new user.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // If `options.state`, validate preconditions.
        if(false !== options.state && null !== Kinvey.getActiveUser()) {
          var error = clientError(Kinvey.Error.ALREADY_LOGGED_IN);
          return Kinvey.Defer.reject(error);
        }

        // Create the new user.
        var promise = Kinvey.Persistence.create({
          namespace: USERS,
          data: data || {},
          auth: Auth.App
        }, options).then(function(user) {
          // If `options.state`, set the active user.
          if(false !== options.state) {
            Kinvey.setActiveUser(user);
          }
          return user;
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Created the new user.', response);
          }, function(error) {
            log('Failed to create the new user.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Updates a user. To create a user, use `Kinvey.User.create` or
       * `Kinvey.User.signup`.
       *
       * @param {Object} data User data.
       * @param {Options} [options] Options.
       * @param {string} [options._provider] Do not strip the `access_token` for
       *          this provider. Should only be used internally.
       * @throws {Kinvey.Error} `data` must contain: `_id`.
       * @returns {Promise} The user.
       */
      update: function(data, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Updating a user.', arguments);
        }

        // Validate arguments.
        if(null == data._id) {
          throw new Kinvey.Error('data argument must contain: _id');
        }

        // Cast arguments.
        options = options || {};

        // Delete the social identities’ access tokens, unless the identity is
        // `options._provider`. The tokens will be re-added after updating.
        var tokens = [];
        if(null != data._socialIdentity) {
          for(var identity in data._socialIdentity) {
            if(data._socialIdentity.hasOwnProperty(identity)) {
              if(null != data._socialIdentity[identity] && identity !== options._provider) {
                tokens.push({
                  provider: identity,
                  access_token: data._socialIdentity[identity].access_token,
                  access_token_secret: data._socialIdentity[identity].access_token_secret
                });
                delete data._socialIdentity[identity].access_token;
                delete data._socialIdentity[identity].access_token_secret;
              }
            }
          }
        }

        // Prepare the response.
        var promise = Kinvey.Persistence.update({
          namespace: USERS,
          id: data._id,
          data: data,
          auth: Auth.Default,
          local: {
            res: true
          }
        }, options).then(function(user) {
          // Re-add the social identities’ access tokens.
          tokens.forEach(function(identity) {
            var provider = identity.provider;
            if(null != user._socialIdentity && null != user._socialIdentity[provider]) {
              ['access_token', 'access_token_secret'].forEach(function(field) {
                if(null != identity[field]) {
                  user._socialIdentity[provider][field] = identity[field];
                }
              });
            }
          });

          // If we just updated the active user, refresh it.
          var activeUser = Kinvey.getActiveUser();
          if(null !== activeUser && activeUser._id === user._id) {
            // Debug.
            if(KINVEY_DEBUG) {
              log('Updating the active user because the updated user was the active user.');
            }

            Kinvey.setActiveUser(user);
          }
          return user;
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Updated the user.', response);
          }, function(error) {
            log('Failed to update the user.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Retrieves all users matching the provided query.
       *
       * @param {Kinvey.Query} [query] The query.
       * @param {Options} [options] Options.
       * @param {boolean} [discover=false] Use
       *          [User Discovery](http://devcenter.kinvey.com/guides/users#lookup).
       * @throws {Kinvey.Error} `query` must be of type: `Kinvey.Query`.
       * @returns {Promise} A list of users.
       */
      find: function(query, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Retrieving users by query.', arguments);
        }

        // Validate arguments.
        if(null != query && !(query instanceof Kinvey.Query)) {
          throw new Kinvey.Error('query argument must be of type: Kinvey.Query.');
        }

        // Cast arguments.
        options = options || {};

        // If `options.discover`, use
        // [User Discovery](http://devcenter.kinvey.com/guides/users#lookup)
        // instead of querying the user namespace directly.
        var promise;
        if(options.discover) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Using User Discovery because of the discover flag.');
          }

          // Prepare the response.
          promise = Kinvey.Persistence.create({
            namespace: USERS,
            collection: '_lookup',
            data: null != query ? query.toJSON().filter : null,
            auth: Auth.Default,
            local: {
              req: true,
              res: true
            }
          }, options);
        }
        else {
          // Prepare the response.
          promise = Kinvey.Persistence.read({
            namespace: USERS,
            query: query,
            auth: Auth.Default,
            local: {
              req: true,
              res: true
            }
          }, options);
        }

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Retrieved the users by query.', response);
          }, function(error) {
            log('Failed to retrieve the users by query.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Retrieves a user.
       *
       * @param {string} id User id.
       * @param {Options} [options] Options.
       * @returns {Promise} The user.
       */
      get: function(id, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Retrieving a user.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.read({
          namespace: USERS,
          id: id,
          auth: Auth.Default,
          local: {
            req: true,
            res: true
          }
        }, options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Retrieved the user.', response);
          }, function(error) {
            log('Failed to return the user.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Deletes a user.
       *
       * @param {string} id User id.
       * @param {Options} [options] Options.
       * @param {boolean} [options.hard=false] Perform a hard delete.
       * @param {boolean} [options.silent=false] Succeed if the user did not exist
       *          prior to deleting.
       * @returns {Promise} The response.
       */
      destroy: function(id, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Deleting a user.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.destroy({
          namespace: USERS,
          id: id,
          flags: options.hard ? {
            hard: true
          } : {},
          auth: Auth.Default,
          local: {
            res: true
          }
        }, options).then(function(response) {
          // If we just deleted the active user, unset it here.
          var activeUser = Kinvey.getActiveUser();
          if(null !== activeUser && activeUser._id === id) {
            // Debug.
            if(KINVEY_DEBUG) {
              log('Deleting the active user because the deleted user was the active user.');
            }

            Kinvey.setActiveUser(null);
          }
          return response;
        }, function(error) {
          // If `options.silent`, treat `USER_NOT_FOUND` as success.
          if(options.silent && Kinvey.Error.USER_NOT_FOUND === error.name) {
            // Debug.
            if(KINVEY_DEBUG) {
              log('The user does not exist. Returning success because of the silent flag.');
            }

            return null;
          }
          return Kinvey.Defer.reject(error);
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Deleted the user.', response);
          }, function(error) {
            log('Failed to delete the user.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Restores a previously disabled user.
       *
       * @param {string} id User id.
       * @param {Options} [options] Options.
       * @returns {Promise} The response.
       */
      restore: function(id, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Restoring a previously disabled user.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.create({
          namespace: USERS,
          collection: id,
          id: '_restore',
          auth: Auth.Master
        }, options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Restored the previously disabled user.', response);
          }, function(error) {
            log('Failed to restore the previously disabled user.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Performs a count operation.
       *
       * @param {Kinvey.Query} [query] The query.
       * @param {Options} [options] Options.
       * @throws {Kinvey.Error} `query` must be of type: `Kinvey.Query`.
       * @returns {Promise} The response.
       */
      count: function(query, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Counting the number of users.', arguments);
        }

        // Validate arguments.
        if(null != query && !(query instanceof Kinvey.Query)) {
          throw new Kinvey.Error('query argument must be of type: Kinvey.Query.');
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.read({
          namespace: USERS,
          id: '_count',
          query: query,
          auth: Auth.Default,
          local: {
            req: true
          }
        }, options).then(function(response) {
          return response.count;
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Counted the number of users.', response);
          }, function(error) {
            log('Failed to count the number of users.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Performs a group operation.
       *
       * @param {Kinvey.Aggregation} aggregation The aggregation.
       * @param {Options} [options] Options.
       * @throws {Kinvey.Error} `aggregation` must be of type `Kinvey.Group`.
       * @returns {Promise} The response.
       */
      group: function(aggregation, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Grouping users.', arguments);
        }

        // Validate arguments.
        if(!(aggregation instanceof Kinvey.Group)) {
          throw new Kinvey.Error('aggregation argument must be of type: Kinvey.Group.');
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Kinvey.Persistence.create({
          namespace: USERS,
          id: '_group',
          data: aggregation.toJSON(),
          auth: Auth.Default,
          local: {
            req: true
          }
        }, options).then(function(response) {
          // Process the raw response.
          return aggregation.postProcess(response);
        });

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Grouped the users.', response);
          }, function(error) {
            log('Failed to group the users.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      }
    };

    // Querying.
    // ---------

    // The `Kinvey.Query` class provides an easy way to build queries, which can
    // then be passed to one of the REST API wrappers to query application data.
    // Internally, the class builds a MongoDB query.

    /**
     * The Kinvey.Query class.
     *
     * @memberof! <global>
     * @class Kinvey.Query
     * @param {Object} [options] Options.
     * @param {Object} [options.filter] Filter.
     * @param {Object} [options.sort] Sort.
     * @param {number} [options.skip] Skip.
     * @param {number} [options.limit] Limit.
     */
    Kinvey.Query = function(options) {
      // Cast arguments.
      options = options || {};

      /**
       * The MongoDB query.
       *
       * @private
       * @type {Object}
       */
      this._filter = options.filter || {};

      /**
       * The sorting order.
       *
       * @private
       * @type {Object}
       */
      this._sort = options.sort || {};

      /**
       * Number of documents to select.
       *
       * @private
       * @type {?number}
       */
      this._limit = options.limit || null;

      /**
       * Number of documents to skip from the start.
       *
       * @private
       * @type {number}
       */
      this._skip = options.skip || 0;

      /**
       * Maintain reference to the parent query in case the query is part of a
       * join.n
       *
       * @private
       * @type {?Kinvey.Query}
       */
      this._parent = null;
    };

    // Define the query methods.
    Kinvey.Query.prototype = /** @lends Kinvey.Query# */ {
      // Comparison.

      /**
       * Adds an equal to filter to the query. Requires `field` to equal `value`.
       * Any existing filters on `field` will be discarded.
       * http://docs.mongodb.org/manual/reference/operators/#comparison
       *
       * @param {string} field Field.
       * @param {*} value Value.
       * @returns {Kinvey.Query} The query.
       */
      equalTo: function(field, value) {
        this._filter[field] = value;
        return this;
      },

      /**
       * Adds a contains filter to the query. Requires `field` to contain at least
       * one of the members of `list`.
       * http://docs.mongodb.org/manual/reference/operator/in/
       *
       * @param {string} field Field.
       * @param {Array} values List of values.
       * @throws {Kinvey.Error} `values` must be of type: `Array`.
       * @returns {Kinvey.Query} The query.
       */
      contains: function(field, values) {
        // Validate arguments.
        if(!isArray(values)) {
          throw new Kinvey.Error('values argument must be of type: Array.');
        }

        return this._addFilter(field, '$in', values);
      },

      /**
       * Adds a contains all filter to the query. Requires `field` to contain all
       * members of `list`.
       * http://docs.mongodb.org/manual/reference/operator/all/
       *
       * @param {string} field Field.
       * @param {Array} values List of values.
       * @throws {Kinvey.Error} `values` must be of type: `Array`.
       * @returns {Kinvey.Query} The query.
       */
      containsAll: function(field, values) {
        // Validate arguments.
        if(!isArray(values)) {
          throw new Kinvey.Error('values argument must be of type: Array.');
        }

        return this._addFilter(field, '$all', values);
      },

      /**
       * Adds a greater than filter to the query. Requires `field` to be greater
       * than `value`.
       * http://docs.mongodb.org/manual/reference/operator/gt/
       *
       * @param {string} field Field.
       * @param {number|string} value Value.
       * @throws {Kinvey.Error} `value` must be of type: `number` or `string`.
       * @returns {Kinvey.Query} The query.
       */
      greaterThan: function(field, value) {
        // Validate arguments.
        if(!(isNumber(value) || isString(value))) {
          throw new Kinvey.Error('value argument must be of type: number or string.');
        }

        return this._addFilter(field, '$gt', value);
      },

      /**
       * Adds a greater than or equal to filter to the query. Requires `field` to
       * be greater than or equal to `value`.
       * http://docs.mongodb.org/manual/reference/operator/gte/
       *
       * @param {string} field Field.
       * @param {number|string} value Value.
       * @throws {Kinvey.Error} `value` must be of type: `number` or `string`.
       * @returns {Kinvey.Query} The query.
       */
      greaterThanOrEqualTo: function(field, value) {
        // Validate arguments.
        if(!(isNumber(value) || isString(value))) {
          throw new Kinvey.Error('value argument must be of type: number or string.');
        }

        return this._addFilter(field, '$gte', value);
      },

      /**
       * Adds a less than filter to the query. Requires `field` to be less than
       * `value`.
       * http://docs.mongodb.org/manual/reference/operator/lt/
       *
       * @param {string} field Field.
       * @param {number|string} value Value.
       * @throws {Kinvey.Error} `value` must be of type: `number` or `string`.
       * @returns {Kinvey.Query} The query.
       */
      lessThan: function(field, value) {
        // Validate arguments.
        if(!(isNumber(value) || isString(value))) {
          throw new Kinvey.Error('value argument must be of type: number or string.');
        }

        return this._addFilter(field, '$lt', value);
      },

      /**
       * Adds a less than or equal to filter to the query. Requires `field` to be
       * less than or equal to `value`.
       * http://docs.mongodb.org/manual/reference/operator/lte/
       *
       * @param {string} field Field.
       * @param {number|string} value Value.
       * @throws {Kinvey.Error} `value` must be of type: `number` or `string`.
       * @returns {Kinvey.Query} The query.
       */
      lessThanOrEqualTo: function(field, value) {
        // Validate arguments.
        if(!(isNumber(value) || isString(value))) {
          throw new Kinvey.Error('value argument must be of type: number or string.');
        }

        return this._addFilter(field, '$lte', value);
      },

      /**
       * Adds a not equal to filter to the query. Requires `field` not to equal
       * `value`.
       * http://docs.mongodb.org/manual/reference/operator/ne/
       *
       * @param {string} field Field.
       * @param {*} value Value.
       * @returns {Kinvey.Query} The query.
       */
      notEqualTo: function(field, value) {
        return this._addFilter(field, '$ne', value);
      },

      /**
       * Adds a not contained in filter to the query. Requires `field` not to
       * contain any of the members of `list`.
       * http://docs.mongodb.org/manual/reference/operator/nin/
       *
       * @param {string} field Field.
       * @param {Array} values List of values.
       * @throws {Kinvey.Error} `values` must be of type: `Array`.
       * @returns {Kinvey.Query} The query.
       */
      notContainedIn: function(field, values) {
        // Validate arguments.
        if(!isArray(values)) {
          throw new Kinvey.Error('values argument must be of type: Array.');
        }

        return this._addFilter(field, '$nin', values);
      },

      // Logical. The operator precedence is as defined as: AND-NOR-OR.

      /**
       * Performs a logical AND operation on the query and the provided queries.
       * http://docs.mongodb.org/manual/reference/operator/and/
       *
       * @param {...Kinvey.Query|Object} Queries.
       * @throws {Kinvey.Error} `query` must be of type: `Kinvey.Query[]` or `Object[]`.
       * @returns {Kinvey.Query} The query.
       */
      and: function() {
        // AND has highest precedence. Therefore, even if this query is part of a
        // JOIN already, apply it on this query.
        return this._join('$and', Array.prototype.slice.call(arguments));
      },

      /**
       * Performs a logical NOR operation on the query and the provided queries.
       * http://docs.mongodb.org/manual/reference/operator/nor/
       *
       * @param {...Kinvey.Query|Object} Queries.
       * @throws {Kinvey.Error} `query` must be of type: `Kinvey.Query[]` or `Object[]`.
       * @returns {Kinvey.Query} The query.
       */
      nor: function() {
        // NOR is preceded by AND. Therefore, if this query is part of an AND-join,
        // apply the NOR onto the parent to make sure AND indeed precedes NOR.
        if(null !== this._parent && null != this._parent._filter.$and) {
          return this._parent.nor.apply(this._parent, arguments);
        }
        return this._join('$nor', Array.prototype.slice.call(arguments));
      },

      /**
       * Performs a logical OR operation on the query and the provided queries.
       * http://docs.mongodb.org/manual/reference/operator/or/
       *
       * @param {...Kinvey.Query|Object} Queries.
       * @throws {Kinvey.Error} `query` must be of type: `Kinvey.Query[]` or `Object[]`.
       * @returns {Kinvey.Query} The query.
       */
      or: function() {
        // OR has lowest precedence. Therefore, if this query is part of any join,
        // apply the OR onto the parent to make sure OR has indeed the lowest
        // precedence.
        if(null !== this._parent) {
          return this._parent.or.apply(this._parent, arguments);
        }
        return this._join('$or', Array.prototype.slice.call(arguments));
      },

      // Element.

      /**
       * Adds an exists filter to the query. Requires `field` to exist if `flag` is
       * `true`, or not to exist if `flag` is `false`.
       * http://docs.mongodb.org/manual/reference/operator/exists/
       *
       * @param {string} field Field.
       * @param {boolean} [flag=true] The exists flag.
       * @returns {Kinvey.Query} The query.
       */
      exists: function(field, flag) {
        flag = 'undefined' === typeof flag ? true : flag || false; // Cast.
        return this._addFilter(field, '$exists', flag);
      },

      /**
       * Adds a modulus filter to the query. Requires `field` modulo `divisor` to
       * have remainder `remainder`.
       * http://docs.mongodb.org/manual/reference/operator/mod/
       *
       * @param {string} field Field.
       * @param {number} divisor Divisor.
       * @param {number} [remainder=0] Remainder.
       * @throws {Kinvey.Error} * `divisor` must be of type: `number`.
       *                         * `remainder` must be of type: `number`.
       * @returns {Kinvey.Query} The query.
       */
      mod: function(field, divisor, remainder) {
        // Cast arguments.
        if(isString(divisor)) {
          divisor = parseFloat(divisor);
        }
        if('undefined' === typeof remainder) {
          remainder = 0;
        }
        else if(isString(remainder)) {
          remainder = parseFloat(remainder);
        }

        // Validate arguments.
        if(!isNumber(divisor)) {
          throw new Kinvey.Error('divisor arguments must be of type: number.');
        }
        if(!isNumber(remainder)) {
          throw new Kinvey.Error('remainder argument must be of type: number.');
        }

        return this._addFilter(field, '$mod', [divisor, remainder]);
      },

      // JavaScript.

      /**
       * Adds a match filter to the query. Requires `field` to match `regExp`.
       * http://docs.mongodb.org/manual/reference/operator/regex/
       *
       * @param {string} field Field.
       * @param {RegExp|string} regExp Regular expression.
       * @param {Object} [options] Options.
       * @param {boolean} [options.ignoreCase=inherit] Toggles case insensitivity.
       * @param {boolean} [options.multiline=inherit] Toggles multiline matching.
       * @param {boolean} [options.extended=false] Toggles extended capability.
       * @param {boolean} [options.dotMatchesAll=false] Toggles dot matches all.
       * @returns {Kinvey.Query} The query.
       */
      matches: function(field, regExp, options) {
        // Cast arguments.
        if(!isRegExp(regExp)) {
          regExp = new RegExp(regExp);
        }

        // Flags.
        options = options || {};
        var flags = [];
        if((regExp.ignoreCase || options.ignoreCase) && false !== options.ignoreCase) {
          flags.push('i');
        }
        if((regExp.multiline || options.multiline) && false !== options.multiline) {
          flags.push('m');
        }
        if(options.extended) {
          flags.push('x');
        }
        if(options.dotMatchesAll) {
          flags.push('s');
        }

        // `$regex` and `$options` are separate filters.
        var result = this._addFilter(field, '$regex', regExp.source);
        if(0 !== flags.length) {
          this._addFilter(field, '$options', flags.join(''));
        }
        return result;
      },

      // Geospatial.

      /**
       * Adds a near filter to the query. Requires `field` to be a coordinate
       * within `maxDistance` of `coord`. Sorts documents from nearest to farthest.
       * http://docs.mongodb.org/manual/reference/operator/near/
       *
       * @param {string} field The field.
       * @param {Array.<number, number>} coord The coordinate (longitude, latitude).
       * @param {number} [maxDistance] The maximum distance (miles).
       * @throws {Kinvey.Error} `coord` must be of type: `Array.<number, number>`.
       * @returns {Kinvey.Query} The query.
       */
      near: function(field, coord, maxDistance) {
        // Validate arguments.
        if(!isArray(coord) || null == coord[0] || null == coord[1]) {
          throw new Kinvey.Error('coord argument must be of type: Array.<number, number>.');
        }

        // Cast arguments.
        coord[0] = parseFloat(coord[0]);
        coord[1] = parseFloat(coord[1]);

        // `$nearSphere` and `$maxDistance` are separate filters.
        var result = this._addFilter(field, '$nearSphere', [coord[0], coord[1]]);
        if(null != maxDistance) {
          this._addFilter(field, '$maxDistance', maxDistance);
        }
        return result;
      },

      /**
       * Adds a within box filter to the query. Requires `field` to be a coordinate
       * within the bounds of the rectangle defined by `bottomLeftCoord`,
       * `bottomRightCoord`.
       * http://docs.mongodb.org/manual/reference/operator/box/
       *
       * @param {string} field The field.
       * @param {Array.<number, number>} bottomLeftCoord The bottom left coordinate
       *          (longitude, latitude).
       * @param {Array.<number, number>} upperRightCoord The bottom right
       *          coordinate (longitude, latitude).
       * @throws {Kinvey.Error} * `bottomLeftCoord` must be of type: `Array.<number, number>`.
       *                         * `bottomRightCoord` must be of type: `Array.<number, number>`.
       * @returns {Kinvey.Query} The query.
       */
      withinBox: function(field, bottomLeftCoord, upperRightCoord) {
        // Validate arguments.
        if(!isArray(bottomLeftCoord) || null == bottomLeftCoord[0] || null == bottomLeftCoord[1]) {
          throw new Kinvey.Error('bottomLeftCoord argument must be of type: Array.<number, number>.');
        }
        if(!isArray(upperRightCoord) || null == upperRightCoord[0] || null == upperRightCoord[1]) {
          throw new Kinvey.Error('upperRightCoord argument must be of type: Array.<number, number>.');
        }

        // Cast arguments.
        bottomLeftCoord[0] = parseFloat(bottomLeftCoord[0]);
        bottomLeftCoord[1] = parseFloat(bottomLeftCoord[1]);
        upperRightCoord[0] = parseFloat(upperRightCoord[0]);
        upperRightCoord[1] = parseFloat(upperRightCoord[1]);

        var coords = [
          [bottomLeftCoord[0], bottomLeftCoord[1]],
          [upperRightCoord[0], upperRightCoord[1]]
        ];
        return this._addFilter(field, '$within', {
          $box: coords
        });
      },

      /**
       * Adds a within polygon filter to the query. Requires `field` to be a
       * coordinate within the bounds of the polygon defined by `coords`.
       * http://docs.mongodb.org/manual/reference/operator/polygon/
       *
       * @param {string} field The field.
       * @param {Array.Array.<number, number>} coords List of coordinates.
       * @throws {Kinvey.Error} `coords` must be of type `Array.Array.<number, number>`.
       * @returns {Kinvey.Query} The query.
       */
      withinPolygon: function(field, coords) {
        // Validate arguments.
        if(!isArray(coords) || 3 > coords.length) {
          throw new Kinvey.Error('coords argument must be of type: Array.Array.<number, number>.');
        }

        // Cast and validate arguments.
        coords = coords.map(function(coord) {
          if(null == coord[0] || null == coord[1]) {
            throw new Kinvey.Error('coords argument must be of type: Array.Array.<number, number>.');
          }
          return [parseFloat(coord[0]), parseFloat(coord[1])];
        });

        return this._addFilter(field, '$within', {
          $polygon: coords
        });
      },

      // Array.

      /**
       * Adds a size filter to the query. Requires `field` to be an `Array` with
       * exactly `size` members.
       * http://docs.mongodb.org/manual/reference/operator/size/
       *
       * @param {string} field Field.
       * @param {number} size Size.
       * @throws {Kinvey.Error} `size` must be of type: `number`.
       * @returns {Kinvey.Query} The query.
       */
      size: function(field, size) {
        // Cast arguments.
        if(isString(size)) {
          size = parseFloat(size);
        }

        // Validate arguments.
        if(!isNumber(size)) {
          throw new Kinvey.Error('size argument must be of type: number.');
        }

        return this._addFilter(field, '$size', size);
      },

      // Modifiers.

      /**
       * Sets the number of documents to select.
       *
       * @param {number} [limit] Limit.
       * @throws {Kinvey.Error} `limit` must be of type: `number`.
       * @returns {Kinvey.Query} The query.
       */
      limit: function(limit) {
        // Cast arguments.
        limit = limit || null;
        if(isString(limit)) {
          limit = parseFloat(limit);
        }

        // Validate arguments.
        if(null != limit && !isNumber(limit)) {
          throw new Kinvey.Error('limit argument must be of type: number.');
        }

        // Set limit on the top-level query.
        if(null !== this._parent) {
          this._parent.limit(limit);
        }
        else {
          this._limit = limit;
        }
        return this;
      },

      /**
       * Sets the number of documents to skip from the start.
       *
       * @param {number} skip Skip.
       * @throws {Kinvey.Error} `skip` must be of type: `number`.
       * @returns {Kinvey.Query} The query.
       */
      skip: function(skip) {
        // Cast arguments.
        if(isString(skip)) {
          skip = parseFloat(skip);
        }

        // Validate arguments.
        if(!isNumber(skip)) {
          throw new Kinvey.Error('skip argument must be of type: number.');
        }

        // Set skip on the top-level query.
        if(null !== this._parent) {
          this._parent.skip(skip);
        }
        else {
          this._skip = skip;
        }
        return this;
      },

      /**
       * Adds an ascending sort modifier to the query. Sorts by `field`, ascending.
       *
       * @param {string} field Field.
       * @returns {Kinvey.Query} The query.
       */
      ascending: function(field) {
        // Add sort on the top-level query.
        if(null !== this._parent) {
          this._parent.ascending(field);
        }
        else {
          this._sort[field] = 1;
        }
        return this;
      },

      /**
       * Adds an descending sort modifier to the query. Sorts by `field`,
       * descending.
       *
       * @param {string} field Field.
       * @returns {Kinvey.Query} The query.
       */
      descending: function(field) {
        // Add sort on the top-level query.
        if(null !== this._parent) {
          this._parent.descending(field);
        }
        else {
          this._sort[field] = -1;
        }
        return this;
      },

      /**
       * Sets the sort for the query. Any existing sort parameters will be
       * discarded.
       *
       * @param {Object} [sort] Sort.
       * @throws {Kinvey.Error} `sort` must be of type: `Object`.
       * @returns {Kinvey.Query} The query.
       */
      sort: function(sort) {
        // Validate arguments.
        if(null != sort && !isObject(sort)) {
          throw new Kinvey.Error('sort argument must be of type: Object.');
        }

        // Set sort on the top-level query.
        if(null !== this._parent) {
          this._parent.sort(sort);
        }
        else {
          this._sort = sort || {};
        }
        return this;
      },

      /**
       * Returns JSON representation of the query.
       *
       * @returns {Object} JSON object-literal.
       */
      toJSON: function() {
        // If the query is part of a join, return the top-level JSON representation
        // instead.
        if(null !== this._parent) {
          return this._parent.toJSON();
        }

        // Return set of parameters.
        return {
          filter: this._filter,
          sort: this._sort,
          skip: this._skip,
          limit: this._limit
        };
      },

      /**
       * Adds a filter to the query.
       *
       * @private
       * @param {string} field
       * @param {string} condition Condition.
       * @param {*} value Value.
       * @returns {Kinvey.Query} The query.
       */
      _addFilter: function(field, condition, value) {
        // Initialize the field selector.
        if(!isObject(this._filter[field])) {
          this._filter[field] = {};
        }
        this._filter[field][condition] = value;
        return this;
      },

      /**
       * Joins the current query with another query using an operator.
       *
       * @private
       * @param {string} operator Operator.
       * @param {Kinvey.Query[]|Object[]} queries Queries.
       * @throws {Kinvey.Error} `query` must be of type: `Kinvey.Query[]` or `Object[]`.
       * @returns {Kinvey.Query} The query.
       */
      _join: function(operator, queries) {
        // Cast, validate, and parse arguments. If `queries` are supplied, obtain
        // the `filter` for joining. The eventual return function will be the
        // current query.
        var result = this;
        queries = queries.map(function(query) {
          if(!(query instanceof Kinvey.Query)) {
            if(isObject(query)) { // Cast argument.
              query = new Kinvey.Query(query);
            }
            else {
              throw new Kinvey.Error('query argument must be of type: Kinvey.Query[] or Object[].');
            }
          }
          return query.toJSON().filter;
        });

        // If there are no `queries` supplied, create a new (empty) `Kinvey.Query`.
        // This query is the right-hand side of the join expression, and will be
        // returned to allow for a fluent interface.
        if(0 === queries.length) {
          result = new Kinvey.Query();
          queries = [result.toJSON().filter];
          result._parent = this; // Required for operator precedence and `toJSON`.
        }

        // Join operators operate on the top-level of `_filter`. Since the `toJSON`
        // magic requires `_filter` to be passed by reference, we cannot simply re-
        // assign `_filter`. Instead, empty it without losing the reference.
        var currentQuery = {};
        for(var member in this._filter) {
          if(this._filter.hasOwnProperty(member)) {
            currentQuery[member] = this._filter[member];
            delete this._filter[member];
          }
        }

        // `currentQuery` is the left-hand side query. Join with `queries`.
        this._filter[operator] = [currentQuery].concat(queries);

        // Return the current query if there are `queries`, and the new (empty)
        // `Kinvey.Query` otherwise.
        return result;
      },

      /**
       * Post processes the raw response by applying sort, limit, and skip.
       *
       * @private
       * @param {Array} response The raw response.
       * @throws {Kinvey.Error} `response` must be of type: `Array`.
       * @returns {Array} The processed response.
       */
      _postProcess: function(response) {
        // Validate arguments.
        if(!isArray(response)) {
          throw new Kinvey.Error('response argument must be of type: Array.');
        }

        // Sorting.
        // NOTE Sorting on dot-separated (nested) fields is not supported.
        var _this = this;
        response = response.sort(function(a, b) {
          for(var field in _this._sort) {
            if(_this._sort.hasOwnProperty(field)) {
              // Elements which do not contain the field should always be sorted
              // lower.
              if('undefined' !== typeof a[field] && 'undefined' === typeof b[field]) {
                return -1;
              }
              if('undefined' !== typeof b[field] && 'undefined' === typeof a[field]) {
                return 1;
              }

              // Sort on the current field. The modifier adjusts the sorting order
              // (ascending (-1), or descending(1)). If the fields are equal,
              // continue sorting based on the next field (if any).
              if(a[field] !== b[field]) {
                var modifier = _this._sort[field]; // 1 or -1.
                return(a[field] < b[field] ? -1 : 1) * modifier;
              }
            }
          }
          return 0;
        });

        // Limit and skip.
        if(null !== this._limit) {
          return response.slice(this._skip, this._skip + this._limit);
        }
        return response.slice(this._skip);
      }
    };

    // Relational Data.
    // ----------------

    // Helper function to get and set a nested property in a document.
    var nested = function(document, dotProperty, value) {
      if(!dotProperty) { // Top-level document.
        document = 'undefined' === typeof value ? document : value;
        return document;
      }

      var obj = document;
      var parts = dotProperty.split('.');

      // Traverse the document until the nested property is located.
      var current;
      while((current = parts.shift()) && null != obj && obj.hasOwnProperty(current)) {
        if(0 === parts.length) { // Return the (new) property value.
          obj[current] = 'undefined' === typeof value ? obj[current] : value;
          return obj[current];
        }
        obj = obj[current]; // Continue traversing.
      }
      return null; // Property not found.
    };

    /**
     * @private
     * @namespace KinveyReference
     */
    var KinveyReference = /** @lends KinveyReference */ {
      /**
       * Retrieves relations for a document.
       * NOTE This method should be used in conjunction with local persistence.
       *
       * @param {Array|Object} document The document, or list of documents.
       * @param {Options} options Options.
       * @returns {Promise} The document.
       */
      get: function(document, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Retrieving relations for a document.', document, options);
        }

        // If a list of documents was passed in, retrieve all relations in parallel.
        if(isArray(document)) {
          var promises = document.map(function(member) {
            return KinveyReference.get(member, options);
          });
          return Kinvey.Defer.all(promises);
        }

        // Cast arguments.
        options = options || {};
        options.exclude = options.exclude || [];
        options.relations = options.relations || {};

        // Temporarily reset some options to avoid infinite recursion and invoking
        // the callbacks multiple times.
        var error = options.error;
        var relations = options.relations;
        var success = options.success;
        delete options.error;
        delete options.relations;
        delete options.success;

        // Re-order the relations in order of deepness, so the partial responses
        // propagate properly. Moreover, relations with the same depth can safely
        // be retrieved in parallel.
        var properties = [];
        Object.keys(relations).forEach(function(relation) {
          var index = relation.split('.').length;
          properties[index] = (properties[index] || []).concat(relation);
        });

        // Prepare the response.
        var promise = Kinvey.Defer.resolve(null);

        // Retrieve all (relational) documents. Starts with the top-level relations.
        properties.forEach(function(relationalLevel) {
          promise = promise.then(function() {
            var promises = relationalLevel.map(function(property) {
              var reference = nested(document, property); // The reference.

              // Retrieve the relation(s) in parallel.
              var isArrayRelation = isArray(reference);
              var promises = (isArrayRelation ? reference : [reference]).map(function(member) {
                // Do not retrieve if the property is not a reference, or it is
                // explicitly excluded.
                if(null == member || 'KinveyRef' !== member._type || -1 !== options.exclude.indexOf(property)) {
                  return Kinvey.Defer.resolve(member);
                }

                // Forward to the `Kinvey.User` or `Kinvey.DataStore` namespace.
                var promise;
                if(USERS === member._collection) {
                  promise = Kinvey.User.get(member._id, options);
                }
                else {
                  promise = Kinvey.DataStore.get(member._collection, member._id, options);
                }

                // Return the response.
                return promise.then(null, function() {
                  // If the retrieval failed, retain the reference.
                  return Kinvey.Defer.resolve(member);
                });
              });

              // Return the response.
              return Kinvey.Defer.all(promises).then(function(responses) {
                // Replace the references in the document with the relations.
                nested(document, property, isArrayRelation ? responses : responses[0]);
              });
            });
            return Kinvey.Defer.all(promises);
          });
        });

        // All documents are retrieved.
        return promise.then(function() {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Retrieved relations for the document.', document);
          }

          // Restore the options and return the response.
          options.error = error;
          options.relations = relations;
          options.success = success;
          return document;
        }, function(reason) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Failed to retrieve relations for the document.', document);
          }

          // Restore the options and return the error.
          options.error = error;
          options.relations = relations;
          options.success = success;
          return Kinvey.Defer.reject(reason);
        });
      },

      /**
       * Saves a document and its relations.
       *
       * @param {string} collection The collection.
       * @param {Array|Object} document The document, or list of documents.
       * @param {Options} options Options.
       * @param {boolean} [options.force] Succeed even if the relations could
       *          not be saved successfully.
       * @returns {Promise} The document.
       */
      save: function(collection, document, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Saving a document with relations.', collection, document, options);
        }

        // If a list of documents was passed in, retrieve all relations in parallel.
        if(isArray(document)) {
          var promises = document.map(function(member) {
            return KinveyReference.save(collection, member, options);
          });
          return Kinvey.Defer.all(promises);
        }

        // Cast arguments.
        options = options || {};
        options.exclude = options.exclude || [];
        options.relations = options.relations || {};

        // Temporarily reset some options to avoid infinite recursion and invoking
        // the callbacks multiple times.
        var error = options.error;
        var relations = options.relations;
        var success = options.success;
        delete options.error;
        delete options.relations;
        delete options.success;

        // Re-order the relations in order of deepness, so the partial responses
        // propagate properly. Moreover, relations with the same depth can safely
        // be saved in parallel.
        var properties = [];
        relations[''] = collection; // Add the top-level document.
        Object.keys(relations).forEach(function(relation) {
          // The top-level document must be the only document with index 0.
          var index = '' === relation ? 0 : relation.split('.').length;
          properties[index] = (properties[index] || []).concat(relation);
        });

        // Prepare the response.
        var documents = {}; // Partial responses.
        var promise = Kinvey.Defer.resolve(null);

        // Save all (relational) documents. Start with the deepest relations.
        properties.reverse().forEach(function(relationalLevel) {
          promise = promise.then(function() {
            var promises = relationalLevel.map(function(property) {
              var collection = relations[property];
              var obj = nested(document, property); // The relational document.

              // Save the relation(s) in parallel.
              var isArrayRelation = isArray(obj);
              var promises = (isArrayRelation ? obj : [obj]).map(function(member) {
                // Do not save if the property is not a document or a reference
                // already, or it is explicitly excluded.
                if(null == member || 'KinveyRef' === member._type || -1 !== options.exclude.indexOf(property)) {
                  return Kinvey.Defer.resolve(member);
                }

                // To allow storing of users with references locally, use
                // `Kinvey.DataStore` if the operation does not need to notify
                // the synchronization functionality.
                var saveUsingDataStore = options.offline && false === options.track;

                // Forward to the `Kinvey.User` or `Kinvey.DataStore` namespace.
                var promise;
                if(USERS === collection && !saveUsingDataStore) {
                  // If the referenced user is new, create with `state` set to false.
                  var isNew = null == member._id;
                  options.state = isNew && '' !== property ? options.state || false : options.state;
                  promise = Kinvey.User[isNew ? 'create' : 'update'](member, options);
                }
                else {
                  promise = Kinvey.DataStore.save(collection, member, options);
                }

                // Return the response.
                return promise.then(null, function(error) {
                  // If `options.force`, succeed if the save failed.
                  if(options.force && '' !== property) {
                    return member;
                  }
                  return Kinvey.Defer.reject(error);
                });
              });

              // Return the response.
              return Kinvey.Defer.all(promises).then(function(responses) {
                // Replace the relations in the original document with references.
                var reference = responses.map(function(response) {
                  // Do not convert non-relations to references.
                  if(null == response || null == response._id) {
                    return response;
                  }
                  return {
                    _type: 'KinveyRef',
                    _collection: collection,
                    _id: response._id
                  };
                });

                // Update the original document and add the partial response.
                if(!isArrayRelation) {
                  reference = reference[0];
                  responses = responses[0];
                }
                nested(document, property, reference);
                documents[property] = responses;
              });
            });
            return Kinvey.Defer.all(promises);
          });
        });

        // All documents are saved. Replace the references in the document with the
        // actual relational document, starting with the top-level document.
        return promise.then(function() {
          var response = documents['']; // The top-level document.
          properties.reverse().forEach(function(relationalLevel) {
            relationalLevel.forEach(function(property) {
              nested(response, property, documents[property]);
            });
          });

          // Debug.
          if(KINVEY_DEBUG) {
            log('Saved the document with relations.', response);
          }

          // Restore the options and return the response.
          delete relations['']; // Remove the added top-level document.
          options.error = error;
          options.relations = relations;
          options.success = success;
          return response;
        }, function(reason) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Failed to save the document with relations.', error);
          }

          // Restore the options and return the error.
          delete relations['']; // Remove the added top-level document.
          options.error = error;
          options.relations = relations;
          options.success = success;
          return Kinvey.Defer.reject(reason);
        });
      }
    };

    // Persistence.
    // ------------

    // The library provides ways to store data in a variety of locations. By
    // default, all data will be stored in the remote backend. However, the
    // namespace below provides means to switch between the local (optionally
    // read-only) and remote backend. The interface of all backends must follow
    // CRUD for easy interoperability between backends.

    // Define a function to merge user-defined persistence options with state as
    // defined by `Kinvey.Sync`.
    var persistenceOptions = function(options) {
      var isEnabled = Kinvey.Sync.isEnabled();
      var isOnline = Kinvey.Sync.isOnline();
      options.fallback = isEnabled && isOnline && false !== options.fallback;
      options.offline = isEnabled && (!isOnline || options.offline);
      options.refresh = isEnabled && isOnline && false !== options.refresh;
      return options;
    };

    /**
     * @private
     * @memberof! <global>
     * @namespace Kinvey.Persistence
     */
    Kinvey.Persistence = /** @lends Kinvey.Persistence */ {
      /**
       * Performs a create operation.
       *
       * @param {Request} request The request.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      create: function(request, options) {
        // Add support for references.
        if(options.relations) {
          var collection = USERS === request.namespace ? USERS : request.collection;
          return KinveyReference.save(collection, request.data, options);
        }

        // Cast arguments.
        request.local = request.local || {};
        options = persistenceOptions(options);

        // If `options.offline`, use local.
        if(request.local.req && options.offline) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Using local persistence.');
          }

          return Kinvey.Persistence.Local.create(request, options).then(null, function(error) {
            // On rejection, if `options.fallback`, perform aggregation requests
            // against net.
            if(options.fallback && '_group' === request.id) {
              // Debug.
              if(KINVEY_DEBUG) {
                log('Local persistence failed. Use net persistence because of the fallback flag.');
              }

              options.offline = false; // Overwrite to avoid infinite recursion.
              return Kinvey.Persistence.create(request, options);
            }
            return Kinvey.Defer.reject(error);
          });
        }

        // Debug.
        if(KINVEY_DEBUG) {
          log('Using net persistence.');
        }

        // Use net. If `options.refresh`, persist the response locally.
        var promise = Kinvey.Persistence.Net.create(request, options);
        if(request.local.res && options.refresh) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Persisting the response locally.');
          }

          return promise.then(function(response) {
            // The request `data` is the response from the network.
            request.data = response;
            return Kinvey.Persistence.Local.create(request, options).then(function() {
              // Return the original response.
              return response;
            });
          });
        }
        return promise;
      },

      /**
       * Performs a read operation.
       *
       * @param {Request} request The request.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      read: function(request, options) {
        // Cast arguments.
        request.local = request.local || {};
        options = persistenceOptions(options);

        // If `options.offline`, use local.
        if(request.local.req && options.offline) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Using local persistence.');
          }

          return Kinvey.Persistence.Local.read(request, options).then(null, function(error) {
            // On rejection, if `options.fallback`, perform the request against
            // net.
            if(options.fallback) {
              // Debug.
              if(KINVEY_DEBUG) {
                log('Local persistence failed. Use net persistence because of the fallback flag.');
              }

              options.offline = false; // Overwrite to avoid infinite recursion.
              return Kinvey.Persistence.read(request, options);
            }
            return Kinvey.Defer.reject(error);
          });
        }

        // Debug.
        if(KINVEY_DEBUG) {
          log('Using net persistence.');
        }

        // Use net. If `options.refresh`, persist the response locally.
        var promise = Kinvey.Persistence.Net.read(request, options);
        if(request.local.res && options.refresh) {
          return promise.then(function(response) {
            // Debug.
            if(KINVEY_DEBUG) {
              log('Persisting the response locally.');
            }

            // Add support for references.
            var promise;
            if(options.relations) {
              var offline = options.offline;
              options.offline = true; // Force local persistence.
              options.track = false; // The documents are not subject to synchronization.
              var collection = USERS === request.namespace ? USERS : request.collection;
              promise = KinveyReference.save(collection, response, options).then(function() {
                // Restore the options.
                options.offline = offline;
                delete options.track;
              });
            }
            else { // Save at once.
              request.data = response; // The request data is the network response.
              promise = Kinvey.Persistence.Local.create(request, options);
            }

            // Return the original response.
            return promise.then(function() {
              return response;
            });
          }, function(error) {
            // If `ENTITY_NOT_FOUND`, persist the response locally by initiating a
            // delete request locally.
            if(Kinvey.Error.ENTITY_NOT_FOUND === error.name) {
              return Kinvey.Persistence.Local.destroy(request, options).then(function() {
                // Return the original response.
                return Kinvey.Defer.reject(error);
              });
            }
            return Kinvey.Defer.reject(error);
          });
        }
        return promise;
      },

      /**
       * Performs an update operation.
       *
       * @param {Request} request The request.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      update: function(request, options) {
        // Add support for references.
        if(options.relations) {
          var collection = USERS === request.namespace ? USERS : request.collection;
          return KinveyReference.save(collection, request.data, options);
        }

        // Cast arguments.
        request.local = request.local || {};
        options = persistenceOptions(options);

        // If `options.offline`, use local.
        if(request.local.req && options.offline) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Using local persistence.');
          }

          return Kinvey.Persistence.Local.update(request, options);
        }

        // Debug.
        if(KINVEY_DEBUG) {
          log('Using net persistence..');
        }

        // Use net. If `options.refresh`, persist the response locally.
        var promise = Kinvey.Persistence.Net.update(request, options);
        if(request.local.res && options.refresh) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Persisting the response locally.');
          }

          return promise.then(function(response) {
            // The request `data` is the response from the network.
            request.data = response;
            return Kinvey.Persistence.Local.update(request, options).then(function() {
              // Return the original response.
              return response;
            });
          });
        }
        return promise;
      },

      /**
       * Performs a delete operation.
       *
       * @param {Request} request The request.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      destroy: function(request, options) {
        // Cast arguments.
        request.local = request.local || {};
        options = persistenceOptions(options);

        // If `options.offline`, use local.
        if(request.local.req && options.offline) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Using local persistence.');
          }

          return Kinvey.Persistence.Local.destroy(request, options);
        }

        // Debug.
        if(KINVEY_DEBUG) {
          log('Using net persistence.');
        }

        // Use net. If `options.refresh`, persist the response locally.
        var promise = Kinvey.Persistence.Net.destroy(request, options);
        if(request.local.res && options.refresh) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Persisting the response locally.');
          }

          return promise.then(function(response) {
            // Initiate the same request against local.
            return Kinvey.Persistence.Local.destroy(request, options).then(function() {
              // Return the original response.
              return response;
            }, function(error) {
              // If `ENTITY_NOT_FOUND`, the local database was already up-to-date.
              if(Kinvey.Error.ENTITY_NOT_FOUND === error.name) {
                // Return the original response.
                return response;
              }
              return Kinvey.Defer.reject(error);
            });
          });
        }
        return promise;
      }
    };

    // Define the Request type for documentation purposes.

    /**
     * @private
     * @typedef {Object} Request
     * @property {string}       namespace    Namespace.
     * @property {string}       [collection] The collection.
     * @property {string}       [id]         The id.
     * @property {Kinvey.Query} [query]      Query.
     * @property {Object}       [flags]      Flags.
     * @property {*}            [data]       Data.
     * @property {function}     auth         Authentication.
     * @property {Object}       [local]      Cacheability of the request.
     * @property {boolean}      [local.req]  The request is executable locally.
     * @property {boolean}      [local.res]  The response is persistable locally.
     */

    // Database.
    // ---------

    // To enable local persistence, application data must be physically stored on
    // the device. The `Database` namespace exposes the API to do just that.

    /**
     * @private
     * @namespace Database
     */
    var Database = /** @lends Database */ {
      /**
       * Saves multiple (new) documents.
       *
       * @abstract
       * @method
       * @param {string} collection The collection.
       * @param {Object[]} documents List of documents.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      batch: methodNotImplemented('Database.batch'),

      /**
       * Deletes all documents matching the provided query.
       * NOTE This method is not transaction-safe.
       *
       * @abstract
       * @method
       * @param {string} collection The collection.
       * @param {Kinvey.Query} [query] The query.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      clean: methodNotImplemented('Database.clean'),

      /**
       * Counts the number of documents matching the provided query.
       *
       * @abstract
       * @method
       * @param {string} collection The collection.
       * @param {Kinvey.Query} [query] The query.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      count: methodNotImplemented('Database.count'),

      /**
       * Deletes a document.
       *
       * @abstract
       * @method
       * @param {string} collection The collection.
       * @param {string} id The document id.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      destroy: methodNotImplemented('Database.destroy'),

      /**
       * Deletes the entire database.
       *
       * @abstract
       * @method
       * @returns {Promise} The response.
       */
      destruct: methodNotImplemented('Database.destruct'),

      /**
       * Retrieves all documents matching the provided query.
       *
       * @abstract
       * @method
       * @param {string} collection The collection.
       * @param {Kinvey.Query} [query] The query.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      find: methodNotImplemented('Database.find'),

      /**
       * Retrieves a document, and updates it within the same transaction.
       * NOTE This method must be transaction-safe.
       *
       * @abstract
       * @method
       * @param {string} collection The collection.
       * @param {Kinvey.Query} [query] The query.
       * @param {function} fn The update function.
       * @returns {Promise} The response.
       */
      findAndModify: methodNotImplemented('Database.findAndModify'),

      /**
       * Retrieves a document.
       *
       * @abstract
       * @method
       * @param {string} collection The collection.
       * @param {string} id The document id.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      get: methodNotImplemented('Database.get'),

      /**
       * Performs an aggregation.
       *
       * @abstract
       * @method
       * @param {string} collection The collection.
       * @param {Object} aggregation The aggregation object-literal.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      group: methodNotImplemented('Database.group'),

      /**
       * Saves a (new) document.
       *
       * @abstract
       * @method
       * @param {string} collection The collection.
       * @param {Object} document The document.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      save: methodNotImplemented('Database.save'),

      /**
       * Updates a document.
       *
       * @abstract
       * @method
       * @param {string} collection The collection.
       * @param {Object} document The document.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      update: methodNotImplemented('Database.update'),

      /**
       * Sets the implementation of `Database` to the specified adapter.
       *
       * @method
       * @param {Object} adapter Object implementing the `Database` interface.
       */
      use: use([
        'batch', 'clean', 'count', 'destroy', 'destruct', 'find', 'findAndModify',
        'get', 'group', 'save', 'update'
      ])
    };

    // Local persistence.
    // ------------------

    // The local persistence namespace translates persistence requests into calls
    // to persist data locally. The local persistence is accessible through the
    // `Database` namespace.

    /**
     * @private
     * @memberof! <global>
     * @namespace Kinvey.Persistence.Local
     */
    Kinvey.Persistence.Local = /** @lends Kinvey.Persistence.Local */ {
      /**
       * Initiates a create request.
       *
       * @param {Request} request The request.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      create: function(request, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Initiating a create request.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Normalize “collections” of the user namespace.
        var collection = USERS === request.namespace ? USERS : request.collection;

        // The create request can be an aggregation, or (batch) save of documents.
        // The latter two change application data, and are therefore subject to
        // synchronization.
        if('_group' === request.id) { // Aggregation.
          return Database.group(collection, request.data, options);
        }

        // (Batch) save.
        var method = isArray(request.data) ? 'batch' : 'save';
        var promise = Database[method](collection, request.data, options);
        return promise.then(function(response) {
          // If `options.offline`, the request is subject to synchronization.
          if(options.offline && false !== options.track) {
            // Debug.
            if(KINVEY_DEBUG) {
              log('Notifying the synchronization functionality.', collection, response);
            }

            return Sync.notify(collection, response, options).then(function() {
              // Return the original response.
              return response;
            });
          }
          return response;
        });
      },

      /**
       * Initiates a create request.
       *
       * @param {Request} request The request.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      read: function(request, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Initiating a read request.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Normalize “collections” of the user namespace.
        var collection = USERS === request.namespace ? USERS : request.collection;

        // The read request can be a count, me, query, or simple get. Neither
        // change any application data, and therefore none are subject to
        // synchronization.
        if('_count' === request.id) { // Count.
          return Database.count(collection, request.query, options);
        }
        if('_me' === request.collection) { // Me.
          // If there is an active user, attempt to retrieve its details.
          var user = Kinvey.getActiveUser();
          if(null !== user) {
            return Database.get(collection, user._id, options).then(null, function(error) {
              // If `ENTITY_NOT_FOUND`, return all we know about the active user.
              if(error.name === Kinvey.Error.ENTITY_NOT_FOUND) {
                return user;
              }
              return Kinvey.Defer.reject(error);
            });
          }
          var error = clientError(Kinvey.Error.NO_ACTIVE_USER);
          return Kinvey.Defer.reject(error);
        }

        // Query the collection, or retrieve a single document.
        var promise;
        if(null == request.id) { // Query.
          promise = Database.find(collection, request.query, options);
        }
        else { // Single document.
          promise = Database.get(collection, request.id, options);
        }
        return promise.then(function(response) {
          // Add support for references.
          if(options.relations) {
            return KinveyReference.get(response, options);
          }
          return response;
        });
      },

      /**
       * Initiates a create request.
       *
       * @param {Request} request The request.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      update: function(request, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Initiating an update request.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Normalize “collections” of the user namespace.
        var collection = USERS === request.namespace ? USERS : request.collection;

        // All update operations change application data, and are therefore subject
        // to synchronization.
        var promise = Database.update(collection, request.data, options);
        return promise.then(function(response) {
          // If `options.offline`, the response is subject to synchronization.
          if(options.offline && false !== options.track) {
            // Debug.
            if(KINVEY_DEBUG) {
              log('Notifying the synchronization functionality.', collection, response);
            }

            return Sync.notify(collection, response, options).then(function() {
              // Return the original response.
              return response;
            });
          }
          return response;
        });
      },

      /**
       * Initiates a create request.
       *
       * @param {Request} request The request.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      destroy: function(request, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Initiating a delete request.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Normalize “collections” of the user namespace.
        var collection = USERS === request.namespace ? USERS : request.collection;

        // The delete request can be a clean or destroy of documents. Both change
        // application data, and are therefore subject to synchronization.
        var promise;
        if(null == request.id) { // Clean documents.
          promise = Database.clean(collection, request.query, options);
        }
        else { // Destroy a single document.
          promise = Database.destroy(collection, request.id, options);
        }
        return promise.then(function(response) {
          // If `options.offline`, the request is subject to synchronization.
          if(options.offline && false !== options.track) {
            // Debug.
            if(KINVEY_DEBUG) {
              log('Notifying the synchronization functionality.', collection, response);
            }

            return Sync.notify(collection, response.documents, options).then(function() {
              // Return the original response.
              return response;
            });
          }
          return response;
        });
      }
    };

    // Network persistence.
    // --------------------

    // The cached return value of `deviceInformation` function.
    var deviceInformationHeader = null;

    // The actual execution of a network request must be defined by an adapter.

    /**
     * @private
     * @memberof! <global>
     * @namespace Kinvey.Persistence.Net
     */
    Kinvey.Persistence.Net = /** @lends Kinvey.Persistence.Net */ {
      /**
       * Initiates a create request.
       *
       * @param {Request} request The request.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      create: function(request, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Initiating a create request.', arguments);
        }

        // Initiate the network request.
        request.method = 'POST';
        return Kinvey.Persistence.Net._request(request, options);
      },

      /**
       * Initiates a read request.
       *
       * @param {Request} request The request.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      read: function(request, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Initiating a read request.', arguments);
        }

        // Cast arguments.
        request.flags = request.flags || {};
        options = options || {};

        // Add support for file references.
        if(null != request.collection) {
          if(false !== options.fileTls) {
            request.flags.kinveyfile_tls = true;
          }
          if(options.fileTtl) {
            request.flags.kinveyfile_ttl = options.fileTtl;
          }
        }

        // Add support for references.
        if(options.relations) {
          // Resolve all relations not explicitly excluded.
          options.exclude = options.exclude || [];
          var resolve = Object.keys(options.relations).filter(function(member) {
            return -1 === options.exclude.indexOf(member);
          });

          if(0 !== resolve.length) {
            request.flags.retainReferences = false;
            request.flags.resolve = resolve.join(',');
          }
        }

        // Initiate the network request.
        request.method = 'GET';
        return Kinvey.Persistence.Net._request(request, options);
      },

      /**
       * Initiates an update request.
       *
       * @param {Request} request The request.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      update: function(request, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Initiating an update request.', arguments);
        }

        // Initiate the network request.
        request.method = 'PUT';
        return Kinvey.Persistence.Net._request(request, options);
      },

      /**
       * Initiates a delete request.
       *
       * @param {Request} request The request.
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      destroy: function(request, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Initiating a delete request.', arguments);
        }

        // Initiate the network request.
        request.method = 'DELETE';
        return Kinvey.Persistence.Net._request(request, options);
      },

      /**
       * Initiates a network request to the Kinvey service.
       *
       * @private
       * @param {Request} request The request.
       * @param {string} request.method The request method.
       * @param {Options} options Options.
       * @throws {Kinvey.Error} * `request` must contain: `method`.
       *                         * `request` must contain: `namespace`.
       *                         * `request` must contain: `auth`.
       * @returns {Promise}
       */
      _request: function(request, options) {
        // Validate arguments.
        if(null == request.method) {
          throw new Kinvey.Error('request argument must contain: method.');
        }
        if(null == request.namespace) {
          throw new Kinvey.Error('request argument must contain: namespace.');
        }
        if(null == request.auth) {
          throw new Kinvey.Error('request argument must contain: auth.');
        }

        // Validate preconditions.
        var error;
        if(null == Kinvey.appKey && Auth.None !== request.auth) {
          error = clientError(Kinvey.Error.MISSING_APP_CREDENTIALS);
          return Kinvey.Defer.reject(error);
        }
        if(null == Kinvey.masterSecret && options.skipBL) {
          error = clientError(Kinvey.Error.MISSING_MASTER_CREDENTIALS);
          return Kinvey.Defer.reject(error);
        }

        // Cast arguments.
        options.trace = options.trace || (KINVEY_DEBUG && false !== options.trace);

        // Build, escape, and join URL segments.
        // Format: <API_ENDPOINT>/<namespace>[/<Kinvey.appKey>][/<collection>][/<id>]
        var segments = [request.namespace, Kinvey.appKey, request.collection, request.id];
        segments = segments.filter(function(value) {
          // Exclude empty optional segment. Note the required namespace cannot be
          // empty at this point (enforced above).
          return null != value;
        }).map(Kinvey.Persistence.Net.encode);
        var url = [Kinvey.API_ENDPOINT].concat(segments).join('/') + '/';

        // Build query string.
        var flags = request.flags || {};
        if(request.query) { // Add query fragments.
          var query = request.query.toJSON();
          flags.query = query.filter;
          if(null !== query.limit) {
            flags.limit = query.limit;
          }
          if(0 !== query.skip) {
            flags.skip = query.skip;
          }
          if(!isEmpty(query.sort)) {
            flags.sort = query.sort;
          }
        }

        // Unless `options.nocache` is false, add a cache busting query string.
        // This is useful for Android < 4.0 which caches all requests aggressively.
        if(false !== options.nocache) {
          flags._ = Math.random().toString(36).substr(2);
        }

        // Format fragments.
        var params = [];
        for(var key in flags) {
          if(flags.hasOwnProperty(key)) {
            var value = isString(flags[key]) ? flags[key] : JSON.stringify(flags[key]);
            params.push(
              Kinvey.Persistence.Net.encode(key) + '=' + Kinvey.Persistence.Net.encode(value)
            );
          }
        }

        // Append query string if there are `params`.
        if(0 < params.length) {
          url += '?' + params.join('&');
        }

        // Evaluate the device information header.
        if(null === deviceInformationHeader) {
          deviceInformationHeader = deviceInformation();
        }

        // Set headers.
        var headers = {
          Accept: 'application/json',
          'X-Kinvey-API-Version': Kinvey.API_VERSION,
          'X-Kinvey-Device-Information': deviceInformationHeader
        };

        // Append optional headers.
        if(null != request.data) {
          headers['Content-Type'] = 'application/json; charset=utf-8';
        }
        if(options.contentType) {
          headers['X-Kinvey-Content-Type'] = options.contentType;
        }
        if(options.skipBL) {
          headers['X-Kinvey-Skip-Business-Logic'] = 'true';
        }
        if(options.trace) {
          headers['X-Kinvey-Include-Headers-In-Response'] = 'X-Kinvey-Request-Id';
          headers['X-Kinvey-ResponseWrapper'] = 'true';
        }

        // Debug.
        if(KINVEY_DEBUG) {
          headers['X-Kinvey-Trace-Request'] = 'true';
          headers['X-Kinvey-Force-Debug-Log-Credentials'] = 'true';
        }

        // Authorization.
        var promise = request.auth().then(function(auth) {
          if(null !== auth) {
            // Format credentials.
            var credentials = auth.credentials;
            if(null != auth.username) {
              credentials = Kinvey.Persistence.Net.base64(auth.username + ':' + auth.password);
            }

            // Append header.
            headers.Authorization = auth.scheme + ' ' + credentials;
          }
        });

        // Invoke the network layer.
        return promise.then(function() {
          var response = Kinvey.Persistence.Net.request(
            request.method,
            url,
            request.data,
            headers,
            options
          ).then(function(response) {
            // Parse the response.
            response = JSON.parse(response);

            // Debug.
            if(KINVEY_DEBUG && options.trace && isObject(response)) {
              log('Obtained the request ID.', response.headers['X-Kinvey-Request-Id']);
            }

            return options.trace && isObject(response) ? response.result : response;
          }, function(response) {
            // Parse the response.
            var requestId = null;
            try {
              response = JSON.parse(response);

              // If `options.trace`, extract result and headers from the response.
              if(options.trace) {
                requestId = response.headers['X-Kinvey-Request-Id'];
                response = response.result;
              }
            }
            catch(e) {}

            // Format the response as client-side error object.
            if(null != response && null != response.error) { // Server-side error.
              response = {
                name: response.error,
                description: response.description || '',
                debug: response.debug || ''
              };

              // If `options.trace`, add the `requestId`.
              if(options.trace) {
                response.requestId = requestId;

                // Debug.
                if(KINVEY_DEBUG) {
                  log('Obtained the request ID.', requestId);
                }
              }
            }
            else { // Client-side error.
              var dict = { // Dictionary for common errors.
                abort: Kinvey.Error.REQUEST_ABORT_ERROR,
                error: Kinvey.Error.REQUEST_ERROR,
                timeout: Kinvey.Error.REQUEST_TIMEOUT_ERROR
              };
              response = clientError(dict[response] || dict.error, {
                debug: response
              });
            }

            // Reject.
            return Kinvey.Defer.reject(response);
          });

          // Add a descriptive message to `InvalidCredentials` error so the user
          // knows what’s going on.
          return response.then(null, function(error) {
            if(Kinvey.Error.INVALID_CREDENTIALS === error.name) {
              error.debug += ' It is possible the tokens used to execute the ' +
                'request are expired. In that case, please run ' +
                '`Kinvey.User.logout({ force: true })`, and then log back in ' +
                ' using`Kinvey.User.login(username, password)` to solve this issue.';
            }
            return Kinvey.Defer.reject(error);
          });
        });
      },

      /**
       * Base64-encodes a value.
       *
       * @abstract
       * @method
       * @param {string} value Value.
       * @returns {string} Base64-encoded value.
       */
      base64: methodNotImplemented('Kinvey.Persistence.Net.base64'),

      /**
       * Encodes a value for use in the URL.
       *
       * @abstract
       * @method
       * @param {string} value Value.
       * @returns {string} Encoded value.
       */
      encode: methodNotImplemented('Kinvey.Persistence.Net.encode'),

      /**
       * Initiates a network request.
       *
       * @abstract
       * @method
       * @param {string}  method    Method.
       * @param {string}  url       URL.
       * @param {?Object} [body]    Body.
       * @param {Object}  [headers] Headers.
       * @param {Options} [options] Options.
       * @returns {Promise} The promise.
       */
      request: methodNotImplemented('Kinvey.Persistence.Net.request'),

      /**
       * Sets the implementation of `Kinvey.Persistence.Net` to the specified
       * adapter.
       *
       * @method
       * @param {Object} adapter Object implementing the `Kinvey.Persistence.Net`
       *          interface.
       */
      use: use(['base64', 'encode', 'request'])
    };

    // Synchronization.
    // ----------------

    // Synchronization consists of two major namespaces: `Sync` and `Kinvey.Sync`.
    // The former contains the synchronization code, as well as multiple properties
    // used to maintain the application state throughout its lifetime. The
    // `Kinvey.Sync` namespace exposes a number of methods to the outside world.
    // Most of these methods delegate back to `Sync`. Therefore, `Kinvey.Sync`
    // provides the public interface for synchronization.

    /**
     * @private
     * @namespace Sync
     */
    var Sync = /** @lends Sync */ {
      /**
       * Flag whether local persistence is enabled.
       *
       * @type {boolean}
       */
      enabled: false,

      /**
       * Flag whether the application resides in an online state.
       *
       * @type {boolean}
       */
      online: true,

      /**
       * The identifier where the synchronization metadata is stored.
       *
       * @type {string}
       */
      system: 'system.sync',

      /**
       * Counts the number of documents pending synchronization. If `collection` is
       * provided, it returns the count of that collection only.
       *
       * @param {string} [collection] The collection.
       * @param {Options} [options] Options.
       * @returns {Promise} The response.
       */
      count: function(collection, options) {
        // Cast arguments.
        options = options || {};

        // If a collection was provided, count that collection only.
        if(null != collection) {
          return Database.get(Sync.system, collection, options).then(function(response) {
            // Return the count.
            return response.size;
          }, function(error) {
            // If `ENTITY_NOT_FOUND`, there are no documents pending
            // synchronization.
            if(Kinvey.Error.ENTITY_NOT_FOUND === error.name) {
              return 0;
            }
            return Kinvey.Defer.reject(error);
          });
        }

        // Aggregate the count of all collections.
        var agg = Kinvey.Group.sum('size').toJSON();
        return Database.group(Sync.system, agg, options).then(function(response) {
          // Return the aggregation result, or 0 if the aggregation was empty.
          return response[0] ? response[0].result : 0;
        });
      },

      /**
       * Initiates a synchronization operation.
       *
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      execute: function(options) {
        // Obtain all the collections that need to be synchronized.
        var query = new Kinvey.Query().greaterThan('size', 0);
        return Database.find(Sync.system, query, options).then(function(response) {
          // Synchronize all the collections in parallel.
          var promises = response.map(function(collection) {
            return Sync._collection(collection._id, collection.documents, options);
          });
          return Kinvey.Defer.all(promises);
        });
      },

      /**
       * Handler to flag the provided `documents` for synchronization.
       *
       * @param {string} collection The collection.
       * @param {Array|Object} documents The document, or list of documents.
       * @param {Options} [options] Options.
       * @returns {Promise} The promise.
       */
      notify: function(collection, documents, options) {
        // Update the metadata for the provided collection in a single transaction.
        return Database.findAndModify(Sync.system, collection, function(metadata) {
          // Cast arguments.
          documents = isArray(documents) ? documents : [documents];
          metadata = metadata || {
            _id: collection,
            documents: {},
            size: 0
          };

          // Add each document to the metadata ( id => timestamp ).
          documents.forEach(function(document) {
            if(!metadata.documents.hasOwnProperty(document._id)) {
              metadata.size += 1;
            }
            var timestamp = null != document._kmd ? document._kmd.lmt : null;
            metadata.documents[document._id] = timestamp;
          });

          // Return the new metadata.
          return metadata;
        }, options).then(function() {
          // Return an empty response.
          return null;
        });
      },

      /**
       * Synchronizes the provided collection.
       *
       * @private
       * @param {string} collection The collection.
       * @param {Object} documents Object of documents ( id => timestamp ).
       * @param {Options} [options] Options.
       * @returns {Promise} The response.
       */
      _collection: function(collection, documents, options) {
        // Prepare the response.
        var result = {
          collection: collection,
          success: [],
          error: []
        };

        // Obtain the actual documents from local and net.
        var identifiers = Object.keys(documents);
        var request = {
          namespace: USERS === collection ? USERS : DATA_STORE,
          collection: USERS === collection ? null : collection,
          query: new Kinvey.Query().contains('_id', identifiers),
          auth: Auth.Default
        };

        // Step 1: obtain the documents from local and net.
        var promises = [
          Kinvey.Persistence.Local.read(request, options),
          Kinvey.Persistence.Net.read(request, options)
        ];
        return Kinvey.Defer.all(promises).then(function(responses) {
          // `responses` is a list of documents. Re-format as object
          // ( id => document ).
          var response = {
            local: {},
            net: {}
          };
          responses[0].forEach(function(document) {
            response.local[document._id] = document;
          });
          responses[1].forEach(function(document) {
            response.net[document._id] = document;
          });
          return response;
        }).then(function(response) {
          // Step 2: categorize the documents in the collection.
          var promises = identifiers.map(function(id) {
            return Sync._document(
              collection, {
                id: id,
                timestamp: documents[id]
              }, // The document metadata.
              response.local[id] || null, // The local document.
              response.net[id] || null, // The net document.
              options
            ).then(null, function(response) {
              // Rejection occurs when a conflict could not be resolved. Append the
              // id to the errors, and resolve.
              result.error.push(response.id);
              return null;
            });
          });
          return Kinvey.Defer.all(promises);
        }).then(function(responses) {
          // Step 3: commit the documents in the collection.
          var created = responses.filter(function(response) {
            return null != response && null !== response.document;
          });
          var destroyed = responses.filter(function(response) {
            return null != response && null === response.document;
          });

          // Save and destroy all documents in parallel.
          var promises = [
            Sync._save(collection, created, options),
            Sync._destroy(collection, destroyed, options)
          ];
          return Kinvey.Defer.all(promises);
        }).then(function(responses) {
          // Merge the response.
          result.success = result.success.concat(responses[0].success, responses[1].success);
          result.error = result.error.concat(responses[0].error, responses[1].error);

          // Step 4: update the metadata.
          return Database.findAndModify(Sync.system, collection, function(metadata) {
            // Remove each document from the metadata.
            result.success.forEach(function(id) {
              if(metadata.documents.hasOwnProperty(id)) {
                metadata.size -= 1;
                delete metadata.documents[id];
              }
            });

            // Return the new metadata.
            return metadata;
          }, options);
        }).then(function() {
          // Step 5: return the synchronization result.
          return result;
        });
      },

      /**
       * Deletes the provided documents using both local and network persistence.
       *
       * @private
       * @param {string} collection The collection.
       * @param {Array} documents List of documents.
       * @param {Options} [options] Options.
       * @returns {Array} List of document ids.
       */
      _destroy: function(collection, documents, options) {
        // Cast arguments.
        documents = documents.map(function(composite) {
          return composite.id;
        });

        // If there are no documents to delete, resolve immediately.
        if(0 === documents.length) {
          return Kinvey.Defer.resolve({
            success: [],
            error: []
          });
        }

        // Build the request.
        var request = {
          namespace: USERS === collection ? USERS : DATA_STORE,
          collection: USERS === collection ? null : collection,
          query: new Kinvey.Query().contains('_id', documents),
          auth: Auth.Default
        };

        // Delete from local and net in parallel. Deletion is an atomic action,
        // therefore the documents will either all be part of `success` or `error`.
        var promises = [
          Kinvey.Persistence.Local.destroy(request, options),
          Kinvey.Persistence.Net.destroy(request, options)
        ];
        return Kinvey.Defer.all(promises).then(function() {
          return {
            success: documents,
            error: []
          };
        }, function() {
          return {
            success: [],
            error: documents
          };
        });
      },

      /**
       * Compares the local and net versions of the provided document. Fulfills
       * with the winning document, or rejects if no winner can be picked.
       *
       * @private
       * @param {string} collection The collection.
       * @param {Object} metadata The document metadata.
       * @param {?Object} local The local document.
       * @param {?Object} net The net document.
       * @param {Options} [options] Options.
       * @returns {Promise} The response.
       */
      _document: function(collection, metadata, local, net, options) {
        // Resolve if the remote copy does not exist or if both timestamps match.
        // Reject otherwise.
        if(null === net || (null != net._kmd && metadata.timestamp === net._kmd.lmt)) {
          return Kinvey.Defer.resolve({
            id: metadata.id,
            document: local
          });
        }

        // A conflict was detected. Attempt to resolve it by invoking the conflict
        // handler.
        if(null != options.conflict) {
          // The conflict handler should return a promise which either resolves
          // with the winning document, or gets rejected.
          return options.conflict(collection, local, net).then(function(document) {
            return {
              id: metadata.id,
              document: document
            };
          }, function() {
            return Kinvey.Defer.reject({
              id: metadata.id,
              document: [local, net]
            });
          });
        }
        return Kinvey.Defer.reject({
          id: metadata.id,
          document: [local, net]
        });
      },

      /**
       * Saves the provided documents using both local and network persistence.
       *
       * @private
       * @param {string} collection The collection.
       * @param {Array} documents List of documents.
       * @param {Options} [options] Options.
       * @returns {Array} List of document ids.
       */
      _save: function(collection, documents, options) {
        // Cast arguments.
        documents = documents.map(function(composite) {
          return composite.document;
        });

        // Save documents on net.
        var error = []; // Track errors of individual update operations.
        var promises = documents.map(function(document) {
          return Kinvey.Persistence.Net.update({
            namespace: USERS === collection ? USERS : DATA_STORE,
            collection: USERS === collection ? null : collection,
            id: document._id,
            data: document,
            auth: Auth.Default
          }, options).then(null, function() {
            // Rejection should not break the entire synchronization. Instead,
            // append the document id to `error`, and resolve.
            error.push(document._id);
            return null;
          });
        });
        return Kinvey.Defer.all(promises).then(function(responses) {
          // `responses` is an `Array` of documents. Batch save all documents.
          return Kinvey.Persistence.Local.create({
            namespace: USERS === collection ? USERS : DATA_STORE,
            collection: USERS === collection ? null : collection,
            data: responses,
            auth: Auth.Default
          }, options);
        }).then(function(response) {
          // Build the final response.
          return {
            success: response.map(function(document) {
              return document._id;
            }),
            error: error
          };
        }, function() {
          // Build the final response.
          return {
            success: [],
            error: documents.map(function(document) {
              return document._id;
            })
          };
        });
      }
    };

    // Expose public methods of `Sync` as the `Kinvey.Sync` namespace.

    /**
     * @memberof! <global>
     * @namespace Kinvey.Sync
     */
    Kinvey.Sync = /** @lends Kinvey.Sync */ {
      /**
       * Counts the number of documents pending synchronization. If `collection` is
       * provided, it returns the count of that collection only.
       *
       * @param {string} [collection] The collection.
       * @param {Options} [options] Options.
       * @returns {Promise} The response.
       */
      count: function(collection, options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Counting the number of documents pending synchronization.', arguments);
        }

        // Validate preconditions.
        if(!Kinvey.Sync.isOnline()) {
          var error = clientError(Kinvey.Error.SYNC_ERROR, {
            debug: 'Sync is not enabled, or the application resides in offline mode.'
          });
          return Kinvey.Defer.reject(error);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Sync.count(collection, options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Counted the number of documents pending synchronization.', response);
          }, function(error) {
            log('Failed to count the number of documents pending synchronization.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Deletes the local database, and will reset any synchronization
       * housekeeping.
       *
       * @param {Options} options Options.
       * @returns {Promise} The response.
       */
      destruct: function(options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Deleting the local database.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Prepare the response.
        var promise = Database.destruct(options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Deleted the local database.', response);
          }, function(error) {
            log('Failed to delete the local database.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Initiates a synchronization operation.
       *
       * @param {Options}  [options]          Options.
       * @param {function} [options.conflict] The conflict handler.
       * @param {Object}   [options.user]     Login with these credentials prior
       *          to initiating the synchronization operation.
       * @returns {Promise} The response.
       */
      execute: function(options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Synchronizing the application.', arguments);
        }

        // Validate preconditions.
        if(!Kinvey.Sync.isOnline()) {
          var error = clientError(Kinvey.Error.SYNC_ERROR, {
            debug: 'Sync is not enabled, or the application resides in offline mode.'
          });
          return Kinvey.Defer.reject(error);
        }

        // Cast arguments.
        options = options || {};

        // Attempt to login with the user context prior to synchronizing.
        var promise;
        if(null != options.user) {
          // Debug.
          if(KINVEY_DEBUG) {
            log('Attempting to login with a user context.', options.user);
          }

          // Prepare the response.
          promise = Kinvey.User.login(options.user).then(function() {
            // The user is now logged in. Re-start the synchronization operation.
            delete options.user; // We don’t need this anymore.
            return Kinvey.Sync.execute(options);
          });

          // Debug.
          if(KINVEY_DEBUG) {
            promise.then(null, function(error) {
              log('Failed to login with the user context.', error);
            });
          }

          // Return the response.
          promise.then(null, options.error);
          return promise;
        }

        // Prepare the response.
        promise = Sync.execute(options);

        // Debug.
        if(KINVEY_DEBUG) {
          promise.then(function(response) {
            log('Synchonized the application.', response);
          }, function(error) {
            log('Failed to synchronize the application.', error);
          });
        }

        // Return the response.
        return wrapCallbacks(promise, options);
      },

      /**
       * Initializes the synchronization namespace.
       *
       * @param {Object}  [options]              Options.
       * @param {boolean} [options.enable=false] Enable local persistence.
       * @param {boolean} [options.online]       The initial application state.
       * @returns {Promise} The promise.
       */
      init: function(options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Initializing the synchronization functionality.', arguments);
        }

        // Cast arguments.
        options = options || {};

        // Save applicable options.
        Sync.enabled = null != options ? options.enable : false;
        Sync.online = 'undefined' !== typeof options.online ? options.online : Sync.online;

        // Resolve immediately.
        return Kinvey.Defer.resolve(null);
      },

      /**
       * Returns whether local persistence is active.
       *
       * @returns {boolean} The enable status.
       */
      isEnabled: function() {
        return Sync.enabled;
      },

      /**
       * Returns whether the application resides in an online state.
       *
       * @returns {boolean} The online status.
       */
      isOnline: function() {
        return Sync.online;
      },

      /**
       * Switches the application state to offline.
       *
       * @returns {Promise} The promise.
       */
      offline: function() {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Switching the application state to offline.');
        }

        // Validate preconditions.
        if(!Kinvey.Sync.isEnabled()) {
          var error = clientError(Kinvey.Error.SYNC_ERROR, {
            debug: 'Sync is not enabled.'
          });
          return Kinvey.Defer.reject(error);
        }

        // Flip flag.
        Sync.online = false;

        // Resolve immediately.
        return Kinvey.Defer.resolve(null);
      },

      /**
       * Switches the application state to online.
       *
       * @param {Options} [options]           Options.
       * @param {boolean} [options.sync=true] Initiate a synchronization operation
       *          on mode change.
       * @returns {Promise} The response.
       */
      online: function(options) {
        // Debug.
        if(KINVEY_DEBUG) {
          log('Switching the application state to online.', arguments);
        }

        // Validate preconditions.
        if(!Kinvey.Sync.isEnabled()) {
          var error = clientError(Kinvey.Error.SYNC_ERROR, {
            debug: 'Sync is not enabled.'
          });
          return Kinvey.Defer.reject(error);
        }

        // Cast arguments.
        options = options || {};

        // Flip flag.
        var previous = Sync.online;
        Sync.online = true;

        // Initiate a synchronization operation if the mode changed.
        if(false !== options.sync && previous !== Sync.online) {
          return Kinvey.Sync.execute(options);
        }
        return Kinvey.Defer.resolve(null);
      },

      /**
       * Prefers the local document over the net document.
       *
       * @param {string} collection The collection.
       * @param {?Object} local The local document.
       * @param {?Object} net The net document.
       * @returns {Promise} The winning document.
       */
      clientAlwaysWins: function(collection, local) {
        return Kinvey.Defer.resolve(local);
      },

      /**
       * Prefers the net document over the local document.
       *
       * @param {string} collection The collection.
       * @param {?Object} local The local document.
       * @param {?Object} net The net document.
       * @returns {Promise} The winning document.
       */
      serverAlwaysWins: function(collection, local, net) {
        return Kinvey.Defer.resolve(net);
      }
    };

    // Use promiscuous as `Kinvey.Defer` adapter.
    var promiscuous = require('promiscuous');
    Kinvey.Defer.use(promiscuous);

    // `Kinvey.Persistence.Net` adapter for [Node.js](http://nodejs.org/).
    var NodeHttp = {
      /**
       * The Node.js url module.
       *
       * @type {Object}
       */
      url: require('url'),

      /**
       * @augments {Kinvey.Persistence.net.base64}
       */
      base64: function(value) {
        return new Buffer(value, 'utf-8').toString('base64');
      },

      /**
       * @augments {Kinvey.Persistence.Net.encode}
       */
      encode: encodeURIComponent,

      /**
       * @augments {Kinvey.Persistence.Net.request}
       */
      request: function(method, url, body, headers, options) {
        // Cast arguments.
        body = body || null;
        headers = headers || {};
        options = options || {};

        // Prepare the response.
        var deferred = Kinvey.Defer.deferred();

        // Append the required Content-Length header.
        var length = 0;
        if(body instanceof Buffer) {
          length = body.length;
        }
        else if(null != body) {
          body = JSON.stringify(body); // Convert to string.
          length = Buffer.byteLength(body);
        }
        headers['Content-Length'] = length;

        // Create the request.
        var path = NodeHttp.url.parse(url);
        var adapter = require('https:' === path.protocol ? 'https' : 'http');
        var request = adapter.request({
          host: path.hostname,
          path: path.pathname + (path.search ? path.search : ''),
          port: path.port,
          method: method,
          headers: headers
        }, function(response) {
          // Listen for data.
          var data = [];
          response.on('data', function(chunk) {
            data.push(new Buffer(chunk));
          });

          // Listen for request completion.
          response.on('end', function() {
            // Debug.
            if(KINVEY_DEBUG) {
              log('The network request completed.', response);
            }

            // Parse response.
            var responseData = Buffer.concat(data);

            // Success implicates 2xx (Successful), or 304 (Not Modified).
            var status = response.statusCode;
            if(2 === parseInt(status / 100, 10) || 304 === status) {
              // Unless `options.file`, convert the response to a string.
              if(!options.file) {
                responseData = responseData.toString() || null;
              }
              deferred.resolve(responseData);
            }
            else { // Failure.
              deferred.reject(responseData.toString() || null);
            }
          });
        });

        // Apply timeout.
        var timedOut = false;
        if(0 < options.timeout) {
          request.on('socket', function(socket) {
            socket.setTimeout(options.timeout);
            socket.on('timeout', function() {
              timedOut = true;
              request.abort();
            });
          });
        }

        // Listen for request errors.
        request.on('error', function(msg) { // Client-side error.
          // Debug.
          if(KINVEY_DEBUG) {
            log('The network request failed.', msg);
          }

          // Reject the promise.
          deferred.reject(timedOut ? 'timeout' : msg);
        });

        // Debug.
        if(KINVEY_DEBUG) {
          log('Initiating a network request.', method, path, body, headers, options);
        }

        // Initiate request.
        if(null != body) {
          request.write(body);
        }
        request.end();

        // Return the promise.
        return deferred.promise;
      }
    };

    // Use Node.js adapter.
    Kinvey.Persistence.Net.use(NodeHttp);

    // Keep all data in memory.
    var dataStorage = {};

    // `Storage` adapter for [Node.js](http://nodejs.org/).
    var MemoryStorage = {
      /**
       * @augments {Storage._destroy}
       */
      _destroy: function(key) {
        delete dataStorage[key];
        return Kinvey.Defer.resolve(null);
      },

      /**
       * @augments {Storage._get}
       */
      _get: function(key) {
        return Kinvey.Defer.resolve(dataStorage[key] || null);
      },

      /**
       * @augments {Storage._save}
       */
      _save: function(key, value) {
        dataStorage[key] = value;
        return Kinvey.Defer.resolve(null);
      }
    };

    // Use memory adapter.
    Storage.use(MemoryStorage);

    // Return the copy.
    return Kinvey;
  };

  // Exports.
  // --------

  // The top-level namespace, which is a copy of the library namespace.
  // Exported for the server, as AMD module, and for the browser.
  var Kinvey = kinveyFn();
  if('object' === typeof module && 'object' === typeof module.exports) {
    module.exports = Kinvey;
  }
  else if('function' === typeof define && define.amd) {
    define('kinvey', [], function() {
      return Kinvey;
    });
  }
  else {
    root.Kinvey = Kinvey;
  }

}.call(this));
