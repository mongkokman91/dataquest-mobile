const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const fixture = fs.readFileSync(path.join(__dirname, 'fixture.html'));
http.createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(fixture);
}).listen(4173, '127.0.0.1');
