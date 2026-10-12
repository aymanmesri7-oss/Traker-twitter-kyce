import React, { useState, useEffect } from 'react';

function timeAgo(isoString) {
  if (!isoString) return 'never';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h${mins % 60}m ago`;
}

function nextScanIn(isoString) {
  if (!isoString) return '';
  const lastScanDate = new Date(isoString);
  const nextScan = new Date(lastScanDate.getTime() + 60 * 60 * 1000);
  const diff = nextScan.getTime() - Date.now();
  if (diff <= 0) return 'soon';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `~${mins}m`;
  return `~${Math.floor(mins / 60)}h`;
}

function ScanBar({ lastScan, scanInProgress, total }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const lastScanDate = lastScan ? new Date(lastScan) : null;
  const dateStr = lastScanDate
    ? lastScanDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: scanInProgress ? '#f97316' : '#22c55e',
        display: 'inline-block',
        animation: scanInProgress ? 'pulse 1.5s infinite' : 'none'
      }} />
      <span style={{ color: '#71717a', fontSize: '0.8rem' }}>
        Last scan: <strong style={{ color: '#a1a1aa' }}>{scanInProgress ? 'scanning...' : timeAgo(lastScan)}</strong>
        {dateStr && !scanInProgress && <span> ({dateStr})</span>}
        {total > 0 && <span> · {total}/{total} accounts</span>}
        {lastScan && !scanInProgress && <span> · next in {nextScanIn(lastScan)}</span>}
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default ScanBar;
