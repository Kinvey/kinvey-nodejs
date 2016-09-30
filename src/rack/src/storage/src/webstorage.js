import { NotFoundError } from '../../../../errors';
import regeneratorRuntime from 'regenerator-runtime'; // eslint-disable-line no-unused-vars
import keyBy from 'lodash/keyBy';
import merge from 'lodash/merge';
import values from 'lodash/values';
import forEach from 'lodash/forEach';
import findIndex from 'lodash/findIndex';
import find from 'lodash/find';
const idAttribute = process.env.KINVEY_ID_ATTRIBUTE || '_id';
const masterCollectionName = 'master';

export default class WebStorage {
  constructor(name = 'kinvey') {
    this.name = name;
  }

  get masterCollectionName() {
    return `${this.name}_${masterCollectionName}`;
  }
}

export class LocalStorage extends WebStorage {
  constructor(name) {
    super(name);
    global.localStorage.setItem(this.masterCollectionName, JSON.stringify([]));
  }

  async find(collection) {
    const entities = global.localStorage.getItem(`${this.name}${collection}`);

    if (entities) {
      return JSON.parse(entities);
    }

    return entities;
  }

  async findById(collection, id) {
    const entities = await this.find(collection);
    const entity = find(entities, entity => entity[idAttribute] === id);

    if (!entity) {
      throw new NotFoundError(`An entity with _id = ${id} was not found in the ${collection}`
        + ` collection on the ${this.name} localstorage database.`);
    }

    return entity;
  }

  async save(collection, entities) {
    const collections = await this.find(this.masterCollectionName);

    if (findIndex(collections, collection) === -1) {
      collections.push(collection);
      global.localStorage.setItem(this.masterCollectionName, JSON.stringify(collections));
    }

    const existingEntities = await this.find(collection);
    const existingEntitiesById = keyBy(existingEntities, idAttribute);
    const entitiesById = keyBy(entities, idAttribute);
    const existingEntityIds = Object.keys(existingEntitiesById);

    forEach(existingEntityIds, (id) => {
      const existingEntity = existingEntitiesById[id];
      const entity = entitiesById[id];

      if (entity) {
        entitiesById[id] = merge(existingEntity, entity);
      }
    });

    global.localStorage.setItem(`${this.name}${collection}`, JSON.stringify(values(entitiesById)));
    return entities;
  }

  async removeById(collection, id) {
    const entities = await this.find(collection);
    const entitiesById = keyBy(entities, idAttribute);
    const entity = entitiesById[id];

    if (!entity) {
      throw new NotFoundError(`An entity with _id = ${id} was not found in the ${collection} ` +
        `collection on the ${this.name} memory database.`);
    }

    delete entitiesById[id];
    await this.save(collection, values(entitiesById));
    return entity;
  }

  async clear() {
    const collections = await this.find(this.masterCollectionName);

    forEach(collections, (collection) => {
      global.localStorage.removeItem(`${this.name}${collection}`);
    });

    global.localStorage.setItem(this.masterCollectionName, JSON.stringify([]));
  }

  static isSupported() {
    if (global.localStorage) {
      const item = 'testLocalStorageSupport';
      try {
        global.localStorage.setItem(item, item);
        global.localStorage.removeItem(item);
        return true;
      } catch (e) {
        return false;
      }
    }

    return false;
  }
}

export class SessionStorage extends WebStorage {
  constructor(name) {
    super(name);
    global.sessionStorage.setItem(this.masterCollectionName, JSON.stringify([]));
  }

  async find(collection) {
    const entities = global.sessionStorage.getItem(`${this.name}${collection}`);

    if (entities) {
      return JSON.parse(entities);
    }

    return entities;
  }

  async findById(collection, id) {
    const entities = await this.find(collection);
    const entity = find(entities, entity => entity[idAttribute] === id);

    if (!entity) {
      throw new NotFoundError(`An entity with _id = ${id} was not found in the ${collection}`
        + ` collection on the ${this.name} localstorage database.`);
    }

    return entity;
  }

  async save(collection, entities) {
    const collections = await this.find(this.masterCollectionName);

    if (findIndex(collections, collection) === -1) {
      collections.push(collection);
      global.sessionStorage.setItem(this.masterCollectionName, JSON.stringify(collections));
    }

    const existingEntities = await this.find(collection);
    const existingEntitiesById = keyBy(existingEntities, idAttribute);
    const entitiesById = keyBy(entities, idAttribute);
    const existingEntityIds = Object.keys(existingEntitiesById);

    forEach(existingEntityIds, (id) => {
      const existingEntity = existingEntitiesById[id];
      const entity = entitiesById[id];

      if (entity) {
        entitiesById[id] = merge(existingEntity, entity);
      }
    });

    global.sessionStorage.setItem(`${this.name}${collection}`, JSON.stringify(values(entitiesById)));
    return entities;
  }

  async removeById(collection, id) {
    const entities = await this.find(collection);
    const entitiesById = keyBy(entities, idAttribute);
    const entity = entitiesById[id];

    if (!entity) {
      throw new NotFoundError(`An entity with _id = ${id} was not found in the ${collection} ` +
        `collection on the ${this.name} memory database.`);
    }

    delete entitiesById[id];
    global.sessionStorage.setItem(`${this.name}${collection}`, JSON.stringify(values(entitiesById)));

    return entity;
  }

  async clear() {
    const collections = await this.find(this.masterCollectionName);

    forEach(collections, (collection) => {
      global.sessionStorage.removeItem(`${this.name}${collection}`);
    });

    global.sessionStorage.setItem(this.masterCollectionName, JSON.stringify([]));
  }

  static isSupported() {
    if (global.sessionStorage) {
      const item = 'testSessionStorageSupport';
      try {
        global.sessionStorage.setItem(item, item);
        global.sessionStorage.removeItem(item);
        return true;
      } catch (e) {
        return false;
      }
    }

    return false;
  }
}
