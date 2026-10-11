require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const cron = require('node-cron');
const { getAllAccounts, getSheetNames, writeAccountData, addAccount, removeAccount } = require('./sheets');
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

cron.schedule('0 * * * *', () => {
  console.log('Cron: starting hourly scan');
  runScan();
});

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
