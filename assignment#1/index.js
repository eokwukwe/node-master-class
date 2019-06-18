const http = require('http');
const https = require('https');
const fs = require('fs');

const config = require('./config');
const unifiedServer = require('./unifiedServer');

// Create HTTPS server options
const httpsServerOption = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem')
};

// Create instances of HTTP and HTTPS servers
const httpServer = http.createServer((req, res) => unifiedServer(req, res));
const httpsServer = https.createServer(httpsServerOption, (req, res) =>
  unifiedServer(req, res)
);

httpServer.listen(config.httpPort, () => {
  console.log(`Server running on ${config.httpPort}`);
});

httpsServer.listen(config.httpsPort, () => {
  console.log(`Server running on ${config.httpsPort}`);
});
