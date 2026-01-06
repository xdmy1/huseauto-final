exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Content-Type': 'application/xml',
    'Cache-Control': 'max-age=300' // Cache for 5 minutes
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const apiUrl = 'https://avtopilot-base.ru/bitrix/catalog_export/yandex_cases_1.php?login=gutudenis901@mail.ru&password=GLKIr0W7vn';
    
    // Fetch data from the API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AutoHuse-Proxy/1.0)',
        'Accept': 'application/xml, text/xml, */*'
      },
      timeout: 30000 // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }

    const xmlData = await response.text();
    
    return {
      statusCode: 200,
      headers,
      body: xmlData
    };

  } catch (error) {
    console.error('Stock proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch stock data',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};