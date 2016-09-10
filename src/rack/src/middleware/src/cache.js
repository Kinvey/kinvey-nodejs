import { Middleware } from 'kinvey-javascript-rack';
import { DB } from './storage';
import { KinveyError } from 'kinvey-javascript-sdk-core';
import regeneratorRuntime from 'regenerator-runtime'; // eslint-disable-line no-unused-vars
import isEmpty from 'lodash/isEmpty';
const dbCache = {};

export class CacheMiddleware extends Middleware {
  constructor(name = 'Cache Middleware') {
    super(name);
  }

  openDatabase(name) {
    if (!name) {
      throw new KinveyError('A name is required to open a database.');
    }

    let db = dbCache[name];

    if (!db) {
      db = new DB(name);
    }

    return db;
  }

  async handle(request) {
    const { method, body, appKey, collection, entityId } = request;
    const db = this.openDatabase(appKey);
    let data;

    if (method === 'GET') {
      if (entityId) {
        data = await db.findById(collection, entityId);
      } else {
        data = await db.find(collection);
      }
    } else if (method === 'POST' || method === 'PUT') {
      data = await db.save(collection, body);
    } else if (method === 'DELETE') {
      if (collection && entityId) {
        data = await db.removeById(collection, entityId);
      } else if (!collection) {
        data = await db.clear();
      } else {
        data = await db.remove(collection, body);
      }
    }

    const response = {
      statusCode: method === 'POST' ? 201 : 200,
      headers: {},
      data: data
    };

    if (!data || isEmpty(data)) {
      response.statusCode = 204;
    }

    return { response: response };
  }
}
