"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createQueryablePromise = createQueryablePromise;
function createQueryablePromise(promise) {
  if (promise.isResolved) return promise;

  var isResolved = false;
  var isRejected = false;

  var result = promise.then(function (v) {
    isResolved = true;return v;
  }, function (e) {
    isRejected = true;throw e;
  });
  result.isFulfilled = function () {
    return isResolved || isRejected;
  };
  result.isResolved = function () {
    return isResolved;
  };
  result.isRejected = function () {
    return isRejected;
  };
  return result;
}