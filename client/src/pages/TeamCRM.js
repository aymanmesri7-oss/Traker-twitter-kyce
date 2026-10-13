import React, { useState, useEffect, useMemo } from 'react';

function timeAgo(dateStr) {
  if (!dateStr || dateStr === 'Non' || dateStr === '') return 'jamais';
  const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
  if (!parts) return 'jamais';
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
    { count: stats.warmup, color: '#a78bfa', label: 'Warm-up' },
    { count: stats.ready, color: '#fbbf24', label: 'Pret' },
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
          <span key={i} style={{ fontSize: '0.7rem', color: s.color }}>{s.count} {s.label}</span>
        ))}
      </div>
    </div>
  );
}

function VACard({ va, onDelete }) {
  const valid = va.healthStats?.valid || 0;
  const banned = (va.healthStats?.permanent || 0) + (va.healthStats?.shadowban || 0);
  const warmup = va.healthStats?.warmup || 0;
  const ready = va.healthStats?.ready || 0;

  let borderColor = '#3f3f46';
  let tagLabel = `${valid} valides`;
  let tagColor = '#71717a';
  let tagBg = '#1e1e22';

  if (valid >= 5 && ready > 0) {
    borderColor = '#fbbf24';
    tagLabel = `${ready} pret a poster`;
    tagColor = '#fbbf24';
    tagBg = '#422006';
  } else if (valid >= 5 && warmup > 0) {
    borderColor = '#a78bfa';
    tagLabel = `Warm-up (${warmup})`;
    tagColor = '#a78bfa';
    tagBg = '#2e1065';
  } else if (valid >= 5) {
    borderColor = '#22c55e';
    tagLabel = '5 valides';
    tagColor = '#22c55e';
    tagBg = '#052e16';
  } else if (valid > 0) {
    borderColor = '#3b82f6';
  }

  const discordLink = va.channelId && va.guildId
    ? `https://discord.com/channels/${va.guildId}/${va.channelId}` : null;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{
      background: '#111114', borderRadius: 12, padding: '16px 20px',
      border: '1px solid #1e1e22', borderLeft: `3px solid ${borderColor}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <span style={{ color: '#e4e4e7', fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>
            {va.name}
          </span>
          <div style={{ color: '#71717a', fontSize: '0.78rem', marginTop: 2 }}>
            Dernier msg: <strong style={{ color: '#a1a1aa' }}>{timeAgo(va.lastMessage)}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{
            background: tagBg, color: tagColor,
            padding: '4px 10px', borderRadius: 8,
            fontSize: '0.7rem', fontWeight: 700
          }}>{tagLabel}</span>
          {banned > 0 && (
            <span style={{
              background: '#450a0a', color: '#ef4444',
              padding: '4px 8px', borderRadius: 8,
              fontSize: '0.65rem', fontWeight: 600
            }}>{banned} ban</span>
          )}
          <span style={{
            background: '#1e1e22', color: '#a1a1aa',
            padding: '4px 10px', borderRadius: 8,
            fontSize: '0.7rem', fontWeight: 600
          }}>{va.accountCount} total</span>
        </div>
      </div>

      <HealthBar stats={va.healthStats || { healthy: 0, shadowban: 0, permanent: 0, unknown: 0, warmup: 0, ready: 0, noBio: 0, valid: 0 }} />

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {discordLink && (
            <a href={discordLink} target="_blank" rel="noopener noreferrer"
              style={{ background: '#5865F2', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
              Discord
            </a>
          )}
        </div>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: '0.75rem', padding: '4px 8px' }}
            title="Supprimer">&#10005;</button>
        ) : (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => { onDelete(va.name); setConfirmDelete(false); }}
              style={{ background: '#450a0a', border: '1px solid #991b1b', color: '#ef4444', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>
              Confirmer
            </button>
            <button onClick={() => setConfirmDelete(false)}
              style={{ background: '#27272a', border: 'none', color: '#71717a', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
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

  const reload = () => {
    fetch('/api/crm').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const handleDelete = async (name) => {
    try {
      await fetch('/api/crm/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      reload();
    } catch {}
  };

  const filteredVAs = useMemo(() => {
    if (!data) return [];
    let vas = data.vas;
    if (search) vas = vas.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

    if (filter === '0') vas = vas.filter(v => (v.healthStats?.valid || 0) === 0);
    else if (filter === '1') vas = vas.filter(v => (v.healthStats?.valid || 0) === 1);
    else if (filter === '2') vas = vas.filter(v => (v.healthStats?.valid || 0) === 2);
    else if (filter === '3') vas = vas.filter(v => (v.healthStats?.valid || 0) === 3);
    else if (filter === '4') vas = vas.filter(v => (v.healthStats?.valid || 0) === 4);
    else if (filter === '5') vas = vas.filter(v => (v.healthStats?.valid || 0) >= 5);
    else if (filter === 'warmup') vas = vas.filter(v => (v.healthStats?.warmup || 0) > 0);
    else if (filter === 'ready') vas = vas.filter(v => (v.healthStats?.ready || 0) > 0);
    else if (filter === 'posted') vas = vas.filter(v => (v.healthStats?.valid || 0) >= 5 && (v.healthStats?.warmup || 0) === 0 && (v.healthStats?.ready || 0) === 0);

    return vas;
  }, [data, search, filter]);

  if (loading || !data) {
    return <div style={{ color: '#71717a', textAlign: 'center', padding: 60 }}>Chargement CRM...</div>;
  }

  if (!data.vas || data.vas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ color: '#71717a', marginBottom: 8 }}>Aucune donnee CRM</div>
        <div style={{ color: '#52525b', fontSize: '0.85rem' }}>Le bot collecte les donnees automatiquement au demarrage.</div>
      </div>
    );
  }

  const st = data.stats;
  const bc = st.byCount || {};

  const Stat = ({ label, value, color, sub }) => (
    <div style={{ background: '#111114', borderRadius: 12, padding: '14px 16px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#52525b', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: '#3f3f46', marginTop: 2 }}>{sub}</div>
    </div>
  );

  const Btn = ({ k, label, count, color }) => (
    <button
      onClick={() => setFilter(filter === k ? 'all' : k)}
      style={{
        background: filter === k ? color : '#1e1e22',
        color: filter === k ? '#000' : '#71717a',
        border: 'none', borderRadius: 20,
        padding: '6px 14px', fontSize: '0.75rem',
        fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
      }}>
      {label} <strong>({count})</strong>
    </button>
  );

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
        <Stat label="TOTAL VAs" value={st.total} color="#3b82f6" sub="dans l'equipe" />
        <Stat label="COMPTES VALIDES" value={st.totalValid} color="#22c55e" sub={`${st.totalBanned} bans exclus`} />
        <Stat label="WARM-UP" value={st.warmupTotal} color="#a78bfa" sub="comptes < 4 jours" />
        <Stat label="PRET A POSTER" value={st.readyTotal} color="#fbbf24" sub="apres warm-up" />
        <Stat label="5 COMPTES+" value={st.fivePlus} color="#06b6d4" sub="VAs prets" />
        <Stat label="TOTAL COMPTES" value={st.totalAccounts} color="#78716c" sub="tous comptes" />
      </div>

      {/* Pipeline: par nombre de comptes valides */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#52525b', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8 }}>PAR COMPTES VALIDES (hors ban)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <Btn k="all" label="Tous" count={st.total} color="#3b82f6" />
          <Btn k="0" label="0 compte" count={bc[0] || 0} color="#ef4444" />
          <Btn k="1" label="1 compte" count={bc[1] || 0} color="#f97316" />
          <Btn k="2" label="2 comptes" count={bc[2] || 0} color="#f97316" />
          <Btn k="3" label="3 comptes" count={bc[3] || 0} color="#eab308" />
          <Btn k="4" label="4 comptes" count={bc[4] || 0} color="#eab308" />
          <Btn k="5" label="5+ comptes" count={st.fivePlus || 0} color="#22c55e" />
        </div>
      </div>

      {/* Pipeline: statut */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#52525b', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8 }}>PIPELINE</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <Btn k="warmup" label="En warm-up" count={data.vas.filter(v => (v.healthStats?.warmup || 0) > 0).length} color="#a78bfa" />
          <Btn k="ready" label="Doit poster" count={data.vas.filter(v => (v.healthStats?.ready || 0) > 0).length} color="#fbbf24" />
          <Btn k="posted" label="A poste" count={data.vas.filter(v => (v.healthStats?.valid || 0) >= 5 && (v.healthStats?.warmup || 0) === 0 && (v.healthStats?.ready || 0) === 0).length} color="#22c55e" />
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#18181b', borderRadius: 12, padding: '8px 14px', maxWidth: 300, marginBottom: 12 }}>
        <span style={{ color: '#52525b' }}>&#128269;</span>
        <input
          type="text" placeholder="Chercher un VA..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: 'none', border: 'none', color: '#e4e4e7', fontSize: '0.85rem', outline: 'none', width: '100%' }}
        />
      </div>

      {/* Count */}
      <div style={{ color: '#52525b', fontSize: '0.75rem', marginBottom: 8 }}>
        {filteredVAs.length} VA{filteredVAs.length > 1 ? 's' : ''} affiche{filteredVAs.length > 1 ? 's' : ''}
      </div>

      {/* VA List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredVAs.map(va => (
          <VACard key={va.name} va={va} onDelete={handleDelete} />
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
