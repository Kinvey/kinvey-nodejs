'use strict';

var _kinveyJavascriptSdkCore = require('kinvey-javascript-sdk-core');

var _rack = require('kinvey-javascript-sdk-core/src/rack/rack');

var _serialize = require('kinvey-javascript-sdk-core/src/rack/middleware/serialize');

var _http = require('./http');

var _device = require('kinvey-javascript-sdk-core/src/utils/device');

var _device2 = require('./device');

// Add Http middleware
var networkRack = _rack.NetworkRack.sharedInstance();
networkRack.useAfter(_serialize.SerializeMiddleware, new _http.HttpMiddleware());

// Use Device Adapter
_device.Device.use(new _device2.DeviceAdapter());

// Export
module.exports = _kinveyJavascriptSdkCore.Kinvey;
//# sourceMappingURL=index.js.map
