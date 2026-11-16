import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Html5QrcodeScanner } from 'html5-qrcode';
import './App.css';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://vinyl-inventory-api.fly.dev/api';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const HIDDEN_DETAIL_KEYS = new Set(['id', 'user_id', 'cover_url']);

const THEME = {
  bgPage: '#f6f3fb',
  bgCard: '#ffffff',
  bgSubtle: '#f1ecfa',
  primary: '#6d28d9',
  primaryDark: '#4c1d95',
  primaryLight: '#ede9fe',
  accent: '#9333ea',
  border: '#ddd6fe',
  textMain: '#1e1b4b',
  textMuted: '#6b7280',
  danger: '#dc2626'
};

const VINYL_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" rx="12" fill="#2e1065"/>
      <circle cx="50" cy="50" r="40" fill="#18181b" stroke="#7c3aed" stroke-width="2"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="#3f3f46" stroke-width="1"/>
      <circle cx="50" cy="50" r="22" fill="none" stroke="#3f3f46" stroke-width="1"/>
      <circle cx="50" cy="50" r="14" fill="#8b5cf6"/>
      <circle cx="50" cy="50" r="4" fill="#f6f3fb"/>
    </svg>
  `);

const VinylHeroArt = ({ size = 64, active = false }) => (
  <svg
    className={`vinyl-disc ${active ? 'is-spinning' : ''}`}
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <circle cx="60" cy="60" r="56" fill="#1e1b4b" stroke="#a78bfa" strokeWidth="3" />
    <circle cx="60" cy="60" r="46" stroke="#4c1d95" strokeWidth="1.5" strokeDasharray="18 8" />
    <circle cx="60" cy="60" r="36" stroke="#5b21b6" strokeWidth="1.5" strokeDasharray="24 10" />
    <circle cx="60" cy="60" r="26" stroke="#6d28d9" strokeWidth="1.5" />
    <circle cx="60" cy="60" r="19" fill="url(#purpleLabel)" />
    <circle cx="60" cy="60" r="5" fill="#f6f3fb" />
    <defs>
      <linearGradient id="purpleLabel" x1="41" y1="41" x2="79" y2="79" gradientUnits="userSpaceOnUse">
        <stop stopColor="#c084fc" />
        <stop offset="1" stopColor="#6d28d9" />
      </linearGradient>
    </defs>
  </svg>
);

const MusicBarsArt = ({ active = false }) => (
  <svg
    className={`eq-bars ${active ? 'is-active' : ''}`}
    width="42"
    height="28"
    viewBox="0 0 42 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="2" y="12" width="4" height="14" rx="2" fill="#c4b5fd" />
    <rect x="9" y="4" width="4" height="22" rx="2" fill="#a78bfa" />
    <rect x="16" y="9" width="4" height="17" rx="2" fill="#ddd6fe" />
    <rect x="23" y="2" width="4" height="24" rx="2" fill="#c084fc" />
    <rect x="30" y="10" width="4" height="16" rx="2" fill="#a78bfa" />
    <rect x="37" y="6" width="4" height="20" rx="2" fill="#ede9fe" />
  </svg>
);

export default function App() {
  const [session, setSession] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'profile'
  const [inventory, setInventory] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  // Profile & Security states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Collection filter states
  const [filterText, setFilterText] = useState('');
  const [filterFormat, setFilterFormat] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsGuest(!!session?.user?.is_anonymous);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsGuest(!!session?.user?.is_anonymous);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchInventory();
    }
  }, [session]);

  useEffect(() => {
    if (!session || !showScanner) return;

    const scanner = new Html5QrcodeScanner(
      'reader',
      { 
        fps: 15, 
        qrbox: { width: 280, height: 140 },
        aspectRatio: 1.777778 
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setQuery(decodedText);
        setShowScanner(false);
        handleSearch(decodedText, 'barcode');
        scanner.clear().catch(() => {});
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [session, showScanner]);

  const fetchInventory = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`${API_BASE_URL}/inventory`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (res.status === 401) {
        await supabase.auth.signOut();
        return;
      }

      const data = await res.json();
      if (Array.isArray(data)) setInventory(data);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showToast(error.message, 'error');
    else showToast('Welcome back!');
  };

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) showToast(error.message, 'error');
    else showToast('Check your email for confirmation!');
  };

  const handleGuestLogin = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) showToast(error.message, 'error');
    else showToast('Signed in as Guest');
  };

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
      showToast('Signed out successfully.');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);

    if (error) {
      showToast('Failed to update password: ' + error.message, 'error');
    } else {
      showToast('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleLogicalAccountDeletion = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE_URL}/profile/deactivate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      showToast('Your account has been deactivated.');
      await supabase.auth.signOut();
    } catch (err) {
      showToast('Failed to delete account: ' + err.message, 'error');
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  };

  const handleSearch = async (searchQuery, type = 'barcode') => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setHasSearched(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(
        `${API_BASE_URL}/inventory/search?query=${encodeURIComponent(searchQuery)}&type=${type}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` }
        }
      );

      if (res.status === 401) {
        await supabase.auth.signOut();
        return;
      }

      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Search failed: ' + err.message, 'error');
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

    if (res.status === 401) {
      await supabase.auth.signOut();
      return;
    }

    const result = await res.json();
    if (result.duplicate) {
      if (window.confirm(`Duplicate record found for ${result.existing.artist} - ${result.existing.title}. Save anyway?`)) {
        saveRelease(releaseId, barcode, true);
      }
      return;
    }
    if (result.success) {
      showToast('Successfully added to inventory!');
      setSearchResults([]);
      setHasSearched(false);
      setQuery('');
      fetchInventory();
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Remove "${item.artist || 'Unknown'} - ${item.title || 'Untitled'}" from your collection?`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE_URL}/inventory/${item.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (res.status === 401) {
        await supabase.auth.signOut();
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      setInventory((prev) => prev.filter((row) => row.id !== item.id));
      setExpandedRows((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      showToast('Record removed from shelf.');
    } catch (err) {
      showToast('Failed to delete record: ' + err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const stats = useMemo(() => {
    const total = inventory.length;
    if (total === 0) {
      return { total: 0, uniqueArtists: 0, formatShare: [], topDecade: '—', topLabel: '—' };
    }

    const artists = new Set();
    const formatCounts = {};
    const decadeCounts = {};
    const labelCounts = {};

    inventory.forEach((item) => {
      if (item.artist) artists.add(item.artist.trim());

      const fmt = (item.format || item.disc_size || 'Unknown').trim();
      formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;

      if (item.year && !isNaN(Number(item.year))) {
        const decade = `${Math.floor(Number(item.year) / 10) * 10}s`;
        decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
      }

      if (item.label) {
        const lbl = item.label.trim();
        labelCounts[lbl] = (labelCounts[lbl] || 0) + 1;
      }
    });

    const formatShare = Object.entries(formatCounts)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    const topDecade = Object.entries(decadeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const topLabel = Object.entries(labelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return {
      total,
      uniqueArtists: artists.size,
      formatShare,
      topDecade,
      topLabel
    };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const term = filterText.trim().toLowerCase();

    return inventory.filter((item) => {
      const itemFormat = (item.format || item.disc_size || 'Unknown').trim();
      if (filterFormat !== 'ALL' && itemFormat !== filterFormat) {
        return false;
      }

      if (!term) return true;

      const searchableValues = [
        item.artist,
        item.title,
        item.label,
        item.barcode,
        item.catno,
        item.year,
        item.country,
        Array.isArray(item.genre) ? item.genre.join(' ') : item.genre,
        Array.isArray(item.style) ? item.style.join(' ') : item.style
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableValues.includes(term);
    });
  }, [inventory, filterText, filterFormat]);

  const formatFieldLabel = (key) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const formatFieldValue = (val) => {
    if (val === null || val === undefined || val === '') return '—';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const barColors = ['#6d28d9', '#9333ea', '#c026d3', '#4f46e5', '#db2777', '#7c3aed'];
  const isActivityRunning = loading || showScanner;

  if (!session) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: `radial-gradient(circle at top right, #ede9fe 0%, ${THEME.bgPage} 55%, #e9d5ff 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            background: THEME.bgCard,
            borderRadius: 16,
            padding: '32px 28px',
            boxShadow: '0 12px 32px rgba(76, 29, 149, 0.12)',
            border: `1px solid ${THEME.border}`,
            textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <VinylHeroArt size={76} active={false} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: THEME.accent, textTransform: 'uppercase' }}>
            Crate &amp; Catalog
          </div>
          <h2 style={{ margin: '4px 0 8px 0', color: THEME.textMain, letterSpacing: '0.03em' }}>
            YOUR MUSIC COLLECTION
          </h2>
          <p style={{ margin: '0 0 22px 0', fontSize: 13, color: THEME.textMuted }}>
            Scan barcodes, catalog pressings, and track your shelves.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            <input
              className="purple-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: '11px 14px',
                borderRadius: 8,
                border: `1px solid ${THEME.border}`,
                fontSize: 14
              }}
            />
            <input
              className="purple-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                padding: '11px 14px',
                borderRadius: 8,
                border: `1px solid ${THEME.border}`,
                fontSize: 14
              }}
            />
            <button
              className="btn-interactive"
              type="submit"
              style={{
                padding: 12,
                background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.accent} 100%)`,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                marginTop: 4
              }}
            >
              Sign In
            </button>
            <button
              className="btn-interactive"
              type="button"
              onClick={handleSignUp}
              style={{
                padding: 11,
                background: THEME.primaryLight,
                color: THEME.primaryDark,
                border: `1px solid ${THEME.border}`,
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              Create Account
            </button>
            <button
              className="btn-interactive"
              type="button"
              onClick={handleGuestLogin}
              style={{
                padding: 11,
                background: 'transparent',
                color: THEME.primary,
                border: `1px dashed ${THEME.primary}`,
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                marginTop: 2
              }}
            >
              Continue as Guest (Test Mode)
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: THEME.bgPage,
        padding: '24px 16px 60px 16px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: THEME.textMain
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Purple Hero Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${THEME.primaryDark} 0%, ${THEME.primary} 55%, ${THEME.accent} 100%)`,
            borderRadius: 16,
            padding: '22px 26px',
            color: '#fff',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 24,
            boxShadow: '0 10px 25px rgba(76, 29, 149, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: -35,
              top: -35,
              width: 170,
              height: 170,
              borderRadius: '50%',
              border: '18px solid rgba(255, 255, 255, 0.06)',
              pointerEvents: 'none'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 1 }}>
            <VinylHeroArt size={62} active={isActivityRunning} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#ddd6fe', textTransform: 'uppercase' }}>
                  Analog Archive
                </span>
                {isGuest && (
                  <span
                    style={{
                      background: '#f59e0b',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 999,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase'
                    }}
                  >
                    Guest Mode
                  </span>
                )}
                <MusicBarsArt active={isActivityRunning} />
              </div>
              <h1 style={{ margin: '2px 0 0 0', fontSize: 24, fontWeight: 800, letterSpacing: '0.04em' }}>
                YOUR MUSIC COLLECTION
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', zIndex: 1 }}>
            <button
              className="btn-interactive"
              onClick={() => setActiveTab(activeTab === 'inventory' ? 'profile' : 'inventory')}
              style={{
                padding: '8px 14px',
                background: activeTab === 'profile' ? '#fff' : 'rgba(255, 255, 255, 0.2)',
                color: activeTab === 'profile' ? THEME.primaryDark : '#fff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              {activeTab === 'inventory' ? '⚙️ My Profile' : '← Back to Collection'}
            </button>
            <button
              className="btn-interactive"
              onClick={handleSignOut}
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Content Routing */}
        {activeTab === 'profile' ? (
          <div style={{ background: THEME.bgCard, borderRadius: 16, border: `1px solid ${THEME.border}`, padding: '28px 32px', maxWidth: 640, margin: '0 auto', boxShadow: '0 8px 24px rgba(109, 40, 217, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: `1px solid ${THEME.border}`, paddingBottom: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: THEME.primaryDark, fontSize: 20 }}>Account Profile &amp; Security</h3>
                <p style={{ fontSize: 13, color: THEME.textMuted, margin: 0 }}>
                  Signed in as: <strong>{session.user.email || 'Anonymous Guest'}</strong>
                </p>
              </div>
              <button
                className="btn-interactive"
                type="button"
                onClick={() => setActiveTab('inventory')}
                style={{ padding: '8px 14px', background: THEME.primaryLight, color: THEME.primaryDark, border: `1px solid ${THEME.border}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                ← Back to Shelf
              </button>
            </div>

            {!isGuest ? (
              <form onSubmit={handlePasswordUpdate} style={{ marginBottom: 32, borderBottom: `1px solid ${THEME.border}`, paddingBottom: 24 }}>
                <h4 style={{ margin: '0 0 12px 0', color: THEME.textMain, fontSize: 15 }}>Update Password</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input
                    className="purple-input"
                    type="password"
                    placeholder="New Password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ padding: '11px 14px', borderRadius: 8, border: `1px solid ${THEME.border}`, fontSize: 14 }}
                  />
                  <input
                    className="purple-input"
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ padding: '11px 14px', borderRadius: 8, border: `1px solid ${THEME.border}`, fontSize: 14 }}
                  />
                  <button
                    className="btn-interactive"
                    type="submit"
                    disabled={updatingPassword}
                    style={{ padding: '11px 18px', background: THEME.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}
                  >
                    {updatingPassword ? 'Updating...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ marginBottom: 32, borderBottom: `1px solid ${THEME.border}`, paddingBottom: 24, fontSize: 13, color: THEME.textMuted }}>
                <em>Password changes are not available in Guest Test Mode.</em>
              </div>
            )}

            <div>
              <h4 style={{ margin: '0 0 6px 0', color: THEME.danger, fontSize: 15 }}>Logical Account Deletion</h4>
              <p style={{ fontSize: 13, color: THEME.textMuted, margin: '0 0 14px 0' }}>
                Deactivating your account soft-deletes your profile and purges all collection inventory.
              </p>
              <button
                className="btn-interactive"
                type="button"
                onClick={() => setShowDeleteModal(true)}
                style={{ padding: '10px 16px', background: THEME.danger, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Delete Account (Logical)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Collection Dashboard */}
            <div
              style={{
                background: THEME.bgCard,
                border: `1px solid ${THEME.border}`,
                borderRadius: 14,
                padding: 20,
                marginBottom: 24,
                boxShadow: '0 4px 14px rgba(109, 40, 217, 0.05)'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 18 }}>
                <div className="kpi-card" style={{ background: THEME.bgSubtle, padding: 14, borderRadius: 10, border: `1px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: THEME.primary }}>
                    Total Records
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: THEME.textMain }}>{stats.total}</div>
                </div>

                <div className="kpi-card" style={{ background: THEME.bgSubtle, padding: 14, borderRadius: 10, border: `1px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: THEME.primary }}>
                    Unique Artists
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: THEME.textMain }}>{stats.uniqueArtists}</div>
                </div>

                <div className="kpi-card" style={{ background: THEME.bgSubtle, padding: 14, borderRadius: 10, border: `1px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: THEME.primary }}>
                    Top Decade
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: THEME.textMain }}>{stats.topDecade}</div>
                </div>

                <div className="kpi-card" style={{ background: THEME.bgSubtle, padding: 14, borderRadius: 10, border: `1px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: THEME.primary }}>
                    Top Label
                  </div>
                  <div
                    style={{
                      fontSize: 19,
                      fontWeight: 700,
                      marginTop: 8,
                      color: THEME.textMain,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {stats.topLabel}
                  </div>
                </div>
              </div>

              {stats.formatShare.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: THEME.primaryDark, marginBottom: 8 }}>
                    Format Share
                  </div>
                  <div style={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', background: THEME.primaryLight, marginBottom: 10 }}>
                    {stats.formatShare.map((f, idx) => (
                      <div
                        key={f.name}
                        title={`${f.name}: ${f.count} (${f.pct}%)`}
                        style={{
                          width: `${f.pct}%`,
                          background: barColors[idx % barColors.length],
                          transition: 'width 0.3s ease'
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: THEME.textMain }}>
                    {stats.formatShare.map((f, idx) => (
                      <span key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: barColors[idx % barColors.length],
                            display: 'inline-block'
                          }}
                        />
                        <strong>{f.name}</strong>: {f.count} ({f.pct}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Add New Record */}
            <div
              style={{
                margin: '20px 0',
                padding: 20,
                background: THEME.bgCard,
                borderRadius: 14,
                border: `1px solid ${THEME.border}`,
                boxShadow: '0 4px 14px rgba(109, 40, 217, 0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, color: THEME.primaryDark, fontSize: 17 }}>Add New Pressing</h3>
                <button
                  className="btn-interactive"
                  type="button"
                  onClick={() => setShowScanner((prev) => !prev)}
                  style={{
                    padding: '8px 14px',
                    background: showScanner ? THEME.danger : THEME.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  {showScanner ? 'Close Camera' : 'Scan Barcode'}
                </button>
              </div>

              {showScanner && (
                <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto 15px auto' }}></div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="purple-input"
                  type="text"
                  placeholder="Search barcode, artist, album, or catalog #..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(query, 'q')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 14
                  }}
                />
                <button
                  className="btn-interactive"
                  onClick={() => handleSearch(query, 'q')}
                  style={{
                    padding: '10px 20px',
                    background: THEME.accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Search Discogs
                </button>
              </div>

              {loading && <p style={{ color: THEME.primary, fontWeight: 500, marginTop: 12 }}>Searching Discogs database...</p>}

              {!loading && hasSearched && searchResults.length === 0 && (
                <p style={{ color: THEME.textMuted, fontSize: 13, marginTop: 12 }}>
                  No pressings found matching &quot;{query}&quot;. Try a different barcode or catalog number.
                </p>
              )}

              <div style={{ marginTop: 12 }}>
                {searchResults.map((item) => (
                  <div
                    className="search-result-card"
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      background: THEME.bgSubtle,
                      padding: 10,
                      marginTop: 8,
                      borderRadius: 10,
                      border: `1px solid ${THEME.border}`
                    }}
                  >
                    <img
                      src={item.thumb || VINYL_PLACEHOLDER}
                      alt=""
                      width="52"
                      height="52"
                      style={{ objectFit: 'cover', borderRadius: 6 }}
                    />
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: THEME.textMain }}>{item.title}</strong>
                      <br />
                      <small style={{ color: THEME.textMuted }}>
                        {item.year || 'Year N/A'} • {item.country || 'Unknown Country'}
                      </small>
                    </div>
                    <button
                      className="btn-interactive"
                      onClick={() => saveRelease(item.id, query)}
                      style={{
                        background: THEME.primary,
                        color: '#fff',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      + Add to Shelf
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory Filter Bar & Header */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginTop: 30,
                marginBottom: 12
              }}
            >
              <h3 style={{ margin: 0, color: THEME.primaryDark, fontSize: 18 }}>
                Shelf Inventory ({filteredInventory.length}
                {filteredInventory.length !== inventory.length ? ` of ${inventory.length}` : ''} records)
              </h3>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <input
                  className="purple-input"
                  type="text"
                  placeholder="Filter artist, album, label, catno..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    background: THEME.bgCard,
                    minWidth: 230,
                    fontSize: 13
                  }}
                />
                <select
                  className="purple-input"
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    background: THEME.bgCard,
                    color: THEME.textMain,
                    fontSize: 13
                  }}
                >
                  <option value="ALL">All Formats</option>
                  {stats.formatShare.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name} ({f.count})
                    </option>
                  ))}
                </select>
                {(filterText || filterFormat !== 'ALL') && (
                  <button
                    className="btn-interactive"
                    type="button"
                    onClick={() => {
                      setFilterText('');
                      setFilterFormat('ALL');
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: `1px solid ${THEME.border}`,
                      background: THEME.primaryLight,
                      color: THEME.primaryDark,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Inventory Table */}
            <div
              style={{
                background: THEME.bgCard,
                borderRadius: 14,
                border: `1px solid ${THEME.border}`,
                overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(109, 40, 217, 0.05)'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: THEME.primaryLight, color: THEME.primaryDark, textAlign: 'left', fontSize: 13 }}>
                    <th style={{ padding: '12px 10px', width: 42 }}></th>
                    <th style={{ padding: '12px 10px' }}>Cover</th>
                    <th style={{ padding: '12px 10px' }}>Artist &amp; Title</th>
                    <th style={{ padding: '12px 10px' }}>Format / Size / RPM</th>
                    <th className="hide-mobile" style={{ padding: '12px 10px' }}>Label</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: THEME.textMuted }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                          <VinylHeroArt size={48} active={false} />
                        </div>
                        {inventory.length === 0
                          ? 'Your crates are empty. Scan a barcode or search Discogs above to add your first record.'
                          : 'No records match your current filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const isExpanded = !!expandedRows[item.id];
                      const detailEntries = Object.entries(item).filter(([k]) => !HIDDEN_DETAIL_KEYS.has(k));

                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            className="inventory-row"
                            style={{
                              borderBottom: isExpanded ? 'none' : `1px solid ${THEME.border}`,
                              background: isExpanded ? '#faf8ff' : '#fff'
                            }}
                          >
                            <td style={{ padding: 10, textAlign: 'center' }}>
                              <button
                                className="btn-interactive"
                                type="button"
                                onClick={() => toggleRow(item.id)}
                                aria-label={isExpanded ? 'Collapse record details' : 'Expand record details'}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 6,
                                  border: `1px solid ${THEME.border}`,
                                  background: isExpanded ? THEME.primary : THEME.primaryLight,
                                  color: isExpanded ? '#fff' : THEME.primaryDark,
                                  fontWeight: 'bold',
                                  fontSize: 16,
                                  lineHeight: '24px',
                                  cursor: 'pointer'
                                }}
                              >
                                {isExpanded ? '−' : '+'}
                              </button>
                            </td>
                            <td style={{ padding: 10 }}>
                              <img
                                className="album-cover"
                                src={item.cover_url || VINYL_PLACEHOLDER}
                                alt=""
                                width="46"
                                height="46"
                                style={{
                                  objectFit: 'cover',
                                  borderRadius: 6,
                                  border: `1px solid ${THEME.border}`
                                }}
                              />
                            </td>
                            <td style={{ padding: 10 }}>
                              <strong style={{ color: THEME.textMain }}>{item.artist}</strong>
                              <br />
                              <span style={{ color: '#374151', fontSize: 14 }}>
                                {item.title} {item.year ? `(${item.year})` : ''}
                              </span>
                            </td>
                            <td style={{ padding: 10 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  background: THEME.primaryLight,
                                  color: THEME.primaryDark,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 600
                                }}
                              >
                                {item.format || '—'}
                              </span>
                              <br />
                              <small style={{ color: THEME.textMuted }}>
                                {item.disc_size || '—'} / {item.rpm || '—'}
                              </small>
                            </td>
                            <td className="hide-mobile" style={{ padding: 10, color: '#374151', fontSize: 14 }}>
                              {item.label || '—'}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr style={{ background: '#faf8ff', borderBottom: `1px solid ${THEME.border}` }}>
                              <td colSpan={5} style={{ padding: '12px 18px 18px 54px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                                  {detailEntries.map(([key, value]) => (
                                    <div
                                      key={key}
                                      style={{
                                        background: '#fff',
                                        padding: '9px 12px',
                                        borderRadius: 8,
                                        border: `1px solid ${THEME.border}`
                                      }}
                                    >
                                      <div style={{ fontSize: 11, color: THEME.primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        {formatFieldLabel(key)}
                                      </div>
                                      <div style={{ fontSize: 13, marginTop: 3, wordBreak: 'break-word', color: THEME.textMain }}>
                                        {formatFieldValue(value)}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                                  <button
                                    className="btn-interactive"
                                    type="button"
                                    disabled={deletingId === item.id}
                                    onClick={() => handleDelete(item)}
                                    style={{
                                      padding: '7px 14px',
                                      background: THEME.danger,
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: 8,
                                      cursor: deletingId === item.id ? 'not-allowed' : 'pointer',
                                      opacity: deletingId === item.id ? 0.6 : 1,
                                      fontWeight: 600,
                                      fontSize: 13
                                    }}
                                  >
                                    {deletingId === item.id ? 'Removing...' : 'Delete Record'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Custom Delete Confirmation Modal */}
        {showDeleteModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(30, 27, 75, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }}>
            <div style={{
              background: THEME.bgCard,
              borderRadius: 16,
              padding: 28,
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: `1px solid ${THEME.border}`
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: THEME.danger }}>Deactivate Account?</h3>
              <p style={{ fontSize: 13, color: THEME.textMuted, lineHeight: '1.5', margin: '0 0 16px 0' }}>
                This action is irreversible. All your cataloged records and inventory data will be wiped. To confirm, please type <strong>DELETE</strong> below:
              </p>

              <input
                className="purple-input"
                type="text"
                placeholder="Type DELETE to confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  fontSize: 14,
                  marginBottom: 20,
                  boxSizing: 'box-sizing'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: THEME.bgSubtle,
                    color: THEME.textMain,
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn-interactive"
                  type="button"
                  disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
                  onClick={handleLogicalAccountDeletion}
                  style={{
                    padding: '8px 16px',
                    background: deleteConfirmText === 'DELETE' ? THEME.danger : '#fca5a5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: deleteConfirmText === 'DELETE' && !deletingAccount ? 'pointer' : 'not-allowed'
                  }}
                >
                  {deletingAccount ? 'Deactivating...' : 'Confirm Deletion'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: toast.type === 'error' ? '#dc2626' : '#10b981',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: 10,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.18)',
              fontSize: 14,
              fontWeight: 600,
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              animation: 'slideUp 0.25s ease-out'
            }}
          >
            <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}