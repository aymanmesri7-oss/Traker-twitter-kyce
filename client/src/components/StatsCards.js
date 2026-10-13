import React from 'react';

const cards = [
  { key: 'total', label: 'TOTAL', color: '#3b82f6', border: '#2563eb', subKey: 'total', suffix: 'accounts' },
  { key: 'healthy', label: 'HEALTHY', color: '#22c55e', border: '#16a34a', subKey: 'healthy', pctOf: 'total', suffix: 'OK' },
  { key: 'shadowban', label: 'SHADOWBAN', color: '#f97316', border: '#ea580c', subKey: 'shadowban', suffix: 'recoverable' },
  { key: 'permanent', label: 'PERMANENT', color: '#ef4444', border: '#dc2626', subKey: 'permanent', suffix: 'suspended / ban', icon: true },
  { key: 'inactive', label: 'INACTIVE 7D+', color: '#71717a', border: '#52525b', subKey: 'inactive', suffix2: 'neverTweeted', suffixLabel: 'never tweeted' },
];

function StatsCards({ stats }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 10,
      marginBottom: 16
    }}>
      {cards.map(card => {
        const value = stats[card.subKey] || 0;
        let subtitle = card.suffix || '';
        if (card.pctOf) {
          const pct = stats[card.pctOf] > 0 ? Math.round((value / stats[card.pctOf]) * 100) : 0;
          subtitle = `${pct}% ${card.suffix}`;
        }
        if (card.suffix2) {
          subtitle = `${stats[card.suffix2] || 0} ${card.suffixLabel}`;
        }

        return (
          <div key={card.key} style={{
            background: '#18181b', borderRadius: 14, padding: '14px 16px',
            borderTop: `3px solid ${card.border}`
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#71717a', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              {card.icon && <span style={{ color: card.color }}>&#9888;</span>}
              {card.label}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 2 }}>
              {value}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#52525b' }}>{subtitle}</div>
          </div>
        );
      })}
    </div>
  );
}

export default StatsCards;
