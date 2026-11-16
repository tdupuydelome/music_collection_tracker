const axios = require('axios');

const USER_AGENT = 'VinylStockManagerApp/2.0 (+https://github.com/vinyl-app)';

async function searchDiscogs(query, type = 'barcode', token) {
  let searchUrl = '';
  if (type === 'barcode') {
    searchUrl = `https://api.discogs.com/database/search?barcode=${encodeURIComponent(query)}&type=release&token=${token}`;
  } else if (type === 'catno') {
    searchUrl = `https://api.discogs.com/database/search?catno=${encodeURIComponent(query)}&type=release&token=${token}`;
  } else {
    searchUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&format=vinyl&type=release&token=${token}`;
  }

  const response = await axios.get(searchUrl, {
    headers: { 'User-Agent': USER_AGENT }
  });

  return response.data.results || [];
}

async function getReleaseDetails(releaseId, token) {
  const url = `https://api.discogs.com/releases/${releaseId}?token=${token}`;
  const response = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  return response.data;
}

async function getReleaseStats(releaseId, token) {
  try {
    const url = `https://api.discogs.com/marketplace/stats/${releaseId}?token=${token}`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      validateStatus: function (status) { return status < 500; }
    });
    if (response.status === 200) {
      return response.data;
    }
  } catch (err) {}
  return null;
}

function extractDiscSpecs(formats) {
  if (!formats || formats.length === 0) return { size: '', rpm: '' };
  const sizes = new Set();
  const rpms = new Set();
  const knownSizes = ['12"', '10"', '7"', '16"', '8"', '5"'];
  const knownRpms = ['33 ⅓ RPM', '45 RPM', '78 RPM', '16 ⅔ RPM'];

  formats.forEach(f => {
    const desc = f.descriptions || [];
    let foundExplicitSize = false;
    desc.forEach(d => {
      if (knownSizes.includes(d)) { sizes.add(d); foundExplicitSize = true; }
      if (knownRpms.includes(d)) { rpms.add(d); }
    });
    if (!foundExplicitSize && f.name === 'Vinyl') {
      if (desc.includes('LP')) sizes.add('12"');
      else if (desc.includes('Single')) sizes.add('7"');
    }
  });
  return { size: [...sizes].join(', '), rpm: [...rpms].join(', ') };
}

module.exports = { searchDiscogs, getReleaseDetails, getReleaseStats, extractDiscSpecs };