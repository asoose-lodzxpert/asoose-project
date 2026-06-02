const https = require('https');

const API_KEY = 'AIzaSyDr0dMWEWJ-Ly8F8MhbrztOXcFYnDcS4W8';

const endpoints = [
  {
    name: 'Geocoding API',
    url: `https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=${API_KEY}`
  },
  {
    name: 'Maps JavaScript API',
    url: `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`
  },
  {
    name: 'Places API',
    url: `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Museum%20of%20Contemporary%20Art%20Australia&inputtype=textquery&fields=formatted_address%2Cname%2Crating%2Copening_hours%2Cgeometry&key=${API_KEY}`
  }
];

endpoints.forEach(endpoint => {
  https.get(endpoint.url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(`\n--- Result for ${endpoint.name} ---`);
      if (endpoint.name === 'Maps JavaScript API') {
        const errorMatch = data.match(/console\.error\("(.*?)"\)/);
        if (errorMatch) {
          console.log(`Status: ERROR\nMessage: ${errorMatch[1]}`);
        } else {
          console.log(`Status: OK (Script loaded successfully without obvious errors)`);
        }
      } else {
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
      }
    });
  }).on('error', (err) => {
    console.log(`\n--- Result for ${endpoint.name} ---`);
    console.log(`Request Error: ${err.message}`);
  });
});
