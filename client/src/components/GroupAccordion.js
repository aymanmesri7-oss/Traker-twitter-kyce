import React, { useState } from 'react';
import AccountRow from './AccountRow';
import AccountCard from './AccountCard';

function GroupAccordion({ group, viewMode, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      background: '#111114',
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid #1e1e22'
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', padding: '16px 20px',
          background: 'transparent', border: 'none', color: '#e4e4e7',
          cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700,
          letterSpacing: '0.02em', textTransform: 'uppercase'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'inline-block',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            fontSize: '0.7rem'
          }}>&#9654;</span>
          <span>{group.name}</span>
          <span style={{
            height: 3, width: 40, borderRadius: 2,
            background: '#3b82f6', display: 'inline-block', marginLeft: 4
          }} />
        </div>
        <span style={{ color: '#52525b', fontWeight: 400, fontSize: '0.85rem' }}>
          {group.accounts.length} accounts
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 12px 16px' }}>
          {group.accounts.length === 0 ? (
            <div style={{ color: '#3f3f46', textAlign: 'center', padding: 20, fontSize: '0.85rem' }}>
              Aucun compte dans ce groupe
            </div>
          ) : viewMode === 'cards' ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 10
            }}>
              {group.accounts.map(a => (
                <AccountCard key={a.handle} account={a} onRemove={() => onRemove(group.name, a.handle)} />
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Handle', 'Statut', 'Dernier tweet', 'Bio link', 'Followers', 'Following', 'Dernière vérif.', ''].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '8px 12px',
                        color: '#52525b', fontSize: '0.7rem', fontWeight: 600,
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                        borderBottom: '1px solid #1e1e22'
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.accounts.map(a => (
                    <AccountRow key={a.handle} account={a} onRemove={() => onRemove(group.name, a.handle)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onAdd(group.name); }}
            style={{
              marginTop: 10, background: '#1e1e22', color: '#71717a',
              border: '1px dashed #3f3f46', borderRadius: 8,
              padding: '8px 16px', cursor: 'pointer', fontSize: '0.8rem',
              width: '100%'
            }}
          >
            + Ajouter un compte
          </button>
        </div>
      )}
    </div>
  );
}

export default GroupAccordion;
