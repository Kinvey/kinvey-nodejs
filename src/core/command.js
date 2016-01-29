'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _client = require('./client');

var _client2 = _interopRequireDefault(_client);

var _auth = require('./auth');

var _auth2 = _interopRequireDefault(_auth);

var _enums = require('./enums');

var _errors = require('./errors');

var _networkRequest = require('./requests/networkRequest');

var _networkRequest2 = _interopRequireDefault(_networkRequest);

var _assign = require('lodash/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _isString = require('lodash/lang/isString');

var _isString2 = _interopRequireDefault(_isString);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var rpcNamespace = process.env.KINVEY_RPC_NAMESPACE || 'rpc';

var Command = function () {
  function Command() {
    _classCallCheck(this, Command);
  }

  _createClass(Command, null, [{
    key: 'execute',
    value: function execute(command, args) {
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      if (!command) {
        throw new _errors.KinveyError('A command is required.');
      }

      if (!(0, _isString2.default)(command)) {
        throw new _errors.KinveyError('Command must be a string.');
      }

      options = (0, _assign2.default)({
        properties: null,
        timeout: undefined,
        handler: function handler() {}
      }, options);

      var request = new _networkRequest2.default({
        method: _enums.HttpMethod.POST,
        client: _client2.default.sharedInstance(),
        properties: options.properties,
        auth: _auth2.default.default,
        pathname: '/' + rpcNamespace + '/' + options.client.appKey + '/custom/' + command,
        data: args,
        timeout: options.timeout
      });
      var promise = request.execute().then(function (response) {
        if (response.isSuccess()) {
          return response.data;
        }

        throw response.error;
      });
      return promise;
    }
  }]);

  return Command;
}();

exports.default = Command;