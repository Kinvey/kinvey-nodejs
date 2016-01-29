'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _acl = require('./acl');

var _acl2 = _interopRequireDefault(_acl);

var _errors = require('./errors');

var _clone = require('lodash/lang/clone');

var _clone2 = _interopRequireDefault(_clone);

var _isPlainObject = require('lodash/lang/isPlainObject');

var _isPlainObject2 = _interopRequireDefault(_isPlainObject);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var kmdAttribute = process.env.KINVEY_KMD_ATTRIBUTE || '_kmd';
var aclAttribute = process.env.KINVEY_ACL_ATTRIBUTE || '_acl';
var privateMetadataSymbol = Symbol();

var PrivateMetadata = function () {
  function PrivateMetadata() {
    var entity = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, PrivateMetadata);

    if (!(0, _isPlainObject2.default)(entity)) {
      throw new Error('kmd argument must be an object');
    }

    this.acl = new _acl2.default(entity[aclAttribute]);

    this.kmd = entity[kmdAttribute];

    this.entity = entity;
  }

  _createClass(PrivateMetadata, [{
    key: 'toJSON',
    value: function toJSON() {
      return (0, _clone2.default)(this.kmd);
    }
  }, {
    key: 'acl',
    set: function set(acl) {
      if (!(acl instanceof _acl2.default)) {
        throw new _errors.KinveyError('Acl argument must be of type Kinvey.Acl.');
      }

      this.acl = acl;
      this.entity[aclAttribute] = acl.toJSON();
      return this;
    }
  }, {
    key: 'createdAt',
    get: function get() {
      if (this.kmd.ect) {
        return Date.parse(this.kmd.ect);
      }

      return undefined;
    }
  }, {
    key: 'emailVerification',
    get: function get() {
      return this.kmd.emailVerification.status;
    }
  }, {
    key: 'lastModified',
    get: function get() {
      if (this.kmd.lmt) {
        return Date.parse(this.kmd.lmt);
      }

      return undefined;
    }
  }, {
    key: 'authtoken',
    get: function get() {
      return this.kmd.authtoken;
    },
    set: function set(authtoken) {
      this.kmd.authtoken = authtoken;
    }
  }]);

  return PrivateMetadata;
}();

var Metadata = function () {
  function Metadata(entity) {
    _classCallCheck(this, Metadata);

    this[privateMetadataSymbol] = new PrivateMetadata(entity);
  }

  _createClass(Metadata, [{
    key: 'toJSON',
    value: function toJSON() {
      return this[privateMetadataSymbol].toJSON();
    }
  }, {
    key: 'acl',
    set: function set(acl) {
      this[privateMetadataSymbol].acl = acl;
      return this;
    }
  }, {
    key: 'createdAt',
    get: function get() {
      return this[privateMetadataSymbol].createdAt;
    }
  }, {
    key: 'emailVerification',
    get: function get() {
      return this[privateMetadataSymbol].emailVerification;
    }
  }, {
    key: 'lastModified',
    get: function get() {
      return this[privateMetadataSymbol].lastModified;
    }
  }, {
    key: 'lmt',
    get: function get() {
      return this.lastModified;
    }
  }, {
    key: 'authtoken',
    get: function get() {
      return this[privateMetadataSymbol].authtoken;
    },
    set: function set(authtoken) {
      this[privateMetadataSymbol].authtoken = authtoken;
    }
  }]);

  return Metadata;
}();

exports.default = Metadata;