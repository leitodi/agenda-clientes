import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rincon_natural'
const DB_NAME = process.env.MONGODB_DB_NAME || 'rincon_natural'

export async function connectToDatabase() {
  await mongoose.connect(MONGODB_URI, {
    dbName: DB_NAME,
  })
}

export function getDatabaseStatus() {
  return {
    dbName: mongoose.connection?.name || '',
    dbHost: mongoose.connection?.host || '',
    readyState: mongoose.connection?.readyState ?? null,
  }
}
