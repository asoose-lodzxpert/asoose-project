const fs = require('fs');
const text = fs.readFileSync('output.txt', 'utf8');
console.log(text);
