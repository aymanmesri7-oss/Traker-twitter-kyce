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

function extractHandles(text) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/(@?[\w]+)/gi;
  const handles = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    let handle = match[1];
    if (['home', 'search', 'explore', 'notifications', 'messages', 'settings', 'i', 'intent', 'hashtag', 'compose', 'login', 'signup'].includes(handle.toLowerCase())) continue;
    if (!handle.startsWith('@')) handle = '@' + handle;
    handles.push(handle);
  }
  return handles;
}

async function ensureVATab(sheets, vaName, existingTabs) {
  if (existingTabs.includes(vaName)) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: vaName } } }] }
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${vaName}'!A1:H1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['Handle', 'Statut', 'Dernier tweet', 'Lien bio', 'Followers', 'Abonnements', 'Dernière vérification', 'Notes']] }
  });
  existingTabs.push(vaName);
}

async function getExistingHandles(sheets, vaName) {
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${vaName}'!A:A` });
    return (res.data.values || []).map(r => (r[0] || '').toLowerCase());
  } catch { return []; }
}

client.on('ready', () => {
  console.log(`Bot connecté: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.trim() === '!scan') {
    await message.reply('🔍 Scan de tous les salons en cours...');
    console.log('!scan lancé');

    try {
      const channels = message.guild.channels.cache.filter(c => c.isTextBased() && !c.isThread());
      console.log(`${channels.size} salons à scanner`);

      // Phase 1: collect all handles from all channels (no API calls)
      const vaHandles = {}; // { vaName: Set of handles }
      let channelsScanned = 0;

      for (const [, channel] of channels) {
        try { await channel.messages.fetch({ limit: 1 }); } catch { continue; }
        channelsScanned++;
        let lastId = null;

        while (true) {
          const options = { limit: 100 };
          if (lastId) options.before = lastId;
          let msgs;
          try { msgs = await channel.messages.fetch(options); } catch { break; }
          if (msgs.size === 0) break;

          for (const [, msg] of msgs) {
            if (msg.author.bot) continue;
            const handles = extractHandles(msg.content);
            if (handles.length === 0) continue;

            const vaName = msg.author.displayName
              .toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 30) || msg.author.username.toLowerCase();

            if (!vaHandles[vaName]) vaHandles[vaName] = new Set();
            handles.forEach(h => vaHandles[vaName].add(h.toLowerCase()));
          }

          lastId = msgs.last().id;
          if (msgs.size < 100) break;
        }
        console.log(`Salon ${channelsScanned}/${channels.size} scanné`);
      }

      console.log(`Phase 1 finie: ${Object.keys(vaHandles).length} VAs, ${Object.values(vaHandles).reduce((a, s) => a + s.size, 0)} handles trouvés`);

      // Phase 2: write to Google Sheets (batch per VA)
      const sheets = getSheets();
      const tabsRes = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
      const existingTabs = tabsRes.data.sheets.map(s => s.properties.title);
      let totalAdded = 0;

      for (const [vaName, handleSet] of Object.entries(vaHandles)) {
        await ensureVATab(sheets, vaName, existingTabs);
        const existing = await getExistingHandles(sheets, vaName);
        const newHandles = [...handleSet].filter(h => !existing.includes(h));

        if (newHandles.length > 0) {
          const rows = newHandles.map(h => [h, 'Unknown', '', 'Non', 0, 0, '', '']);
          await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: `'${vaName}'!A:H`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: rows }
          });
          totalAdded += newHandles.length;
          console.log(`${vaName}: +${newHandles.length} comptes`);
        }
      }

      console.log(`Scan terminé: ${channelsScanned} salons, ${totalAdded} ajoutés`);
      await message.reply(`✅ Scan terminé ! ${channelsScanned} salons scannés, ${totalAdded} nouveau(x) compte(s) ajouté(s).`);
    } catch (err) {
      console.error('Scan error:', err.message);
      await message.reply('❌ Erreur pendant le scan: ' + err.message);
    }
    return;
  }

  const handles = extractHandles(message.content);
  if (handles.length === 0) return;

  const sheets = getSheets();
  const vaName = message.author.displayName
    .toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 30) || message.author.username.toLowerCase();

  try {
    const tabsRes = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const existingTabs = tabsRes.data.sheets.map(s => s.properties.title);
    await ensureVATab(sheets, vaName, existingTabs);

    const existing = await getExistingHandles(sheets, vaName);
    const added = [];
    const skipped = [];

    for (const handle of handles) {
      if (existing.includes(handle.toLowerCase())) {
        skipped.push(handle);
      } else {
        added.push(handle);
      }
    }

    if (added.length > 0) {
      const rows = added.map(h => [h, 'Unknown', '', 'Non', 0, 0, '', '']);
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `'${vaName}'!A:H`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
      });
    }

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
