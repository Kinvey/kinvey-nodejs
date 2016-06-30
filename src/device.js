import packageJSON from '../package.json';
import os from 'os';

/**
 * @private
 */
export class DeviceAdapter {
  toJSON() {
    return {
      platform: {
        name: 'node'
      },
      os: {
        name: os.platform(),
        version: os.release()
      },
      kinveySDK: {
        name: packageJSON.name,
        version: packageJSON.version
      }
    };
  }
}
