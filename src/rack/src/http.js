import Network from './network';
import Middleware from './middleware';

export default class HttpMiddleware extends Middleware {
  constructor(name = 'Http Middleware') {
    super(name);
  }

  get adapter() {
    return Network;
  }

  handle(request, response) {
    if (!this.adapter) {
      return Promise.reject(new Error('Unable to handle the request. A http adapter is not specified.'));
    }

    return this.adapter.handle(request, response);
  }
}
