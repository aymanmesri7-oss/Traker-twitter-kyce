require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');
const { google } = require('googleapis');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function getSheets() {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  let key;
  try { key = JSON.parse(raw); } catch { key = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
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
    requestBody: { values: [['Handle', 'Statut', 'Dernier tweet', 'Lien bio', 'Followers', 'Abonnements', 'Derniere verification', 'Notes']] }
  });
  existingTabs.push(vaName);
}

async function getExistingHandles(sheets, vaName) {
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${vaName}'!A:A` });
    return (res.data.values || []).map(r => (r[0] || '').toLowerCase());
  } catch { return []; }
}

async function ensureCRMTab(sheets, existingTabs) {
  if (existingTabs.includes('_CRM')) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: '_CRM' } } }] }
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'_CRM'!A1:H1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['VA', 'Statut', 'Comptes', 'Dernier message', 'Channel ID', 'Guild ID', 'Premier message', 'Notes']] }
  });
  existingTabs.push('_CRM');
}

function fmtDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

const VA_CATEGORY_BASE = 'Salon perso';
const VA_CATEGORY_ID = '1557159985803305040';
const MAX_PER_CATEGORY = 49;

async function findOrCreateCategory(guild) {
  const categories = guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory && (c.id === VA_CATEGORY_ID || c.name.startsWith(VA_CATEGORY_BASE)))
    .sort((a, b) => a.position - b.position);

  for (const [, cat] of categories) {
    const count = guild.channels.cache.filter(c => c.parentId === cat.id).size;
    if (count < MAX_PER_CATEGORY) return cat;
  }

  const num = categories.size + 1;
  const newCat = await guild.channels.create({
    name: `${VA_CATEGORY_BASE} ${num}`,
    type: ChannelType.GuildCategory
  });
  console.log(`Categorie creee: ${newCat.name}`);
  return newCat;
}

async function createPrivateChannel(guild, member, ownerId) {
  const channelName = (member.displayName || member.user.username)
    .toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 30) || member.user.username.toLowerCase();
  const allSalonPerso = guild.channels.cache.filter(c =>
    c.type === ChannelType.GuildText && c.name === channelName &&
    (c.parentId === VA_CATEGORY_ID || guild.channels.cache.get(c.parentId)?.name?.startsWith(VA_CATEGORY_BASE))
  );
  if (allSalonPerso.size > 0) return null;

  const category = await findOrCreateCategory(guild);
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      { id: ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ]
  });
  await channel.send(`Bienvenue ${member} ! Envoie tes comptes Twitter/X ici (liens x.com ou twitter.com).`);
  return channel;
}

async function runFullScan(guild) {
  const guildId = guild.id;
  const vaActivity = {};
  const vaHandles = {};

  // Fetch all members + create missing channels
  try {
    await guild.channels.fetch();
    const allMembers = await guild.members.fetch();
    let channelsCreated = 0;
    for (const [, member] of allMembers) {
      if (member.user.bot) continue;
      const vaName = (member.displayName || member.user.username)
        .toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 30) || member.user.username.toLowerCase();
      if (!vaName) continue;
      vaActivity[vaName] = {
        lastMessage: null, firstMessage: null, guildId,
        messageCount: 0, channelCounts: {}, joinedAt: member.joinedAt
      };
      // ponytail: channel creation disabled on startup, use !scan to create manually if needed
    }
    console.log(`${allMembers.size} membres, ${Object.keys(vaActivity).length} VAs, ${channelsCreated} salons crees`);
  } catch (e) { console.log('GuildMembers fallback:', e.message); }

  // Scan messages
  const channels = guild.channels.cache.filter(c => c.isTextBased() && !c.isThread());
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
        const vaName = (msg.member?.displayName || msg.author.displayName || msg.author.username)
          .toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 30) || msg.author.username.toLowerCase();
        if (!vaActivity[vaName]) {
          vaActivity[vaName] = { lastMessage: msg.createdAt, firstMessage: msg.createdAt, guildId, messageCount: 0, channelCounts: {}, joinedAt: null };
        }
        const va = vaActivity[vaName];
        va.messageCount++;
        va.channelCounts[channel.id] = (va.channelCounts[channel.id] || 0) + 1;
        if (!va.lastMessage || msg.createdAt > va.lastMessage) va.lastMessage = msg.createdAt;
        if (!va.firstMessage || msg.createdAt < va.firstMessage) va.firstMessage = msg.createdAt;
        const handles = extractHandles(msg.content);
        if (handles.length === 0) continue;
        if (!vaHandles[vaName]) vaHandles[vaName] = new Set();
        handles.forEach(h => vaHandles[vaName].add(h.toLowerCase()));
      }
      lastId = msgs.last().id;
      if (msgs.size < 100) break;
    }
    console.log(`Salon ${channelsScanned}/${channels.size}`);
  }

  // Write accounts to sheets
  const sheets = getSheets();
  const tabsRes = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingTabs = tabsRes.data.sheets.map(s => s.properties.title);
  let totalAdded = 0;

  for (const [vaName, handleSet] of Object.entries(vaHandles)) {
    await ensureVATab(sheets, vaName, existingTabs);
    const existing = await getExistingHandles(sheets, vaName);
    const newHandles = [...handleSet].filter(h => !existing.includes(h));
    if (newHandles.length > 0) {
      const now = new Date();
      const tag = `Ajoute:${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID, range: `'${vaName}'!A:H`, valueInputOption: 'USER_ENTERED',
        requestBody: { values: newHandles.map(h => [h, 'Unknown', '', 'Non', 0, 0, '', tag]) }
      });
      totalAdded += newHandles.length;
    }
  }

  // Write CRM
  await ensureCRMTab(sheets, existingTabs);
  const now = new Date();
  const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  const crmRows = Object.entries(vaActivity).map(([name, va]) => {
    let status;
    if (!va.lastMessage) status = 'Pas de reponse';
    else if (now - va.lastMessage < TWO_DAYS) status = 'Actif';
    else if (now - va.lastMessage < SEVEN_DAYS) status = 'Inactif';
    else status = 'Pas de reponse';
    const mainChannel = Object.entries(va.channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const accountCount = vaHandles[name] ? vaHandles[name].size : 0;
    return [name, status, accountCount, va.lastMessage ? fmtDate(va.lastMessage) : '', mainChannel, va.guildId, va.firstMessage ? fmtDate(va.firstMessage) : '', va.messageCount > 0 ? `${va.messageCount} msgs` : 'jamais poste'];
  });

  try { await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `'_CRM'!A2:H1000` }); } catch {}
  if (crmRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID, range: `'_CRM'!A2:H${crmRows.length + 1}`, valueInputOption: 'USER_ENTERED',
      requestBody: { values: crmRows }
    });
  }

  const active = crmRows.filter(r => r[1] === 'Actif').length;
  const inactive = crmRows.filter(r => r[1] === 'Inactif').length;
  const noResp = crmRows.filter(r => r[1] === 'Pas de reponse').length;
  const withAccounts = crmRows.filter(r => r[2] > 0).length;
  console.log(`Scan fini: ${crmRows.length} VAs, ${active} actifs, ${inactive} inactifs, ${noResp} sans reponse, ${withAccounts} avec comptes`);
  return { channelsScanned, totalAdded, crmRows, active, inactive, noResp, withAccounts };
}

async function cleanDuplicates(guild) {
  await guild.channels.fetch();
  const salonCats = guild.channels.cache.filter(c =>
    c.type === ChannelType.GuildCategory && (c.id === VA_CATEGORY_ID || c.name.startsWith(VA_CATEGORY_BASE))
  );
  const catIds = new Set(salonCats.map(c => c.id));
  const salonChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText && catIds.has(c.parentId));

  const byName = {};
  for (const [, ch] of salonChannels) {
    if (!byName[ch.name]) byName[ch.name] = [];
    byName[ch.name].push(ch);
  }

  let deleted = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const [name, channels] of Object.entries(byName)) {
    if (channels.length <= 1) continue;
    channels.sort((a, b) => a.createdAt - b.createdAt);
    for (let i = 1; i < channels.length; i++) {
      if (channels[i].createdAt >= today) {
        await channels[i].delete();
        deleted++;
        console.log(`Doublon supprime: ${name}`);
      }
    }
  }

  await guild.channels.fetch();
  for (const [, cat] of salonCats) {
    if (cat.id === VA_CATEGORY_ID) continue;
    const remaining = guild.channels.cache.filter(c => c.parentId === cat.id).size;
    if (remaining === 0) { await cat.delete(); console.log(`Categorie vide supprimee: ${cat.name}`); }
  }
  console.log(`Clean: ${deleted} doublons supprimes`);
}

client.on('ready', async () => {
  console.log(`Bot connecte: ${client.user.tag}`);
  for (const [, guild] of client.guilds.cache) {
    try { await cleanDuplicates(guild); } catch (e) { console.error('Clean erreur:', e.message); }
    try { await runFullScan(guild); } catch (e) { console.error('Scan auto erreur:', e.message); }
  }
});

client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;
  try {
    const ownerId = member.guild.ownerId;
    const channel = await createPrivateChannel(member.guild, member, ownerId);
    if (channel) console.log(`Salon prive cree: ${channel.name}`);
  } catch (e) {
    console.error('Erreur creation salon:', e.message);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.trim() === '!clean') {
    try { await message.delete(); } catch {}
    const dm = await message.author.createDM();
    await dm.send('Suppression des doublons en cours...');
    try {
      await message.guild.channels.fetch();
      const originalNames = new Set(
        message.guild.channels.cache
          .filter(c => c.parentId === VA_CATEGORY_ID)
          .map(c => c.name)
      );
      const extraCats = message.guild.channels.cache.filter(c =>
        c.type === ChannelType.GuildCategory && c.id !== VA_CATEGORY_ID && c.name.startsWith(VA_CATEGORY_BASE)
      );
      let deleted = 0;
      for (const [, cat] of extraCats) {
        const children = message.guild.channels.cache.filter(c => c.parentId === cat.id);
        for (const [, ch] of children) {
          if (originalNames.has(ch.name)) {
            await ch.delete();
            deleted++;
          }
        }
        const remaining = message.guild.channels.cache.filter(c => c.parentId === cat.id).size;
        if (remaining === 0) await cat.delete();
      }
      await dm.send(`${deleted} doublons supprimes.`);
    } catch (err) {
      await dm.send('Erreur: ' + err.message);
    }
    return;
  }

  if (message.content.trim() === '!scan') {
    try { await message.delete(); } catch {}
    const dm = await message.author.createDM();
    await dm.send('Scan complet en cours (comptes + CRM equipe)...');
    try {
      const r = await runFullScan(message.guild);
      await dm.send(
        `Scan termine !\n` +
        `${r.channelsScanned} salons | ${r.totalAdded} nouveau(x) compte(s)\n` +
        `${r.crmRows.length} VAs: ${r.active} actifs, ${r.inactive} inactifs, ${r.noResp} sans reponse\n` +
        `${r.withAccounts} ont envoye leurs comptes | ${r.crmRows.length - r.withAccounts} n'ont pas encore repondu`
      );
    } catch (err) {
      console.error('Scan error:', err.message);
      await dm.send('Erreur pendant le scan: ' + err.message);
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
      const now = new Date();
      const tag = `Ajoute:${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
      const rows = added.map(h => [h, 'Unknown', '', 'Non', 0, 0, '', tag]);
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `'${vaName}'!A:H`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
      });
    }

    if (added.length > 0) console.log(`${vaName}: +${added.length} comptes`);
  } catch (err) {
    console.error('Erreur:', err.message);
    console.error('Erreur ajout compte:', err.message);
  }
});

client.login(process.env.DISCORD_TOKEN);
