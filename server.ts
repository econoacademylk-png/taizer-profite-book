import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { handleApiRequest } from './src/server/api';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());

// Mount API middleware
app.use(async (req, res, next) => {
  if (req.url && req.url.startsWith('/api')) {
    const handled = await handleApiRequest(req, res);
    if (handled) return;
  }
  next();
});

// Serve dist static files
const distPath = path.resolve(import.meta.dirname || process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Taizer Profit Book Server running at http://localhost:${PORT}`);
});
