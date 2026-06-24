const zlib = require('zlib');

module.exports = async (req, res) => {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // The external API URL
    const apiUrl = 'https://avtopilot-base.ru/bitrix/catalog_export/yandex_cases_1.php?login=gutudenis901@mail.ru&password=GLKIr0W7vn';
    
    // Fetch data from the external API with AbortController for timeout.
    // The upstream returns a large (~17MB) XML and can be slow, so allow
    // almost the full function budget (maxDuration is 60s in vercel.json).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 second timeout

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AutoHuse-Vercel/1.0)',
        'Accept': 'application/xml, text/xml, */*',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }

    const xmlData = await response.text();

    // The raw XML is ~17MB, which exceeds Vercel's CDN cacheable-object size
    // limit and is slow to transfer. Gzip it (~10x smaller) so the response is
    // both cacheable at the CDN and fast for the client to download. Browsers
    // transparently decompress responses sent with Content-Encoding: gzip.
    const gzipped = zlib.gzipSync(Buffer.from(xmlData, 'utf-8'));

    // Cache the (slow, rarely-changing) result at Vercel's CDN. Subsequent
    // requests are served instantly; stale-while-revalidate refreshes in the
    // background so users never wait on the slow upstream fetch again.
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    res.status(200).send(gzipped);

  } catch (error) {
    console.error('Stock API error:', error);
    
    res.status(500).json({
      error: 'Failed to fetch stock data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};