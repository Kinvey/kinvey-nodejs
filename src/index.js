import { Kinvey } from 'kinvey-javascript-sdk-core';
import { KinveyRackManager } from 'kinvey-javascript-sdk-core/dist/rack/rack';
import { HttpMiddleware as CoreHttpMiddleware } from 'kinvey-javascript-sdk-core/dist/rack/http';
import { HttpMiddleware } from './http';
import { Device } from './device';

// Swap Http middleware
const networkRack = KinveyRackManager.networkRack;
networkRack.swap(CoreHttpMiddleware, new HttpMiddleware());

// Expose some globals
global.KinveyDevice = Device;

// Export
module.exports = Kinvey;
