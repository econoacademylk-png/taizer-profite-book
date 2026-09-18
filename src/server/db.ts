import { MongoClient, Db } from 'mongodb';
import dns from 'node:dns';

// Fix for Windows / ISP DNS blocking MongoDB Atlas SRV lookups
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore if not supported in environment
}

export const ADMIN_EMAIL = 'supundilshan38@gmail.com';
export const ADMIN_PASSWORD = 'addi';

const DEFAULT_URI = 'mongodb+srv://supundilshan358_db_user:ZaAoLY6pOTlsPg5D@cluster0.ouxm37c.mongodb.net/taizer_profit_book?retryWrites=true&w=majority&appName=Cluster0';
const uri = process.env.MONGODB_URI || DEFAULT_URI;

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  try {
    if (!client) {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
      });
    }

    await client.connect();
    db = client.db('taizer_profit_book');
    console.log('[MongoDB] Connected to database: taizer_profit_book');

    // Create indexes and seed admin
    await seedAdmin();
    return db;
  } catch (err: any) {
    console.error('[MongoDB] Connection error:', err.message);
    throw err;
  }
}

export async function seedAdmin() {
  if (!db) return;
  const usersCol = db.collection('users');

  const admin = await usersCol.findOne({
    email: ADMIN_EMAIL.toLowerCase(),
  });

  if (!admin) {
    await usersCol.insertOne({
      id: 'admin-supundilshan',
      name: 'Supun Dilshan (Admin)',
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
      role: 'admin',
      status: 'approved',
      walletBalance: 100,
      dailyTarget: 30,
      startDate: new Date().toISOString().split('T')[0],
      monthNumber: 1,
      isRegistered: true,
      createdAt: new Date().toISOString().split('T')[0],
    });
    console.log('[MongoDB] Seeded default Admin account:', ADMIN_EMAIL);
  } else if (admin.password !== ADMIN_PASSWORD || admin.role !== 'admin' || admin.status !== 'approved') {
    await usersCol.updateOne(
      { email: ADMIN_EMAIL.toLowerCase() },
      { $set: { password: ADMIN_PASSWORD, role: 'admin', status: 'approved' } }
    );
  }
}
