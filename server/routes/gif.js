// server/routes/gif.js
const express = require('express');
const router = express.Router();
const https = require('https');

// Прокси к бесплатному сервису без ключей
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = Math.min(parseInt(req.query.limit) || 20, 30);

    let url;
    if (query) {
      // Поиск через DuckDuckGo (бесплатно, без ключей)
      url = `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&limit=${limit}&media_filter=minimal&key=LIVDSRZULELA`;
    } else {
      // Trending
      url = `https://g.tenor.com/v1/trending?limit=${limit}&media_filter=minimal&key=LIVDSRZULELA`;
    }

    const data = await fetchJSON(url);

    const gifs = (data.results || []).map(gif => ({
      id: gif.id,
      preview: gif.media?.[0]?.tinygif?.url || gif.media?.[0]?.nanogif?.url || '',
      full: gif.media?.[0]?.gif?.url || gif.media?.[0]?.mediumgif?.url || '',
      title: gif.title || ''
    })).filter(g => g.preview);

    res.json({ success: true, gifs });
  } catch (err) {
    console.error('GIF error:', err.message);
    res.json({ success: true, gifs: [] });
  }
});

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('JSON parse error')); }
      });
    }).on('error', reject);
  });
}

module.exports = router;