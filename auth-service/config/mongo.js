const { MongoClient } = require('mongodb');

let client;
let db;

const getMongoUri = () => {
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }
  const user = process.env.MONGO_USER || 'admin';
  const password = process.env.MONGO_PASSWORD || 'admin';
  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || '27017';
  const authSource = process.env.MONGO_AUTH_SOURCE || 'admin';
  return `mongodb://${user}:${password}@${host}:${port}/?authSource=${authSource}`;
};

const connectMongo = async () => {
  if (db) {
    return db;
  }
  client = new MongoClient(getMongoUri());
  await client.connect();
  db = client.db(process.env.MONGO_DB_NAME || 'marketplace_nosql');
  await db.collection('auth_events').createIndex({ createdAt: -1 });
  await db.collection('auth_events').createIndex({ userId: 1, createdAt: -1 });
  return db;
};

const getMongoDb = () => {
  if (!db) {
    throw new Error('MongoDB not connected');
  }
  return db;
};

const logAuthEvent = async (event) => {
  const database = await connectMongo();
  await database.collection('auth_events').insertOne({
    ...event,
    createdAt: new Date()
  });
};

module.exports = {
  connectMongo,
  getMongoDb,
  logAuthEvent
};
