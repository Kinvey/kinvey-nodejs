import Promise from 'es6-promise';
import regeneratorRuntime from 'regenerator-runtime'; // eslint-disable-line no-unused-vars
import parseHeaders from 'parse-headers';
import isFunction from 'lodash/isFunction';
const Titanium = global.Titanium;

export class TitaniumHttp {
  async handle(request) {
    const promise = new Promise((resolve, reject) => {
      const { url, method, headers, body, autoRedirect } = request;

      // Create an HTTP Client
      const client = Titanium.Network.createHTTPClient();

      // Open the request
      client.open(method, url);

      // Set request headers
      const keys = Object.keys(headers);
      for (let i = 0, len = keys.length; i < len; i += 1) {
        const key = keys[i];
        client.setRequestHeader(key, headers[key]);
      }

      // Set autoRedirect flag
      client.autoRedirect = autoRedirect || true;

      // Set the TLS version (iOS only)
      if (isFunction(client.setTlsVersion) && Titanium.Network.TLS_VERSION_1_2) {
        client.setTlsVersion(Titanium.Network.TLS_VERSION_1_2);
      }

      // Set timeout
      client.timeout = request.timeout || 0;

      // onload listener
      client.onload = function onLoad() {
        resolve({
          response: {
            statusCode: this.status,
            headers: parseHeaders(this.allResponseHeaders),
            data: this.responseText
          }
        });
      };

      // onerror listener
      client.onerror = function onError(e) {
        reject(e.error);
      };

      // Send request
      client.send(body);
    });

    // Return the promise
    return promise;
  }

  static isSupported() {
    return typeof Titanium !== 'undefined' && typeof Titanium.Network !== 'undefined';
  }
}
