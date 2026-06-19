const { MongoClient } = require('mongodb');

let clientPromise = null;

function isMongoEnabled() {
  return Boolean(process.env.MONGO_URI && String(process.env.MONGO_URI).trim());
}

async function getMongoClient() {
  if (!isMongoEnabled()) {
    throw new Error('MONGO_NOT_CONFIGURED');
  }
  if (!clientPromise) {
    const uri = String(process.env.MONGO_URI).trim();
    const client = new MongoClient(uri, {
      maxPoolSize: 10
    });
    clientPromise = client.connect();
  }
  return clientPromise;
}

async function getMongoDb() {
  const client = await getMongoClient();
  const dbName = process.env.MONGO_DB || 'heligxiam_observability';
  return client.db(dbName);
}

module.exports = {
  isMongoEnabled,
  getMongoDb
};
