import { KinveyMiddleware } from 'kinvey-javascript-sdk-core/dist/rack/middleware';
import http from 'request';

export class HttpMiddleware extends KinveyMiddleware {
  constructor(name = 'Kinvey Node Http Middleware') {
    super(name);
  }

  handle(request) {
    return super.handle(request).then(() => {
      const promise = new Promise((resolve, reject) => {
        const { url, method, headers, body, followRedirect } = request;

        http({
          url: url,
          method: method,
          headers: headers.toJSON(),
          body: body,
          followRedirect: followRedirect
        }, (error, response, data) => {
          if (error) {
            if (error.code === 'ENOTFOUND') {
              return reject(new Error('It looks like you do not have a network connection. ' +
                'Please check that you are connected to a network and try again.'));
            }

            return reject(error);
          }

          request.response = {
            statusCode: response.statusCode,
            headers: response.headers,
            data: data
          };

          return resolve(request);
        });
      });
      return promise;
    });
  }
}
