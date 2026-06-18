const https = require('https');

const API_KEY = 'AIzaSyCor0YAMApwfowNFC-EXSOwrKq0mxdwMP8';

const endpoint = {
  name: 'Geocoding API',
  url: `https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=${API_KEY}`
};

https.get(endpoint.url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`\n--- Result for ${endpoint.name} ---`);
    try {
      const parsed = JSON.parse(data);
      console.log(`Status: ${parsed.status}`);
      if (parsed.error_message) {
        console.log(`Error Message: ${parsed.error_message}`);
      }
    } catch (e) {
      console.log(`Status: Unknown (Failed to parse JSON)`);
      console.log(data.substring(0, 100));
    }
  });
}).on('error', (err) => {
  console.log(`\n--- Result for ${endpoint.name} ---`);
  console.log(`Request Error: ${err.message}`);
});
