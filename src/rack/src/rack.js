import CacheMiddleware from './cache';
import Middleware from './middleware';
import HttpMiddleware from './http';
import ParseMiddleware from './parse';
import SerializeMiddleware from './serialize';
import Promise from 'es6-promise';
import findIndex from 'lodash/findIndex';
import reduce from 'lodash/reduce';

export default class Rack extends Middleware {
  constructor(name = 'Rack') {
    super(name);
    this.middlewares = [];
    this.canceled = false;
  }

  getMiddleware(index = -1) {
    const middlewares = this.middlewares;

    if (index < -1 || index >= middlewares.length) {
      throw new Error(`Index ${index} is out of bounds.`);
    }

    return middlewares[index];
  }

  use(middleware) {
    if (middleware) {
      if (middleware instanceof Middleware) {
        this.middlewares.push(middleware);
        return;
      }

      throw new Error('Unable to use the middleware. It must be an instance of Middleware.');
    }
  }

  useBefore(middlewareClass, middleware) {
    if (middleware) {
      if (middleware instanceof Middleware) {
        const middlewares = this.middlewares;
        const index = findIndex(middlewares, existingMiddleware => existingMiddleware instanceof middlewareClass);

        if (index > -1) {
          middlewares.splice(index, 0, middleware);
          this.middlewares = middlewares;
        }

        return;
      }

      throw new Error('Unable to use the middleware. It must be an instance of Middleware.');
    }
  }

  useAfter(middlewareClass, middleware) {
    if (middleware) {
      if (middleware instanceof Middleware) {
        const middlewares = this.middlewares;
        const index = findIndex(middlewares, existingMiddleware => existingMiddleware instanceof middlewareClass);

        if (index > -1) {
          middlewares.splice(index + 1, 0, middleware);
          this.middlewares = middlewares;
        }

        return;
      }

      throw new Error('Unable to use the middleware. It must be an instance of Middleware.');
    }
  }

  swap(middlewareClass, middleware) {
    if (middleware) {
      if (middleware instanceof Middleware) {
        const middlewares = this.middlewares;
        const index = findIndex(middlewares, existingMiddleware => existingMiddleware instanceof middlewareClass);

        if (index > -1) {
          middlewares.splice(index, 1, middleware);
          this.middlewares = middlewares;
        }

        return;
      }

      throw new Error('Unable to use the middleware. It must be an instance of Middleware.');
    }
  }

  remove(middlewareClass) {
    const middlewares = this.middlewares;
    const index = findIndex(middlewares, existingMiddleware => existingMiddleware instanceof middlewareClass);

    if (index > -1) {
      middlewares.splice(index, 1);
      this.middlewares = middlewares;
      this.remove(middlewareClass);
    }
  }

  reset() {
    this.middlewares = [];
  }

  execute(req) {
    if (!req) {
      return Promise.reject(new Error('Request is undefined. Please provide a valid request.'));
    }

    return reduce(this.middlewares,
      (promise, middleware) => promise.then(({ request, response }) => middleware.handle(request || req, response)),
      Promise.resolve({ request: req }))
      .then(({ response }) => response);
  }

  cancel() {
    this.canceled = true;
  }

  handle(request) {
    return this.execute(request);
  }

  generateTree(level = 0) {
    const root = super.generateTree(level);
    const middlewares = this.middlewares;

    middlewares.forEach((middleware) => {
      root.nodes.push(middleware.generateTree(level + 1));
    });

    return root;
  }
}

export class CacheRack extends Rack {
  constructor(name = 'Cache Rack') {
    super(name);
    this.use(new CacheMiddleware());
  }
}

export class NetworkRack extends Rack {
  constructor(name = 'Network Rack') {
    super(name);
    this.use(new SerializeMiddleware());
    this.use(new HttpMiddleware());
    this.use(new ParseMiddleware());
  }
}
