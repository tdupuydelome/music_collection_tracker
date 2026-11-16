const express = require('express');
const router = express.Router();
const { requireAuth, supabase } = require('../middleware/auth');
const { searchDiscogs, getReleaseDetails, getReleaseStats, extractDiscSpecs } = require('../services/discogs');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', requireAuth, async (req, res) => {
  const { query, type } = req.query;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('discogs_token')
      .eq('id', req.user.id)
      .single();

    const token = profile?.discogs_token || process.env.DEFAULT_DISCOGS_TOKEN;
    if (!token) return res.status(400).json({ error: 'Discogs API token not configured in profile.' });

    const results = await searchDiscogs(query, type, token);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { releaseId, barcode, forceDuplicate } = req.body;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('discogs_token')
      .eq('id', req.user.id)
      .single();

    const token = profile?.discogs_token || process.env.DEFAULT_DISCOGS_TOKEN;
    if (!token) return res.status(400).json({ error: 'Discogs API token not configured.' });

    if (!forceDuplicate) {
      const { data: existing } = await supabase
        .from('inventory')
        .select('id, artist, title')
        .eq('user_id', req.user.id)
        .eq('release_id', String(releaseId))
        .maybeSingle();

      if (existing) {
        return res.json({ duplicate: true, existing });
      }
    }

    const release = await getReleaseDetails(releaseId, token);
    const stats = await getReleaseStats(releaseId, token);

    const artists = release.artists ? release.artists.map(a => a.name.replace(/\s\(\d+\)$/, '')).join(', ') : 'Unknown';
    const title = release.title || 'Untitled';
    const labels = release.labels ? [...new Set(release.labels.map(l => l.name))].join(', ') : '';
    const catNumbers = release.labels ? [...new Set(release.labels.map(l => l.catno))].join(', ') : '';
    const specs = extractDiscSpecs(release.formats);
    const tracklist = release.tracklist ? release.tracklist.map(t => `${t.position} - ${t.title} (${t.duration || '-'})`).join('\n') : '';
    const coverUrl = (release.images && release.images.length > 0) ? release.images[0].uri : '';
    const discogsUrl = release.uri || `https://www.discogs.com/release/${release.id}`;

    let releaseNotes = '';
    if (release.notes) {
      if (typeof release.notes === 'string') {
        releaseNotes = release.notes;
      } else if (Array.isArray(release.notes)) {
        releaseNotes = release.notes.map(n => (typeof n === 'string' ? n : (n.text || JSON.stringify(n)))).join('\n');
      }
    }

    const community = release.community || {};
    const haveCount = community.have || stats?.have || null;
    const wantCount = community.want || stats?.want || null;
    const rating = community.rating || {};
    const avgRating = rating.average || null;
    const ratingsCount = rating.count || null;

    const newRecord = {
      user_id: req.user.id,
      barcode: barcode || '',
      release_id: String(release.id),
      artist: artists,
      title: title,
      label: labels,
      cat_no: catNumbers,
      year: release.year || null,
      country: release.country || '',
      genre: release.genres ? release.genres.join(', ') : '',
      style: release.styles ? release.styles.join(', ') : '',
      format: release.formats ? release.formats.map(f => f.name).join(', ') : '',
      disc_size: specs.size,
      rpm: specs.rpm,
      tracklist: tracklist,
      cover_url: coverUrl,
      discogs_url: discogsUrl,
      notes: releaseNotes,
      have_count: haveCount,
      want_count: wantCount,
      avg_rating: avgRating,
      ratings_count: ratingsCount,
      last_sold: stats?.last_sold || null,
      price_low: stats?.lowest_price?.value || null,
      price_median: stats?.median_price?.value || null,
      price_high: stats?.highest_price?.value || null,
      status: 'Synced'
    };

    const { data, error } = await supabase
      .from('inventory')
      .insert([newRecord])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, record: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;