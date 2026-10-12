import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TeamCRM from './pages/TeamCRM';
import GuidePage from './pages/GuidePage';

const navStyle = {
  display: 'flex', gap: 0, background: '#111114',
  borderRadius: 12, padding: 3, marginBottom: 0
};

const navBtn = (active) => ({
  background: active ? '#2563eb' : 'transparent',
  color: active ? '#fff' : '#71717a',
  border: 'none', borderRadius: 10,
  padding: '10px 20px', fontSize: '0.85rem',
  fontWeight: 600, cursor: 'pointer',
  transition: 'all 0.2s'
});

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');

  useEffect(() => {
    fetch('/api/check-auth')
      .then(res => { if (res.ok) setAuthenticated(true); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f', color: '#71717a' }}>
        Chargement...
      </div>
    );
  }

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setAuthenticated(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', padding: '20px 20px 60px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header + Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', margin: 0 }}>
              Kyce.
            </h1>
            <div style={navStyle}>
              <button style={navBtn(page === 'dashboard')} onClick={() => setPage('dashboard')}>Comptes</button>
              <button style={navBtn(page === 'crm')} onClick={() => setPage('crm')}>Equipe</button>
              <button style={navBtn(page === 'guide')} onClick={() => setPage('guide')}>Guide</button>
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: '#27272a', color: '#a1a1aa', border: 'none', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: '0.8rem' }}>
            Deconnexion
          </button>
        </div>

        {page === 'dashboard' && <Dashboard onLogout={() => setAuthenticated(false)} />}
        {page === 'crm' && <TeamCRM />}
        {page === 'guide' && <GuidePage />}
      </div>
    </div>
  );
}

export default App;
