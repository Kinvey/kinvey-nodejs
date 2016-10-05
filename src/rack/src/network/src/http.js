import Promise from 'es6-promise';
import agent from 'superagent';

export default class Http {
  handle(request) {
    const promise = new Promise((resolve, reject) => {
      const { url, method, headers, body, timeout, followRedirect } = request;
      const redirects = followRedirect === true ? 5 : 0;

      agent(method, url)
        .set(headers)
        .send(body)
        .timeout(timeout)
        .redirects(redirects)
        .end((error, response) => {
          if (error) {
            response = error.response;
          }

          if (!response) {
            return reject(error);
          }

          return resolve({
            response: {
              statusCode: response.statusCode,
              headers: response.headers,
              data: response.body
            }
          });
        });
    });
    return promise;
  }
}
