'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var AuthorizationGrant = {
  AuthorizationCodeLoginPage: 'AuthorizationCodeLoginPage',
  AuthorizationCodeAPI: 'AuthorizationCodeAPI'
};
Object.freeze(AuthorizationGrant);
exports.AuthorizationGrant = AuthorizationGrant;

var CacheAdapter = {
  IndexedDB: 'IndexedDB',
  LocalStorage: 'LocalStorage',
  Memory: 'Memory',
  WebSQL: 'WebSQL'
};
Object.freeze(CacheAdapter);
exports.CacheAdapter = CacheAdapter;

var ReadPolicy = {
  LocalOnly: 'LocalOnly',
  LocalFirst: 'LocalFirst',
  NetworkOnly: 'NetworkOnly',
  NetworkFirst: 'NetworkFirst'
};
Object.freeze(ReadPolicy);
exports.ReadPolicy = ReadPolicy;

var HttpMethod = {
  GET: 'GET',
  POST: 'POST',
  PATCH: 'PATCH',
  PUT: 'PUT',
  DELETE: 'DELETE'
};
Object.freeze(HttpMethod);
exports.HttpMethod = HttpMethod;

var RackType = {
  Network: 'Network',
  Cache: 'Cache'
};
Object.freeze(RackType);
exports.RackType = RackType;

var ResponseType = {
  Blob: 'blob',
  Document: 'document',
  DOMString: 'domstring',
  JSON: 'json',
  Text: 'text'
};
Object.freeze(ResponseType);
exports.ResponseType = ResponseType;

var SocialIdentity = {
  Facebook: 'facebook',
  Google: 'google',
  LinkedIn: 'linkedin'
};
Object.freeze(SocialIdentity);
exports.SocialIdentity = SocialIdentity;

var StatusCode = {
  Ok: 200,
  Created: 201,
  RedirectTemporarily: 301,
  RedirectPermanetly: 302,
  NotFound: 404,
  ServerError: 500
};
Object.freeze(StatusCode);
exports.StatusCode = StatusCode;

var DataStoreType = {
  Sync: 'Sync',
  Cache: 'Cache',
  Network: 'Network'
};
Object.freeze(DataStoreType);
exports.DataStoreType = DataStoreType;

var WritePolicy = {
  LocalOnly: 'LocalOnly',
  LocalFirst: 'LocalFirst',
  NetworkOnly: 'NetworkOnly',
  NetworkFirst: 'NetworkFirst'
};
Object.freeze(WritePolicy);
exports.WritePolicy = WritePolicy;