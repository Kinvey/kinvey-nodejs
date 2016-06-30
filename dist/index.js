'use strict';

var _kinveyJavascriptSdkCore = require('kinvey-javascript-sdk-core');

var _rack = require('kinvey-javascript-sdk-core/dist/rack/rack');

var _http = require('kinvey-javascript-sdk-core/dist/rack/http');

var _http2 = require('./http');

var _device = require('./device');

// Swap Http middleware
var networkRack = _rack.KinveyRackManager.networkRack;
networkRack.swap(_http.HttpMiddleware, new _http2.HttpMiddleware());

// Expose some globals
global.KinveyDevice = _device.Device;

// Export
module.exports = _kinveyJavascriptSdkCore.Kinvey;