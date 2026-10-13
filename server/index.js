require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const cron = require('node-cron');
const { getAllAccounts, getSheetNames, writeAccountData, addAccount, removeAccount, getCRMData } = require('./sheets');
const { scanAllAccounts } = require('./scanner');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

const PASSWORD = process.env.PASSWORD || 'kyce2024';

let lastScanTime = null;
let scanInProgress = false;

function authMiddleware(req, res, next) {
  const token = req.cookies?.kyce_auth || req.headers['x-auth-token'];
  if (token === PASSWORD) {
    return next();
  }
  return res.status(401).json({ error: 'Non autorisé' });
}

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    res.cookie('kyce_auth', PASSWORD, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Mot de passe incorrect' });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('kyce_auth');
  res.json({ success: true });
});

app.get('/api/check-auth', authMiddleware, (req, res) => {
  res.json({ authenticated: true });
});

app.get('/api/accounts', authMiddleware, async (req, res) => {
  try {
    const data = await getAllAccounts();
    res.json({
      groups: data,
      lastScan: lastScanTime,
      scanInProgress
    });
  } catch (err) {
    console.error('Error fetching accounts:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des comptes' });
  }
});

app.get('/api/sheet-url', authMiddleware, (req, res) => {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  res.json({ url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit` });
});

app.post('/api/scan', authMiddleware, async (req, res) => {
  if (scanInProgress) {
    return res.json({ message: 'Scan déjà en cours', scanInProgress: true });
  }
  res.json({ message: 'Scan lancé', scanInProgress: true });
  runScan();
});

app.post('/api/accounts/add', authMiddleware, async (req, res) => {
  try {
    const { group, handle } = req.body;
    if (!group || !handle) return res.status(400).json({ error: 'group et handle requis' });
    const cleanHandle = handle.startsWith('@') ? handle : '@' + handle;
    await addAccount(group, cleanHandle);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/accounts/remove', authMiddleware, async (req, res) => {
  try {
    const { group, handle } = req.body;
    if (!group || !handle) return res.status(400).json({ error: 'group et handle requis' });
    await removeAccount(group, handle);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/scan-status', authMiddleware, (req, res) => {
  res.json({ lastScan: lastScanTime, scanInProgress });
});

app.get('/api/crm', authMiddleware, async (req, res) => {
  try {
    const [crmData, accountGroups] = await Promise.all([getCRMData(), getAllAccounts()]);

    const vaMap = {};
    for (const va of crmData) {
      vaMap[va.name] = { ...va, accounts: [], healthStats: { healthy: 0, shadowban: 0, permanent: 0, unknown: 0, warmup: 0, ready: 0, noBio: 0, valid: 0 } };
    }

    const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const group of accountGroups) {
      if (group.name === '_CRM') continue;
      const key = group.name;
      if (!vaMap[key]) {
        vaMap[key] = { name: key, status: 'Unknown', accountCount: 0, lastMessage: '', channelId: '', guildId: '', firstMessage: '', notes: '', accounts: [], healthStats: { healthy: 0, shadowban: 0, permanent: 0, unknown: 0, warmup: 0, ready: 0, noBio: 0, valid: 0 } };
      }
      vaMap[key].accounts = group.accounts;
      vaMap[key].accountCount = group.accounts.length;

      for (const acc of group.accounts) {
        const s = vaMap[key].healthStats;
        if (acc.status === 'Healthy') s.healthy++;
        else if (acc.status === 'Shadowbanned') s.shadowban++;
        else if (acc.status === 'Permanent') s.permanent++;
        else s.unknown++;

        if (acc.bioLink !== 'Oui') s.noBio++;

        const isBanned = acc.status === 'Permanent' || acc.status === 'Shadowbanned';
        if (!isBanned) s.valid++;

        const notes = acc.notes || '';
        const addMatch = notes.match(/Ajoute:(\d{2})\/(\d{2})\/(\d{4})/);
        if (addMatch) {
          const addDate = new Date(parseInt(addMatch[3]), parseInt(addMatch[2]) - 1, parseInt(addMatch[1]));
          if (now - addDate.getTime() < FOUR_DAYS) s.warmup++;
          else if (!isBanned && (!acc.lastTweet || acc.lastTweet === '')) s.ready++;
        } else if (!isBanned && (!acc.lastTweet || acc.lastTweet === '')) {
          s.ready++;
        }
      }
    }

    const vas = Object.values(vaMap).sort((a, b) => {
      const hs = b.healthStats.valid - a.healthStats.valid;
      if (hs !== 0) return hs;
      return b.accountCount - a.accountCount;
    });

    const totalAccounts = vas.reduce((s, v) => s + v.accountCount, 0);
    const totalValid = vas.reduce((s, v) => s + v.healthStats.valid, 0);
    const totalBanned = vas.reduce((s, v) => s + v.healthStats.permanent + v.healthStats.shadowban, 0);
    const warmupTotal = vas.reduce((s, v) => s + v.healthStats.warmup, 0);
    const readyTotal = vas.reduce((s, v) => s + v.healthStats.ready, 0);
    const byCount = {};
    for (let i = 0; i <= 5; i++) byCount[i] = vas.filter(v => v.healthStats.valid === i).length;
    const fivePlus = vas.filter(v => v.healthStats.valid >= 5).length;

    res.json({
      vas,
      stats: { total: vas.length, totalAccounts, totalValid, totalBanned, warmupTotal, readyTotal, byCount, fivePlus }
    });
  } catch (err) {
    console.error('CRM error:', err);
    res.status(500).json({ error: 'Erreur CRM' });
  }
});

app.post('/api/crm/delete', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name requis' });
    const { getSheetNames } = require('./sheets');
    const sheets = require('./sheets');
    const sheetNames = await getSheetNames();
    if (sheetNames.includes(name)) {
      const gs = sheets.batchUpdateSheet ? require('googleapis').google : null;
    }
    const crmData = await getCRMData();
    const idx = crmData.findIndex(v => v.name === name);
    if (idx >= 0) {
      const gSheets = require('./sheets');
      const allSheets = require('googleapis').google;
      const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      let key;
      try { key = JSON.parse(raw); } catch { key = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
      const auth = new allSheets.auth.GoogleAuth({ credentials: key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
      const s = allSheets.sheets({ version: 'v4', auth });
      const crmRes = await s.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: `'_CRM'!A:A` });
      const rows = crmRes.data.values || [];
      const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === name);
      if (rowIdx >= 0) {
        const meta = await s.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
        const sheet = meta.data.sheets.find(sh => sh.properties.title === '_CRM');
        if (sheet) {
          await s.spreadsheets.batchUpdate({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            requestBody: { requests: [{ deleteDimension: { range: { sheetId: sheet.properties.sheetId, dimension: 'ROWS', startIndex: rowIdx, endIndex: rowIdx + 1 } } }] }
          });
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('CRM delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

async function runScan() {
  if (scanInProgress) return;
  scanInProgress = true;
  console.log(`[${new Date().toISOString()}] Scan started...`);
  try {
    await scanAllAccounts();
    lastScanTime = new Date().toISOString();
    console.log(`[${new Date().toISOString()}] Scan completed.`);
  } catch (err) {
    console.error('Scan error:', err);
  } finally {
    scanInProgress = false;
  }
}

// Scan auto toutes les heures
cron.schedule('0 * * * *', () => {
  console.log('Cron: starting hourly scan');
  runScan();
});

// Serve React build in production
if (process.env.NODE_ENV === 'production' || !process.env.NODE_ENV) {
  const buildPath = path.join(__dirname, '..', 'client', 'build');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Kyce Twitter Tracker running on port ${PORT}`);
});
