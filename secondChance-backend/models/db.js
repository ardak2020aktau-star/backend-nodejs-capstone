require('dotenv').config();
const { MongoClient } = require('mongodb');

let client;
let connection;

async function connectToDatabase() {
  if (!connection) {
    connection = (async () => {
      client = new MongoClient(process.env.MONGO_URL);
      await client.connect();
      return client.db(process.env.MONGO_DB || 'secondChance');
    })().catch(async (error) => {
      if (client) await client.close().catch(() => {});
      connection = null;
      throw error;
    });
  }
  return connection;
}

connectToDatabase.close = async () => {
  if (client) await client.close();
  connection = null;
};

module.exports = connectToDatabase;
