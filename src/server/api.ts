import type { IncomingMessage, ServerResponse } from 'http';
import { ObjectId } from 'mongodb';
import { connectToDatabase, ADMIN_EMAIL, ADMIN_EMAILS, isAdminEmail, ADMIN_PASSWORD } from './db.ts';

function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

export async function syncUserRealBalance(db: any, rawUserId: string) {
  if (!rawUserId) return null;
  const userId = decodeURIComponent(rawUserId);
  const usersCol = db.collection('users');
  const txCol = db.collection('transactions');

  const user = await usersCol.findOne({
    $or: [
      { id: userId },
      { email: userId.toLowerCase() },
      { email: { $regex: new RegExp(`^${userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
    ],
  });
  if (!user) return null;

  const resolvedUserId = user.id || userId;
  const userTxs = await txCol.find({
    $or: [
      { userId: resolvedUserId },
      ...(user.role === 'admin' ? [{ userId: 'global' }, { userId: { $exists: false } }] : []),
    ],
  }).toArray();

  const totalIncome = userTxs
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  const totalLoss = userTxs
    .filter((t: any) => t.type === 'loss')
    .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  const netProfit = Number((totalIncome - totalLoss).toFixed(2));
  const initialWallet = Number(user.walletBalance) || 10;
  const currentRealBalance = Number(Math.max(0, initialWallet + netProfit).toFixed(2));

  await usersCol.updateOne(
    { _id: user._id },
    {
      $set: {
        currentRealBalance,
        netProfit,
        totalIncome: Number(totalIncome.toFixed(2)),
        totalLoss: Number(totalLoss.toFixed(2)),
        totalTrades: userTxs.length,
      },
    }
  );

  return {
    ...user,
    currentRealBalance,
    netProfit,
    totalIncome: Number(totalIncome.toFixed(2)),
    totalLoss: Number(totalLoss.toFixed(2)),
    totalTrades: userTxs.length,
  };
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = (req.method || 'GET').toUpperCase();
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname;
  if (pathname.startsWith('/.netlify/functions/api')) {
    pathname = pathname.replace('/.netlify/functions/api', '/api');
  }

  if (!pathname.startsWith('/api')) {
    return false;
  }

  try {
    const db = await connectToDatabase();
    const usersCol = db.collection('users');
    const txCol = db.collection('transactions');
    const targetsCol = db.collection('targets');

    // GET /api/health
    if (pathname === '/api/health' && method === 'GET') {
      sendJson(res, 200, { status: 'connected', db: 'taizer_profit_book' });
      return true;
    }

    // GET /api/dollar-rate (USD to LKR live exchange rate with 30-min auto-refresh)
    if (pathname === '/api/dollar-rate' && method === 'GET') {
      const ratesCol = db.collection('exchange_rates');
      const now = Date.now();

      // Check cached rate within the last 30 minutes
      const cached = await ratesCol.findOne({ base: 'USD', target: 'LKR' });
      if (cached && cached.timestamp && now - cached.timestamp < 30 * 60 * 1000) {
        sendJson(res, 200, {
          success: true,
          base: 'USD',
          target: 'LKR',
          rate: cached.rate,
          date: cached.date,
          lastUpdated: cached.lastUpdated,
          cached: true,
        });
        return true;
      }

      // Fetch fresh live exchange rate
      try {
        let fetchedRate: number | null = null;
        let fetchedDate = new Date().toISOString().split('T')[0];
        let fetchedLastUpdated = new Date().toISOString();

        try {
          const apiRes = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(6000) });
          if (apiRes.ok) {
            const data: any = await apiRes.json();
            if (data?.rates?.LKR) {
              fetchedRate = Number(Number(data.rates.LKR).toFixed(2));
              if (data.time_last_update_utc) {
                fetchedLastUpdated = data.time_last_update_utc;
              }
            }
          }
        } catch {
          // Fallback provider
          try {
            const fallbackRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(6000) });
            if (fallbackRes.ok) {
              const fbData: any = await fallbackRes.json();
              if (fbData?.rates?.LKR) {
                fetchedRate = Number(Number(fbData.rates.LKR).toFixed(2));
              }
            }
          } catch {}
        }

        if (fetchedRate) {
          await ratesCol.updateOne(
            { base: 'USD', target: 'LKR' },
            {
              $set: {
                base: 'USD',
                target: 'LKR',
                rate: fetchedRate,
                date: fetchedDate,
                lastUpdated: fetchedLastUpdated,
                timestamp: now,
              },
            },
            { upsert: true }
          );

          sendJson(res, 200, {
            success: true,
            base: 'USD',
            target: 'LKR',
            rate: fetchedRate,
            date: fetchedDate,
            lastUpdated: fetchedLastUpdated,
            cached: false,
          });
          return true;
        }
      } catch (err) {
        console.error('Error fetching dollar exchange rate:', err);
      }

      // If fetch failed, return stale cache if available
      if (cached) {
        sendJson(res, 200, {
          success: true,
          base: 'USD',
          target: 'LKR',
          rate: cached.rate,
          date: cached.date,
          lastUpdated: cached.lastUpdated,
          cached: true,
          stale: true,
        });
        return true;
      }

      // Default fallback if initial connect fails
      sendJson(res, 200, {
        success: true,
        base: 'USD',
        target: 'LKR',
        rate: 331.88,
        date: new Date().toISOString().split('T')[0],
        lastUpdated: 'Estimated',
        cached: false,
      });
      return true;
    }

    // GET /api/users
    if (pathname === '/api/users' && method === 'GET') {
      const users = await usersCol.find({}).toArray();
      const allTxs = await txCol.find({}).toArray();

      const formatted = users.map((u: any) => {
        const userId = u.id || String(u._id);
        const userTxs = allTxs.filter(
          (t: any) => t.userId === userId || (!t.userId && u.role === 'admin')
        );
        const totalIncome = userTxs
          .filter((t: any) => t.type === 'income')
          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const totalLoss = userTxs
          .filter((t: any) => t.type === 'loss')
          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const netProfit = Number((totalIncome - totalLoss).toFixed(2));
        const initialWallet = Number(u.walletBalance) || 10;
        const currentRealBalance = Number(Math.max(0, initialWallet + netProfit).toFixed(2));

        return {
          id: userId,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role || 'user',
          status: u.status || 'pending',
          walletBalance: initialWallet,
          currentRealBalance, // Real live balance in user's wallet
          netProfit, // Total net profit (income - loss)
          totalIncome: Number(totalIncome.toFixed(2)),
          totalLoss: Number(totalLoss.toFixed(2)),
          totalTrades: userTxs.length,
          dailyTarget: u.dailyTarget || Math.floor(currentRealBalance / 10) * 3,
          startDate: u.startDate,
          monthNumber: u.monthNumber || 1,
          isRegistered: true,
          createdAt: u.createdAt || new Date().toISOString().split('T')[0],
        };
      });

      sendJson(res, 200, formatted);
      return true;
    }

    // POST /api/auth/register
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await parseJsonBody(req);
      const cleanEmail = (body.email || '').trim().toLowerCase();

      if (isAdminEmail(cleanEmail)) {
        sendJson(res, 400, { success: false, message: 'This email is reserved for the System Administrator.' });
        return true;
      }

      const existing = await usersCol.findOne({ email: cleanEmail });
      if (existing) {
        sendJson(res, 400, {
          success: false,
          message: 'An account with this email already exists. Please log in or wait for Admin approval.',
        });
        return true;
      }

      const wallet = Number(body.walletBalance) || 10;
      const tier = Math.floor(wallet / 10);
      const dailyTarget = tier * 3;
      const newUser = {
        id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        name: (body.name || '').trim(),
        email: cleanEmail,
        password: body.password,
        role: 'user',
        status: 'pending', // Requires admin approval!
        walletBalance: wallet,
        dailyTarget,
        startDate: new Date().toISOString().split('T')[0],
        monthNumber: 1,
        isRegistered: false,
        createdAt: new Date().toISOString().split('T')[0],
      };

      await usersCol.insertOne(newUser);
      sendJson(res, 201, {
        success: true,
        message: `Registration submitted! Your account is pending Admin approval. You will be able to log in once Admin (${ADMIN_EMAIL}) approves your request.`,
        user: newUser,
      });
      return true;
    }

    // POST /api/auth/login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseJsonBody(req);
      const identifier = (body.identifier || '').trim().toLowerCase();
      const password = body.password;

      const user: any = await usersCol.findOne({
        $or: [{ email: identifier }, { name: { $regex: new RegExp(`^${identifier}$`, 'i') } }],
      });

      if (!user) {
        sendJson(res, 401, { success: false, message: 'No account found matching this email or username.' });
        return true;
      }

      if (user.password !== password) {
        sendJson(res, 401, { success: false, message: 'Incorrect password. Please try again.' });
        return true;
      }

      // Check user approval status
      if (user.role === 'user') {
        if (user.status === 'pending') {
          sendJson(res, 403, {
            success: false,
            message: 'Your account is pending approval by the Admin (supundilshan38@gmail.com). Please wait until approved.',
          });
          return true;
        }
        if (user.status === 'rejected') {
          sendJson(res, 403, {
            success: false,
            message: 'Your account request was declined by the Admin. Please contact supundilshan38@gmail.com.',
          });
          return true;
        }
      }

      const balanceStats = await syncUserRealBalance(db, user.id || user.email);
      const loggedIn = {
        id: user.id || String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        walletBalance: user.walletBalance,
        currentRealBalance: balanceStats?.currentRealBalance ?? user.currentRealBalance ?? user.walletBalance,
        netProfit: balanceStats?.netProfit ?? user.netProfit ?? 0,
        totalIncome: balanceStats?.totalIncome ?? user.totalIncome ?? 0,
        totalLoss: balanceStats?.totalLoss ?? user.totalLoss ?? 0,
        totalTrades: balanceStats?.totalTrades ?? user.totalTrades ?? 0,
        dailyTarget: user.dailyTarget,
        startDate: user.startDate,
        monthNumber: user.monthNumber,
        isRegistered: true,
      };

      sendJson(res, 200, {
        success: true,
        message: user.role === 'admin' ? 'Welcome Admin!' : 'Logged in successfully!',
        user: loggedIn,
      });
      return true;
    }

    // PATCH /api/users/:id/status
    const statusMatch = pathname.match(/^\/api\/users\/([^/]+)\/status$/);
    if (statusMatch && (method === 'PATCH' || method === 'PUT')) {
      const rawUserId = statusMatch[1];
      const userId = decodeURIComponent(rawUserId).trim();
      const body = await parseJsonBody(req);
      const newStatus = body.status;

      let objectId: any = null;
      try {
        if (ObjectId.isValid(userId) && userId.length === 24) {
          objectId = new ObjectId(userId);
        }
      } catch (_) {}

      const filter: any = {
        $or: [
          { id: userId },
          { email: userId.toLowerCase() },
          { email: { $regex: new RegExp(`^${userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        ],
      };
      if (objectId) {
        filter.$or.push({ _id: objectId });
      }

      const updateResult = await usersCol.updateOne(filter, { $set: { status: newStatus } });
      console.log(`[API] Updated status for user "${userId}" to "${newStatus}". Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount}`);

      sendJson(res, 200, { success: true, matched: updateResult.matchedCount, modified: updateResult.modifiedCount });
      return true;
    }

    // DELETE /api/users/:id
    const deleteMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const rawUserId = deleteMatch[1];
      const userId = decodeURIComponent(rawUserId).trim();

      let objectId: any = null;
      try {
        if (ObjectId.isValid(userId) && userId.length === 24) {
          objectId = new ObjectId(userId);
        }
      } catch (_) {}

      const filter: any = {
        $or: [
          { id: userId },
          { email: userId.toLowerCase() },
          { email: { $regex: new RegExp(`^${userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        ],
      };
      if (objectId) {
        filter.$or.push({ _id: objectId });
      }

      const target: any = await usersCol.findOne(filter);

      if (target && target.role !== 'admin' && !isAdminEmail(target.email)) {
        await usersCol.deleteOne({ _id: target._id });
        await txCol.deleteMany({
          $or: [
            { userId: target.id },
            { userId: target.email },
            { userId: userId },
          ],
        });
        await targetsCol.deleteMany({
          $or: [
            { userId: target.id },
            { userId: target.email },
            { userId: userId },
          ],
        });
      }
      sendJson(res, 200, { success: true });
      return true;
    }

    // PUT /api/users/:id (Update Profile)
    const updateMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
    if (updateMatch && method === 'PUT') {
      const rawUserId = updateMatch[1];
      const userId = decodeURIComponent(rawUserId).trim();
      const body = await parseJsonBody(req);

      const updateFields: any = {};
      if (body.name) updateFields.name = body.name;
      if (body.email) updateFields.email = body.email;
      if (typeof body.walletBalance === 'number') updateFields.walletBalance = body.walletBalance;
      if (typeof body.dailyTarget === 'number') updateFields.dailyTarget = body.dailyTarget;
      if (body.startDate) updateFields.startDate = body.startDate;
      if (body.monthNumber) updateFields.monthNumber = body.monthNumber;

      let objectId: any = null;
      try {
        if (ObjectId.isValid(userId) && userId.length === 24) {
          objectId = new ObjectId(userId);
        }
      } catch (_) {}

      const filter: any = {
        $or: [
          { id: userId },
          { email: userId.toLowerCase() },
          { email: { $regex: new RegExp(`^${userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        ],
      };
      if (objectId) {
        filter.$or.push({ _id: objectId });
      }

      await usersCol.updateOne(filter, { $set: updateFields });
      await syncUserRealBalance(db, userId);
      sendJson(res, 200, { success: true });
      return true;
    }

    // GET /api/transactions
    if (pathname === '/api/transactions' && method === 'GET') {
      const userId = url.searchParams.get('userId');
      const query: any = userId ? { userId } : {};
      const txs = await txCol.find(query).sort({ timestamp: -1 }).toArray();
      const formatted = txs.map((t: any) => ({
        id: t.id || String(t._id),
        amount: t.amount,
        type: t.type,
        date: t.date,
        time: t.time,
        timestamp: t.timestamp,
        note: t.note,
      }));
      sendJson(res, 200, formatted);
      return true;
    }

    // POST /api/transactions
    if (pathname === '/api/transactions' && method === 'POST') {
      const body = await parseJsonBody(req);
      const newTx = {
        id: body.id || 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        userId: body.userId || 'global',
        amount: Number(body.amount) || 0,
        type: body.type || 'income',
        date: body.date,
        time: body.time,
        timestamp: body.timestamp || Date.now(),
        note: body.note,
      };
      await txCol.insertOne(newTx);
      const balanceStats = await syncUserRealBalance(db, newTx.userId);
      sendJson(res, 201, { success: true, transaction: newTx, ...balanceStats });
      return true;
    }

    // DELETE /api/transactions/:id
    const deleteTxMatch = pathname.match(/^\/api\/transactions\/([^/]+)$/);
    if (deleteTxMatch && method === 'DELETE') {
      const txId = deleteTxMatch[1];
      const targetTx: any = await txCol.findOne({ $or: [{ id: txId }] });
      await txCol.deleteOne({ $or: [{ id: txId }] });
      if (targetTx && targetTx.userId) {
        await syncUserRealBalance(db, targetTx.userId);
      }
      sendJson(res, 200, { success: true });
      return true;
    }

    // GET /api/targets
    if (pathname === '/api/targets' && method === 'GET') {
      const userId = url.searchParams.get('userId') || 'global';
      const items = await targetsCol.find({ userId }).toArray();
      const targetMap: Record<string, number> = {};
      items.forEach((item: any) => {
        if (item.monthKey) {
          targetMap[item.monthKey] = item.amount;
        }
      });
      sendJson(res, 200, targetMap);
      return true;
    }

    // POST /api/targets
    if (pathname === '/api/targets' && method === 'POST') {
      const body = await parseJsonBody(req);
      const userId = body.userId || 'global';
      const monthKey = body.monthKey;
      const amount = Number(body.amount) || 0;

      await targetsCol.updateOne(
        { userId, monthKey },
        { $set: { userId, monthKey, amount, updatedAt: new Date() } },
        { upsert: true }
      );
      sendJson(res, 200, { success: true });
      return true;
    }

    sendJson(res, 404, { error: 'Not Found' });
    return true;
  } catch (err: any) {
    console.error('[API Error]', err);
    sendJson(res, 500, { error: err.message || 'Internal Server Error' });
    return true;
  }
}
