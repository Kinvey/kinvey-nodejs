import regeneratorRuntime from 'regenerator-runtime'; // eslint-disable-line no-unused-vars
let angular;
let $http;

if (typeof window !== 'undefined' && typeof global.angular !== 'undefined') {
  angular = global.angular;
  const $injector = angular.injector(['ng']);
  $http = $injector.get('$http');
}

export class $Http {
  async handle(request) {
    const { url, method, headers, body } = request;

    try {
      // Send the request with $http
      const response = await $http({
        url: url,
        method: method,
        headers: headers,
        data: body
      });

      return {
        response: {
          statusCode: response.status,
          headers: response.headers(),
          data: response.data
        }
      };
    } catch (responseError) {
      return {
        response: {
          statusCode: responseError.status,
          headers: responseError.headers(),
          data: responseError.data
        }
      };
    }
  }

  static isSupported() {
    return !!angular;
  }
}
