import React, { useState } from 'react';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0a0a0f',
    padding: '20px'
  },
  logo: {
    fontSize: '2.5rem',
    fontWeight: 800,
    color: '#fff',
    marginBottom: '8px',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    color: '#71717a',
    fontSize: '0.95rem',
    marginBottom: '40px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    maxWidth: '360px'
  },
  input: {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '12px',
    padding: '14px 18px',
    color: '#e4e4e7',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  button: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  error: {
    color: '#ef4444',
    fontSize: '0.875rem',
    textAlign: 'center'
  }
};

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        onLogin();
      } else {
        setError('Mot de passe incorrect');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.logo}>Kyce.</div>
      <div style={styles.subtitle}>Twitter Tracker</div>
      <form style={styles.form} onSubmit={handleSubmit}>
        <input
          style={styles.input}
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
        />
        <button
          style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
          type="submit"
          disabled={loading}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        {error && <div style={styles.error}>{error}</div>}
      </form>
    </div>
  );
}

export default Login;
