require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { google } = require('googleapis');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function getSheets() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

// Extract @handles from x.com or twitter.com links
function extractHandles(text) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/(@?[\w]+)/gi;
  const handles = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    let handle = match[1];
    // Skip non-profile paths
    if (['home', 'search', 'explore', 'notifications', 'messages', 'settings', 'i', 'intent'].includes(handle.toLowerCase())) continue;
    if (!handle.startsWith('@')) handle = '@' + handle;
    handles.push(handle);
  }
  return handles;
}

// Get or create a sheet tab for a VA
async function ensureVATab(sheets, vaName) {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existing = res.data.sheets.map(s => s.properties.title);

  if (existing.includes(vaName)) return;

  // Create tab + headers
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: vaName } } }]
    }
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${vaName}'!A1:H1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['Handle', 'Statut', 'Dernier tweet', 'Lien bio', 'Followers', 'Abonnements', 'Dernière vérification', 'Notes']]
    }
  });
}

// Check if handle already exists in VA tab
async function handleExists(sheets, vaName, handle) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'${vaName}'!A:A`
    });
    const rows = res.data.values || [];
    return rows.some(r => r[0] && r[0].toLowerCase() === handle.toLowerCase());
  } catch {
    return false;
  }
}

// Add handle to VA tab
async function addHandle(sheets, vaName, handle) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${vaName}'!A:H`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[handle, 'Unknown', '', 'Non', 0, 0, '', '']]
    }
  });
}

client.on('ready', () => {
  console.log(`Bot connecté: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const handles = extractHandles(message.content);
  if (handles.length === 0) return;

  const sheets = getSheets();
  // VA name = Discord display name, cleaned up
  const vaName = message.author.displayName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 30) || message.author.username.toLowerCase();

  try {
    await ensureVATab(sheets, vaName);

    const added = [];
    const skipped = [];

    for (const handle of handles) {
      if (await handleExists(sheets, vaName, handle)) {
        skipped.push(handle);
      } else {
        await addHandle(sheets, vaName, handle);
        added.push(handle);
      }
    }

    // Reply
    let reply = '';
    if (added.length > 0) reply += `✅ Ajouté au dashboard Kyce : ${added.join(', ')}`;
    if (skipped.length > 0) reply += `\n⚠️ Déjà enregistré : ${skipped.join(', ')}`;

    await message.reply(reply.trim());
  } catch (err) {
    console.error('Erreur:', err.message);
    await message.reply('❌ Erreur lors de l\'ajout du compte.');
  }
});

client.login(process.env.DISCORD_TOKEN);
