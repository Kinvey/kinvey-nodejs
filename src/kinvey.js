import {
  CacheRack,
  NetworkRack,
  CacheMiddleware,
  HttpMiddleware,
  ParseMiddleware,
  SerializeMiddleware
} from './rack';
import { Kinvey, NetworkRequest, CacheRequest } from 'kinvey-javascript-sdk-core';
import { Promise } from 'es6-promise';
import { Device } from './device';

// Set CacheRequest rack
CacheRequest.rack = new CacheRack();

// Set NetworkRequest rack
NetworkRequest.rack = new NetworkRack();

// Add Modules
Kinvey.Device = Device;
Kinvey.Promise = Promise;
Kinvey.CacheMiddleware = CacheMiddleware;
Kinvey.HttpMiddleware = HttpMiddleware;
Kinvey.ParseMiddleware = ParseMiddleware;
Kinvey.SerializeMiddleware = SerializeMiddleware;

// Export
export { Kinvey };
