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

  // !scan command — scan ALL text channels in the server
  if (message.content.trim() === '!scan') {
    await message.reply('🔍 Scan de tous les salons en cours...');
    const sheets = getSheets();
    let totalAdded = 0;
    let channelsScanned = 0;

    try {
      const channels = message.guild.channels.cache.filter(c => c.isTextBased() && !c.isThread());

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
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, '')
              .substring(0, 30) || msg.author.username.toLowerCase();

            await ensureVATab(sheets, vaName);

            for (const handle of handles) {
              if (!(await handleExists(sheets, vaName, handle))) {
                await addHandle(sheets, vaName, handle);
                totalAdded++;
              }
            }
          }

          lastId = msgs.last().id;
          if (msgs.size < 100) break;
        }
      }

      await message.reply(`✅ Scan terminé ! ${channelsScanned} salons scannés, ${totalAdded} nouveau(x) compte(s) ajouté(s).`);
    } catch (err) {
      console.error('Scan error:', err.message);
      await message.reply('❌ Erreur pendant le scan.');
    }
    return;
  }

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
