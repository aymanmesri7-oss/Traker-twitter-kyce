import React, { useState, useEffect, useMemo } from 'react';

const statusConfig = {
  'Actif': { color: '#22c55e', bg: '#052e16', label: 'Actif' },
  'Inactif': { color: '#f97316', bg: '#431407', label: 'Inactif' },
  'Pas de reponse': { color: '#ef4444', bg: '#450a0a', label: 'Pas de reponse' },
  'Unknown': { color: '#78716c', bg: '#1c1917', label: 'Inconnu' }
};

function timeAgo(dateStr) {
  if (!dateStr) return 'jamais';
  const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
  if (!parts) return dateStr;
  const d = new Date(parts[3], parts[2] - 1, parts[1], parts[4], parts[5]);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'a l\'instant';
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  return `il y a ${days}j`;
}

function HealthBar({ stats }) {
  const total = stats.healthy + stats.shadowban + stats.permanent + stats.unknown;
  if (total === 0) return <span style={{ color: '#3f3f46', fontSize: '0.75rem' }}>Aucun compte</span>;

  const segments = [
    { count: stats.healthy, color: '#22c55e', label: 'OK' },
    { count: stats.shadowban, color: '#f97316', label: 'SB' },
    { count: stats.permanent, color: '#ef4444', label: 'Ban' },
    { count: stats.unknown, color: '#78716c', label: '?' }
  ].filter(s => s.count > 0);

  return (
    <div>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ width: `${(s.count / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {segments.map((s, i) => (
          <span key={i} style={{ fontSize: '0.7rem', color: s.color }}>
            {s.count} {s.label}
          </span>
        ))}
        {stats.warmup > 0 && (
          <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>
            {stats.warmup} warm-up
          </span>
        )}
        {stats.noBio > 0 && (
          <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
            {stats.noBio} sans bio
          </span>
        )}
      </div>
    </div>
  );
}

function VACard({ va }) {
  const s = statusConfig[va.status] || statusConfig.Unknown;
  const discordLink = va.channelId && va.guildId
    ? `https://discord.com/channels/${va.guildId}/${va.channelId}`
    : null;

  return (
    <div style={{
      background: '#111114', borderRadius: 12, padding: '16px 20px',
      border: '1px solid #1e1e22', borderLeft: `3px solid ${s.color}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
            <span style={{ color: '#e4e4e7', fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>
              {va.name}
            </span>
          </div>
          <div style={{ color: '#71717a', fontSize: '0.8rem' }}>
            Dernier msg: <strong style={{ color: '#a1a1aa' }}>{timeAgo(va.lastMessage)}</strong>
            {va.notes && <span style={{ marginLeft: 8, color: '#52525b' }}>({va.notes})</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{
            background: s.bg, color: s.color,
            padding: '4px 10px', borderRadius: 8,
            fontSize: '0.7rem', fontWeight: 700
          }}>
            {s.label}
          </span>
          <span style={{
            background: '#1e1e22', color: '#a1a1aa',
            padding: '4px 10px', borderRadius: 8,
            fontSize: '0.7rem', fontWeight: 600
          }}>
            {va.accountCount} comptes
          </span>
        </div>
      </div>

      <HealthBar stats={va.healthStats || { healthy: 0, shadowban: 0, permanent: 0, unknown: 0, warmup: 0, noBio: 0 }} />

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {discordLink && (
          <a
            href={discordLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#5865F2', color: '#fff', border: 'none',
              borderRadius: 8, padding: '6px 14px', fontSize: '0.75rem',
              fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            Discord
          </a>
        )}
        {va.accountCount > 0 && (
          <a
            href={`https://x.com`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#27272a', color: '#a1a1aa', border: 'none',
              borderRadius: 8, padding: '6px 14px', fontSize: '0.75rem',
              fontWeight: 600, cursor: 'pointer', textDecoration: 'none'
            }}
          >
            Voir sur X
          </a>
        )}
      </div>
    </div>
  );
}

function TeamCRM() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/crm')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredVAs = useMemo(() => {
    if (!data) return [];
    let vas = data.vas;
    if (search) {
      vas = vas.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (filter === 'active') vas = vas.filter(v => v.status === 'Actif');
    else if (filter === 'inactive') vas = vas.filter(v => v.status === 'Inactif');
    else if (filter === 'noresponse') vas = vas.filter(v => v.status === 'Pas de reponse');
    else if (filter === 'withaccounts') vas = vas.filter(v => v.accountCount > 0);
    else if (filter === 'noaccounts') vas = vas.filter(v => v.accountCount === 0);
    return vas;
  }, [data, search, filter]);

  if (loading) {
    return <div style={{ color: '#71717a', textAlign: 'center', padding: 60 }}>Chargement CRM...</div>;
  }

  if (!data || !data.vas || data.vas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>&#128101;</div>
        <div style={{ color: '#71717a', marginBottom: 8 }}>Aucune donnee CRM</div>
        <div style={{ color: '#52525b', fontSize: '0.85rem', maxWidth: 400, margin: '0 auto' }}>
          Lance <strong style={{ color: '#a1a1aa' }}>!scan</strong> dans ton serveur Discord pour collecter les donnees de ton equipe.
          Le bot va analyser tous les salons et creer le CRM automatiquement.
        </div>
      </div>
    );
  }

  const stats = data.stats;

  const filterBtn = (key, label, count) => (
    <button
      onClick={() => setFilter(filter === key ? 'all' : key)}
      style={{
        background: filter === key ? '#27272a' : 'transparent',
        color: filter === key ? '#fff' : '#71717a',
        border: '1px solid #27272a', borderRadius: 20,
        padding: '6px 14px', fontSize: '0.75rem',
        fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap'
      }}
    >
      {label} ({count})
    </button>
  );

  return (
    <div>
      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10, marginBottom: 20
      }}>
        {[
          { label: 'TOTAL VAs', value: stats.total, color: '#3b82f6', sub: 'dans l\'equipe' },
          { label: 'ACTIFS', value: stats.active, color: '#22c55e', sub: 'repondent' },
          { label: 'INACTIFS', value: stats.inactive, color: '#f97316', sub: '2-7 jours' },
          { label: 'SANS REPONSE', value: stats.noResponse, color: '#ef4444', sub: '+7 jours' },
          { label: 'ONT ENVOYE', value: stats.withAccounts, color: '#a78bfa', sub: 'leurs comptes' },
          { label: 'PAS ENVOYE', value: stats.withoutAccounts, color: '#f43f5e', sub: 'pas de comptes' },
          { label: 'COMPTES TOTAL', value: stats.totalAccounts, color: '#06b6d4', sub: 'comptes Twitter' }
        ].map(card => (
          <div key={card.label} style={{
            background: '#111114', borderRadius: 12, padding: '14px 16px',
            borderTop: `3px solid ${card.color}`
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#52525b', letterSpacing: '0.05em', marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#3f3f46', marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#18181b', borderRadius: 12,
          padding: '8px 14px', flex: '1 1 200px', maxWidth: 280
        }}>
          <span style={{ color: '#52525b' }}>&#128269;</span>
          <input
            type="text" placeholder="Chercher un VA..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'none', border: 'none', color: '#e4e4e7', fontSize: '0.85rem', outline: 'none', width: '100%' }}
          />
        </div>
        {filterBtn('active', 'Actifs', stats.active)}
        {filterBtn('inactive', 'Inactifs', stats.inactive)}
        {filterBtn('noresponse', 'Sans reponse', stats.noResponse)}
        {filterBtn('withaccounts', 'Ont envoye', stats.withAccounts)}
        {filterBtn('noaccounts', 'Pas envoye', stats.withoutAccounts)}
      </div>

      {/* VA List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredVAs.map(va => (
          <VACard key={va.name} va={va} />
        ))}
      </div>

      {filteredVAs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#3f3f46' }}>
          Aucun VA correspond a ce filtre
        </div>
      )}
    </div>
  );
}

export default TeamCRM;
