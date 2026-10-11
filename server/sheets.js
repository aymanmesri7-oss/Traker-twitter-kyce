const { google } = require('googleapis');

function getAuth() {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  let key;
  try { key = JSON.parse(raw); } catch { key = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

async function getSheetNames() {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID
  });
  return res.data.sheets.map(s => s.properties.title);
}

async function getAllAccounts() {
  const sheets = getSheets();
  const sheetNames = await getSheetNames();
  const ranges = sheetNames.map(name => `'${name}'!A:H`);

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    ranges
  });

  return sheetNames.map((name, i) => {
    const rows = res.data.valueRanges[i]?.values || [];
    if (rows.length <= 1) return { name, accounts: [] };

    const accounts = rows.slice(1).map(row => ({
      handle: row[0] || '',
      status: row[1] || 'Unknown',
      lastTweet: row[2] || '',
      bioLink: row[3] || 'Non',
      followers: parseInt(row[4]) || 0,
      following: parseInt(row[5]) || 0,
      lastCheck: row[6] || '',
      notes: row[7] || ''
    })).filter(a => a.handle);

    return { name, accounts };
  });
}

async function writeAccountData(sheetName, rowIndex, data) {
  const sheets = getSheets();
  const row = rowIndex + 2;
  const range = `'${sheetName}'!A${row}:H${row}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        data.handle,
        data.status,
        data.lastTweet,
        data.bioLink,
        data.followers,
        data.following,
        data.lastCheck,
        data.notes || ''
      ]]
    }
  });
}

async function batchUpdateSheet(sheetName, accounts) {
  const sheets = getSheets();
  const updates = accounts.map((data, i) => ({
    range: `'${sheetName}'!A${i + 2}:H${i + 2}`,
    values: [[
      data.handle,
      data.status,
      data.lastTweet,
      data.bioLink,
      data.followers,
      data.following,
      data.lastCheck,
      data.notes || ''
    ]]
  }));

  if (updates.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates
    }
  });
}

async function addAccount(sheetName, handle) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `'${sheetName}'!A:H`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[handle, 'Unknown', '', 'Non', 0, 0, '', '']]
    }
  });
}

async function removeAccount(sheetName, handle) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `'${sheetName}'!A:A`
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === handle);
  if (rowIndex === -1) throw new Error('Compte non trouvé');

  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
  const sheet = sheetMeta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error('Onglet non trouvé');

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1
          }
        }
      }]
    }
  });
}

module.exports = { getSheetNames, getAllAccounts, writeAccountData, batchUpdateSheet, addAccount, removeAccount };
