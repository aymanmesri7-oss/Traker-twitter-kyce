import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StatsCards from '../components/StatsCards';
import Filters from '../components/Filters';
import GroupAccordion from '../components/GroupAccordion';
import ScanBar from '../components/ScanBar';

function Dashboard({ onLogout }) {
  const [groups, setGroups] = useState([]);
  const [lastScan, setLastScan] = useState(null);
  const [scanInProgress, setScanInProgress] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('list');
  const [loading, setLoading] = useState(true);
  const [sheetUrl, setSheetUrl] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      if (data.groups) setGroups(data.groups.filter(g => g.name !== '_CRM'));
      if (data.lastScan) setLastScan(data.lastScan);
      setScanInProgress(!!data.scanInProgress);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    fetchData();
    fetch('/api/sheet-url').then(r => r.json()).then(d => setSheetUrl(d.url)).catch(() => {});
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const allAccounts = useMemo(() =>
    groups.flatMap(g => g.accounts.map(a => ({ ...a, group: g.name }))),
    [groups]
  );

  const stats = useMemo(() => {
    const total = allAccounts.length;
    const healthy = allAccounts.filter(a => a.status === 'Healthy').length;
    const shadowban = allAccounts.filter(a => a.status === 'Shadowbanned').length;
    const permanent = allAccounts.filter(a => a.status === 'Permanent').length;
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const inactive = allAccounts.filter(a => {
      if (!a.lastTweet) return true;
      return new Date(a.lastTweet) < sevenDaysAgo;
    }).length;
    const neverTweeted = allAccounts.filter(a => !a.lastTweet).length;
    const noBioLink = allAccounts.filter(a => a.bioLink !== 'Oui').length;

    return { total, healthy, shadowban, permanent, inactive, neverTweeted, noBioLink };
  }, [allAccounts]);

  const filteredGroups = useMemo(() => {
    return groups.map(g => {
      let accounts = g.accounts;

      if (search) {
        accounts = accounts.filter(a =>
          a.handle.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (activeFilter === 'shadowban') {
        accounts = accounts.filter(a => a.status === 'Shadowbanned' || a.status === 'Permanent');
      } else if (activeFilter === 'inactive') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        accounts = accounts.filter(a => !a.lastTweet || new Date(a.lastTweet) < sevenDaysAgo);
      } else if (activeFilter === 'nobio') {
        accounts = accounts.filter(a => a.bioLink !== 'Oui');
      }

      if (sortBy === 'handle') {
        accounts = [...accounts].sort((a, b) => a.handle.localeCompare(b.handle));
      } else if (sortBy === 'status') {
        const order = { Permanent: 0, Shadowbanned: 1, Unknown: 2, Healthy: 3 };
        accounts = [...accounts].sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));
      } else if (sortBy === 'lastTweet') {
        accounts = [...accounts].sort((a, b) => {
          if (!a.lastTweet) return 1;
          if (!b.lastTweet) return -1;
          return new Date(b.lastTweet) - new Date(a.lastTweet);
        });
      }

      return { ...g, accounts };
    }).filter(g => g.accounts.length > 0 || !search);
  }, [groups, search, activeFilter, sortBy]);

  const handleScan = async () => {
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const data = await res.json();
      setScanInProgress(!!data.scanInProgress);
      if (!data.scanInProgress) setScanInProgress(true);
    } catch {}
  };

  const handleAddAccount = async (group) => {
    const handle = prompt(`Ajouter un compte au groupe "${group}" :\nEntrez le @handle`);
    if (!handle) return;
    try {
      await fetch('/api/accounts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, handle })
      });
      fetchData();
    } catch {}
  };

  const handleRemoveAccount = async (group, handle) => {
    if (!window.confirm(`Supprimer ${handle} du groupe "${group}" ?`)) return;
    try {
      await fetch('/api/accounts/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, handle })
      });
      fetchData();
    } catch {}
  };

  if (loading) {
    return <div style={{ color: '#71717a', textAlign: 'center', padding: 60 }}>Chargement des comptes...</div>;
  }

  return (
    <div>
      {/* Sub-header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <ScanBar lastScan={lastScan} scanInProgress={scanInProgress} total={stats.total} />
        <div style={{ display: 'flex', gap: 8 }}>
          {sheetUrl && (
            <a href={sheetUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
              Google Sheet
            </a>
          )}
          <button onClick={handleScan} disabled={scanInProgress}
            style={{ background: scanInProgress ? '#1e1e22' : '#2563eb', color: scanInProgress ? '#52525b' : '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: scanInProgress ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            {scanInProgress ? 'Scan en cours...' : 'Lancer Scan'}
          </button>
          <button onClick={fetchData}
            style={{ background: '#27272a', color: '#a1a1aa', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
            title="Rafraichir">
            &#8635;
          </button>
        </div>
      </div>

      <StatsCards stats={stats} />

      <Filters
        search={search} onSearch={setSearch}
        activeFilter={activeFilter} onFilter={setActiveFilter}
        sortBy={sortBy} onSort={setSortBy}
        viewMode={viewMode} onViewMode={setViewMode}
        scanInProgress={scanInProgress} onScan={handleScan}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredGroups.map(group => (
          <GroupAccordion key={group.name} group={group} viewMode={viewMode} onAdd={handleAddAccount} onRemove={handleRemoveAccount} />
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
