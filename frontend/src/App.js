import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Html5QrcodeScanner } from 'html5-qrcode';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://vinyl-inventory-api.fly.dev/api';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchInventory();
    }
  }, [session]);

  const fetchInventory = async () => {
    const { data: { session } } = supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`${API_BASE_URL}/inventory`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const data = await res.json();
    if (Array.isArray(data)) setInventory(data);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('Check your email for confirmation!');
  };

  const handleSearch = async (searchQuery, type = 'barcode') => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/search?query=${encodeURIComponent(searchQuery)}&type=${type}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      alert('Search failed: ' + err.message);
    }
    setLoading(false);
  };

  const saveRelease = async (releaseId, barcode, force = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${API_BASE_URL}/inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ releaseId, barcode, forceDuplicate: force })
    });
    const result = await res.json();
    if (result.duplicate) {
      if (window.confirm(`Duplicate record found for ${result.existing.artist} - ${result.existing.title}. Save anyway?`)) {
        saveRelease(releaseId, barcode, true);
      }
      return;
    }
    if (result.success) {
      alert('Successfully added to inventory!');
      setSearchResults([]);
      fetchInventory();
    }
  };

  if (!session) {
    return (
      <div style={{ maxWidth: 400, margin: '50px auto', padding: 20, fontFamily: 'sans-serif' }}>
        <h2>Vinyl Inventory Login</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" style={{ padding: 10, background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4 }}>Login</button>
          <button type="button" onClick={handleSignUp} style={{ padding: 10, background: '#34a853', color: '#fff', border: 'none', borderRadius: 4 }}>Sign Up</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>My Vinyl Collection</h2>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: '6px 12px' }}>Sign Out</button>
      </div>

      <div style={{ margin: '20px 0', padding: 15, background: '#f9f9f9', borderRadius: 8 }}>
        <h3>Add New Record</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <input 
            type="text" 
            placeholder="Search barcode or artist/album..." 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            style={{ flex: 1, padding: 8 }}
          />
          <button onClick={() => handleSearch(query, 'q')} style={{ padding: '8px 16px' }}>Search</button>
        </div>
        {loading && <p>Searching Discogs...</p>}
        <div style={{ marginTop: 10 }}>
          {searchResults.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#fff', padding: 8, marginTop: 5, borderRadius: 4, border: '1px solid #ddd' }}>
              <img src={item.thumb || 'https://via.placeholder.com/50'} alt="" width="50" height="50" style={{ objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>
                <strong>{item.title}</strong><br />
                <small>{item.year} • {item.country}</small>
              </div>
              <button onClick={() => saveRelease(item.id, query)} style={{ background: '#0f9d58', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4 }}>Save</button>
            </div>
          ))}
        </div>
      </div>

      <h3>Inventory ({inventory.length} records)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
        <thead>
          <tr style={{ background: '#eee', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Cover</th>
            <th style={{ padding: 8 }}>Artist & Title</th>
            <th style={{ padding: 8 }}>Format / Size / RPM</th>
            <th style={{ padding: 8 }}>Label</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map(item => (
            <tr key={item.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: 8 }}><img src={item.cover_url || 'https://via.placeholder.com/40'} alt="" width="40" height="40" style={{ objectFit: 'cover' }} /></td>
              <td style={{ padding: 8 }}><strong>{item.artist}</strong><br />{item.title} ({item.year})</td>
              <td style={{ padding: 8 }}>{item.format}<br /><small>{item.disc_size} / {item.rpm}</small></td>
              <td style={{ padding: 8 }}>{item.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
