const https = require('https');
const { getAllAccounts, batchUpdateSheet } = require('./sheets');

function httpGet(hostname, path, port) {
  const parts = hostname.split(':');
  const host = parts[0];
  const p = port || (parts[1] ? parseInt(parts[1]) : 443);
  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname: host, port: p, path,
      headers: { 'User-Agent': 'Twitterbot/1.0', 'Accept': 'text/html,application/xhtml+xml' },
      timeout: 15000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 && res.headers.location) {
        const url = new URL(res.headers.location);
        return httpGet(url.hostname, url.pathname + url.search).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function getMeta(html, name) {
  const patterns = [
    new RegExp('(?:name|property)="' + name + '"[^>]*content="([^"]*)"', 'i'),
    new RegExp('content="([^"]*)"[^>]*(?:name|property)="' + name + '"', 'i')
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

async function scrapeProfile(handle) {
  const cleanHandle = handle.replace('@', '');
  let followers = 0, following = 0, lastTweet = '', bioLink = 'Non', status = 'Unknown';

  try {
    const res = await httpGet('x.com', '/' + cleanHandle);

    if (res.status === 404) {
      return { followers: 0, following: 0, lastTweet: '', bioLink: 'Non', status: 'Permanent' };
    }

    if (res.status !== 200) {
      return { followers: 0, following: 0, lastTweet: '', bioLink: 'Non', status: 'Permanent' };
    }

    const html = res.data;

    // Check suspension
    if (html.includes('suspended') && html.includes('account')) {
      return { followers: 0, following: 0, lastTweet: '', bioLink: 'Non', status: 'Permanent' };
    }

    // Account exists check
    const title = getMeta(html, 'og:title') || getMeta(html, 'twitter:title');
    if (title && title.includes('on X')) {
      status = 'Healthy';
    } else {
      // ponytail: 200 without "on X" title = banned/suspended account that X still serves a shell page for
      return { followers: 0, following: 0, lastTweet: '', bioLink: 'Non', status: 'Permanent' };
    }

    // Posts count
    const postsStr = getMeta(html, 'twitter:data1');
    const posts = postsStr ? parseInt(postsStr.replace(/,/g, '')) : 0;

    // Bio / description
    const description = getMeta(html, 'twitter:description') || getMeta(html, 'og:description') || '';
    const decodedDesc = description
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    // Bio link detection — only real link services in the description
    const linkServices = ['onlyfans', 'linktr', 'beacons', 'allmylinks', 'fansly', 'fanfix', 'getmysocial', 'fanvue', 'linkin.bio', 'campsite.bio', 'hoo.be', 'solo.to'];
    const lowerDesc = decodedDesc.toLowerCase();
    if (linkServices.some(s => lowerDesc.includes(s))) {
      bioLink = 'Oui';
    }

    // Try to get last tweet date from the profile page
    // X embeds some data for the Twitterbot crawler
    const dateMatches = html.match(/datetime="(\d{4}-\d{2}-\d{2})/g);
    if (dateMatches && dateMatches.length > 0) {
      const dateStr = dateMatches[0].replace('datetime="', '');
      lastTweet = dateStr;
    }

    // Joined date as fallback info
    const joinedStr = getMeta(html, 'twitter:data2');

    return { followers, following, lastTweet, bioLink, status, posts, joinedStr };
  } catch (err) {
    console.error(`  Scrape error for ${cleanHandle}: ${err.message}`);
    return { followers: 0, following: 0, lastTweet: '', bioLink: 'Non', status: 'Permanent' };
  }
}

async function checkShadowban(handle) {
  const cleanHandle = handle.replace('@', '');
  try {
    const res = await httpGet('shadowban-api.yuzurisa.com:444', '/' + cleanHandle);
    if (res.status === 200) {
      const data = JSON.parse(res.data);
      if (!data.profile || !data.profile.exists) return 'Permanent';
      if (data.profile.suspended) return 'Permanent';
      const t = data.tests || {};
      if (t.ghost?.ban || t.more_replies?.ban || t.search === false || t.typeahead === false) return 'Shadowbanned';
    }
  } catch (err) {
    console.error(`  Shadowban check error for ${cleanHandle}: ${err.message}`);
  }
  return null;
}

async function scanAllAccounts() {
  const groups = await getAllAccounts();
  let totalScanned = 0;

  for (const group of groups) {
    if (group.accounts.length === 0) continue;

    const updatedAccounts = [];

    for (const account of group.accounts) {
      // Wait between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, 2500));

      console.log(`Scanning ${account.handle}...`);
      totalScanned++;

      try {
        const data = await scrapeProfile(account.handle);

        let finalStatus = data.status;
        if (finalStatus === 'Healthy') {
          await new Promise(r => setTimeout(r, 1000));
          const sbResult = await checkShadowban(account.handle);
          if (sbResult) finalStatus = sbResult;
        }

        const now = new Date();
        const lastCheck = `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

        updatedAccounts.push({
          handle: account.handle,
          status: finalStatus,
          lastTweet: data.lastTweet || account.lastTweet,
          bioLink: data.bioLink,
          followers: data.followers || account.followers,
          following: data.following || account.following,
          lastCheck,
          notes: account.notes
        });

        console.log(`  -> ${finalStatus} | Bio: ${data.bioLink} | Posts: ${data.posts || 'N/A'} | Last tweet: ${data.lastTweet || 'N/A'}`);
      } catch (err) {
        console.error(`  -> Error: ${err.message}`);
        updatedAccounts.push(account);
      }
    }

    await batchUpdateSheet(group.name, updatedAccounts);
    console.log(`Updated ${updatedAccounts.length} accounts in "${group.name}"`);
  }

  console.log(`Scan complete. ${totalScanned} accounts processed.`);
}

module.exports = { scanAllAccounts };
