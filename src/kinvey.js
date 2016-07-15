import { Kinvey as CoreKinvey } from 'kinvey-javascript-sdk-core';
import { Promise } from 'es6-promise';

export class Kinvey extends CoreKinvey {
  /**
   * Returns the Promise class.
   *
   * @return {Promise} The Promise class.
   *
   * @example
   * var Promise = Kinvey.Promise;
   */
  static get Promise() {
    return Promise;
  }
}
