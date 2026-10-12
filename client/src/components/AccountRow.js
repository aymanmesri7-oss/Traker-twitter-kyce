import React from 'react';

const statusColors = {
  Healthy: { bg: '#052e16', text: '#22c55e', label: 'Healthy' },
  Shadowbanned: { bg: '#431407', text: '#f97316', label: 'Shadowban' },
  Permanent: { bg: '#450a0a', text: '#ef4444', label: 'Permanent' },
  Unknown: { bg: '#1c1917', text: '#78716c', label: 'Unknown' }
};

function isInactive(lastTweet) {
  if (!lastTweet) return true;
  return (Date.now() - new Date(lastTweet).getTime()) > 7 * 24 * 60 * 60 * 1000;
}

function isWarmup(notes) {
  const m = (notes || '').match(/Ajoute:(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return false;
  const addDate = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  return (Date.now() - addDate.getTime()) < 4 * 24 * 60 * 60 * 1000;
}

function AccountRow({ account, onRemove }) {
  const s = statusColors[account.status] || statusColors.Unknown;
  const inactive = isInactive(account.lastTweet);
  const warmup = isWarmup(account.notes);
  const handle = account.handle.startsWith('@') ? account.handle : `@${account.handle}`;

  const warmupAlert = warmup && account.bioLink === 'Oui';

  return (
    <tr style={{ borderBottom: '1px solid #1a1a1e' }}>
      <td style={{ padding: '8px 10px' }}>
        <a href={`https://x.com/${handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
          style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem' }}>
          {handle}
        </a>
      </td>
      <td style={{ padding: '8px 10px' }}>
        <span style={{ background: s.bg, color: s.text, padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 }}>
          {s.label}
        </span>
        {warmup && (
          <span style={{ background: '#2e1065', color: '#a78bfa', padding: '2px 6px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600, marginLeft: 4 }}>
            WARM-UP
          </span>
        )}
        {warmupAlert && (
          <span style={{ background: '#450a0a', color: '#ef4444', padding: '2px 6px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600, marginLeft: 4 }}>
            BIO TROP TOT!
          </span>
        )}
      </td>
      <td style={{ padding: '8px 10px', fontSize: '0.8rem', color: inactive ? '#ef4444' : '#a1a1aa' }}>
        {account.lastTweet || '-'}
      </td>
      <td style={{ padding: '8px 10px', fontSize: '0.8rem' }}>
        {account.bioLink === 'Oui'
          ? <span style={{ color: '#22c55e' }}>Oui</span>
          : <span style={{ color: '#ef4444' }}>Non</span>}
      </td>
      <td style={{ padding: '8px 10px', color: '#a1a1aa', fontSize: '0.8rem' }}>{account.followers.toLocaleString()}</td>
      <td style={{ padding: '8px 10px', color: '#71717a', fontSize: '0.8rem' }}>{account.following.toLocaleString()}</td>
      <td style={{ padding: '8px 10px', color: '#52525b', fontSize: '0.7rem' }}>{account.lastCheck || '-'}</td>
      <td style={{ padding: '4px 6px' }}>
        <button onClick={onRemove}
          style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: '0.9rem', padding: '2px 6px', borderRadius: 6 }}
          title="Supprimer">
          &#10005;
        </button>
      </td>
    </tr>
  );
}

export default AccountRow;
