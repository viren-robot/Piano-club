const { MongoClient, GridFSBucket } = require('mongodb');

const DB_NAME = 'piano_club';
const SHEETS_BUCKET = 'sheets';

let client = null;
let db = null;

async function connect(uri = process.env.MONGODB_URI) {
  if (db) return db;
  if (!uri) throw new Error('MONGODB_URI is not set');

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  db = client.db(DB_NAME);
  await ensureIndexes(db);
  return db;
}

async function ensureIndexes(database) {
  await Promise.all([
    database.collection('announcements').createIndex({ createdAt: -1 }),
    database.collection('events').createIndex({ date: 1 }),
    database.collection(`${SHEETS_BUCKET}.files`).createIndex({ uploadedAt: -1 }),
  ]);
}

function getDb() {
  if (!db) throw new Error('Database not connected. Call connect() first.');
  return db;
}

function getBucket() {
  return new GridFSBucket(getDb(), { bucketName: SHEETS_BUCKET });
}

async function close() {
  if (client) await client.close();
  client = null;
  db = null;
}

module.exports = { connect, getDb, getBucket, close, DB_NAME };
