import React from 'react';

const statusColors = {
  Healthy: { bg: '#052e16', text: '#22c55e', border: '#166534' },
  Shadowbanned: { bg: '#431407', text: '#f97316', border: '#9a3412' },
  Permanent: { bg: '#450a0a', text: '#ef4444', border: '#991b1b' },
  Unknown: { bg: '#1c1917', text: '#78716c', border: '#44403c' }
};

function isWarmup(notes) {
  const m = (notes || '').match(/Ajoute:(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return false;
  const addDate = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  return (Date.now() - addDate.getTime()) < 4 * 24 * 60 * 60 * 1000;
}

function AccountCard({ account, onRemove }) {
  const s = statusColors[account.status] || statusColors.Unknown;
  const handle = account.handle.startsWith('@') ? account.handle : `@${account.handle}`;
  const warmup = isWarmup(account.notes);
  const warmupAlert = warmup && account.bioLink === 'Oui';

  return (
    <div style={{ background: '#18181b', borderRadius: 12, padding: 14, borderLeft: `3px solid ${s.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <a href={`https://x.com/${handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
          style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
          {handle}
        </a>
        <div style={{ display: 'flex', gap: 4 }}>
          {warmup && (
            <span style={{ background: '#2e1065', color: '#a78bfa', padding: '2px 6px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600 }}>
              WARM-UP
            </span>
          )}
          <span style={{ background: s.bg, color: s.text, padding: '2px 6px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600 }}>
            {account.status}
          </span>
        </div>
      </div>
      {warmupAlert && (
        <div style={{ background: '#450a0a', border: '1px solid #991b1b', borderRadius: 6, padding: '4px 8px', marginBottom: 6, color: '#ef4444', fontSize: '0.7rem', fontWeight: 600 }}>
          ALERTE: Lien bio ajoute trop tot pendant warm-up !
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '0.75rem' }}>
        <div style={{ color: '#71717a' }}>Followers: <span style={{ color: '#a1a1aa' }}>{account.followers.toLocaleString()}</span></div>
        <div style={{ color: '#71717a' }}>Following: <span style={{ color: '#a1a1aa' }}>{account.following.toLocaleString()}</span></div>
        <div style={{ color: '#71717a' }}>Bio: {account.bioLink === 'Oui' ? <span style={{ color: '#22c55e' }}>Oui</span> : <span style={{ color: '#ef4444' }}>Non</span>}</div>
        <div style={{ color: '#71717a' }}>Tweet: <span style={{ color: '#a1a1aa' }}>{account.lastTweet || '-'}</span></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
        <button onClick={onRemove}
          style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 6px' }}
          title="Supprimer">
          &#10005;
        </button>
      </div>
    </div>
  );
}

export default AccountCard;
