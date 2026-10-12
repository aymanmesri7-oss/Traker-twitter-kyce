import React from 'react';

const filterBtnStyle = (active) => ({
  background: active ? '#27272a' : 'transparent',
  color: active ? '#fff' : '#71717a',
  border: '1px solid #27272a',
  borderRadius: 20,
  padding: '6px 14px',
  fontSize: '0.75rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap'
});

function Filters({ search, onSearch, activeFilter, onFilter, sortBy, onSort, viewMode, onViewMode }) {
  const toggleFilter = (f) => onFilter(activeFilter === f ? null : f);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#18181b', borderRadius: 12,
        padding: '8px 14px', flex: '1 1 200px', maxWidth: 280
      }}>
        <span style={{ color: '#52525b' }}>&#128269;</span>
        <input
          type="text"
          placeholder="Search @handle..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          style={{ background: 'none', border: 'none', color: '#e4e4e7', fontSize: '0.85rem', outline: 'none', width: '100%' }}
        />
      </div>

      <select value={sortBy} onChange={e => onSort(e.target.value)}
        style={{ background: '#18181b', color: '#a1a1aa', border: '1px solid #27272a', borderRadius: 12, padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', outline: 'none' }}>
        <option value="default">Default</option>
        <option value="handle">Par handle</option>
        <option value="status">Par statut</option>
        <option value="lastTweet">Par dernier tweet</option>
      </select>

      <button style={filterBtnStyle(activeFilter === 'shadowban')} onClick={() => toggleFilter('shadowban')}>
        Shadowban
      </button>
      <button style={filterBtnStyle(activeFilter === 'inactive')} onClick={() => toggleFilter('inactive')}>
        Inactive &gt;7j
      </button>
      <button style={filterBtnStyle(activeFilter === 'nobio')} onClick={() => toggleFilter('nobio')}>
        Sans lien bio
      </button>
      <button style={filterBtnStyle(activeFilter === 'warmup')} onClick={() => toggleFilter('warmup')}>
        Warm-up
      </button>
      <button style={filterBtnStyle(viewMode === 'cards')} onClick={() => onViewMode(viewMode === 'cards' ? 'list' : 'cards')}>
        Cards
      </button>
    </div>
  );
}

export default Filters;
