const https = require('https');
const { getAllAccounts, batchUpdateSheet } = require('./sheets');

function httpGet(hostname, path) {
  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname,
      path,
      headers: {
        'User-Agent': 'Twitterbot/1.0',
        'Accept': 'text/html,application/xhtml+xml'
      },
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

    if (html.includes('suspended') && html.includes('account')) {
      return { followers: 0, following: 0, lastTweet: '', bioLink: 'Non', status: 'Permanent' };
    }

    const title = getMeta(html, 'og:title') || getMeta(html, 'twitter:title');
    if (title && title.includes('on X')) {
      status = 'Healthy';
    } else {
      return { followers: 0, following: 0, lastTweet: '', bioLink: 'Non', status: 'Permanent' };
    }

    const postsStr = getMeta(html, 'twitter:data1');
    const posts = postsStr ? parseInt(postsStr.replace(/,/g, '')) : 0;

    const description = getMeta(html, 'twitter:description') || getMeta(html, 'og:description') || '';
    const decodedDesc = description
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    const linkServices = ['onlyfans', 'linktr', 'beacons', 'allmylinks', 'fansly', 'fanfix', 'getmysocial', 'fanvue', 'linkin.bio', 'campsite.bio', 'hoo.be', 'solo.to'];
    const lowerDesc = decodedDesc.toLowerCase();
    if (linkServices.some(s => lowerDesc.includes(s))) {
      bioLink = 'Oui';
    }

    const dateMatches = html.match(/datetime="(\d{4}-\d{2}-\d{2})/g);
    if (dateMatches && dateMatches.length > 0) {
      const dateStr = dateMatches[0].replace('datetime="', '');
      lastTweet = dateStr;
    }

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
    const searchRes = await httpGet('x.com', '/search?q=from%3A' + cleanHandle + '&src=typed_query&f=live');
    if (searchRes.status === 200) {
      if (searchRes.data.includes('No results') || searchRes.data.includes('没有结果')) {
        return 'Shadowbanned';
      }
    }
  } catch (err) {}
  return null;
}

async function scanAllAccounts() {
  const groups = await getAllAccounts();
  let totalScanned = 0;

  for (const group of groups) {
    if (group.accounts.length === 0) continue;

    const updatedAccounts = [];

    for (const account of group.accounts) {
      await new Promise(r => setTimeout(r, 2500));

      console.log(`Scanning ${account.handle}...`);
      totalScanned++;

      try {
        const data = await scrapeProfile(account.handle);

        const now = new Date();
        const lastCheck = `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

        updatedAccounts.push({
          handle: account.handle,
          status: data.status,
          lastTweet: data.lastTweet || account.lastTweet,
          bioLink: data.bioLink,
          followers: data.followers || account.followers,
          following: data.following || account.following,
          lastCheck,
          notes: account.notes
        });

        console.log(`  -> ${data.status} | Bio: ${data.bioLink} | Posts: ${data.posts || 'N/A'} | Last tweet: ${data.lastTweet || 'N/A'}`);
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
