'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateObjectId = generateObjectId;
var objectIdPrefix = process.env.KINVEY_OBJECT_ID_PREFIX || 'local_';

function generateObjectId() {
  var length = arguments.length <= 0 || arguments[0] === undefined ? 24 : arguments[0];
  var prefix = arguments.length <= 1 || arguments[1] === undefined ? objectIdPrefix : arguments[1];

  var chars = 'abcdef0123456789';
  var objectId = '';

  for (var i = 0, j = chars.length; i < length; i++) {
    var pos = Math.floor(Math.random() * j);
    objectId += chars.substring(pos, pos + 1);
  }

  objectId = prefix + objectId;
  return objectId;
}