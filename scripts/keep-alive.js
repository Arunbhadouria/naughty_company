const https = require('https');

// Replace with your actual Render URL
const URL = 'https://naughty-company.onrender.com/api/v1/health';
const INTERVAL = 14 * 60 * 1000; // 14 minutes

console.log(`[Keep-Alive] Starting pinger for ${URL}...`);

function ping() {
  https.get(URL, (res) => {
    console.log(`[Keep-Alive] Ping successful: ${res.statusCode} at ${new Date().toISOString()}`);
  }).on('error', (err) => {
    console.error(`[Keep-Alive] Ping failed: ${err.message}`);
  });
}

// Initial ping
ping();

// Schedule pings
setInterval(ping, INTERVAL);
