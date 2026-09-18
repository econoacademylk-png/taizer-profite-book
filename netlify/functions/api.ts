import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import dotenv from 'dotenv';
import { handleApiRequest } from '../../src/server/api';

dotenv.config();

const app = express();
app.use(cors());

app.all('*', async (req, res, next) => {
  try {
    const handled = await handleApiRequest(req, res);
    if (!handled) {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (err: any) {
    console.error('Netlify Function API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err?.message });
  }
});

export const handler = serverless(app);
