const fs = require('fs');
const url = require('url');
const http = require('http');
const path = require('path');
const https = require('https');
const { StringDecoder } = require('string_decoder');

const config = require('./config');
const helpers = require('./helpers');
const handlers = require('./handlers');

// Instantiate the server module object
const server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// Https server options
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

// Instantiate the HTTPS server
server.httpsServer = https.createServer(
  server.httpsServerOptions,
  (req, res) => {
    server.unifiedServer(req, res);
  }
);

// All the server logic for http and https server
server.unifiedServer = (req, res) => {
  // Get URL and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path from the URL
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the HTTP method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers;

  // Get payload, if any
  const decoder = new StringDecoder('utf8');
  let buffer = '';
  req
    .on('data', (data) => {
      buffer += decoder.write(data);
    })
    .on('end', () => {
      buffer += decoder.end();

      // Choose the handler this request should go to.
      // If non, choose the notFound handler.
      const chosenHandler =
        typeof server.router[trimmedPath] !== 'undefined'
          ? server.router[trimmedPath]
          : handlers.notFound;

      // Construct the data object to send to the handler
      const data = {
        method: method,
        payload: helpers.parseJsonToObject(buffer),
        headers: headers,
        trimmedPath: trimmedPath,
        queryStringObject: queryStringObject
      };

      // Route the request to the handler specified in the router
      chosenHandler(data, (statusCode, payload) => {
        // Use the status code called back by the handler, or default to 200
        statusCode = typeof statusCode === 'number' ? statusCode : 200;

        // Use the payload called back by the handler, or default to an empty object
        payload = typeof payload === 'object' ? payload : {};

        // Convert payload to string
        const payloadString = JSON.stringify(payload);

        // Send the response
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(statusCode);
        res.end(payloadString);

        // Log the request path
        console.log(`Returning these reponse: ${statusCode} ${payloadString}`);
      });
    });
};

// Define a request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
};

// Init server
server.init = () => {
  // Start the HTTP server.
  server.httpServer.listen(config.httpPort, () => {
    console.log(
      `Server listening on port ${config.httpPort} in ${config.envName} mode`
    );
  });

  // Start the HTTPS server.
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(
      `Server listening on port ${config.httpsPort} in ${config.envName} mode`
    );
  });
};

// Export server
module.exports = server;
