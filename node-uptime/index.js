const fs = require('fs');
const url = require('url');
const http = require('http');
const https = require('https');
const { StringDecoder } = require('string_decoder');

const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Instantiate the HTTP server
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

// Start the HTTP server.
httpServer.listen(config.httpPort, () => {
  console.log(
    `Server listening on port ${config.httpPort} in ${config.envName} mode`
  );
});

// Instantiate the HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem')
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res);
});

// Start the HTTPS server.
httpsServer.listen(config.httpsPort, () => {
  console.log(
    `Server listening on port ${config.httpsPort} in ${config.envName} mode`
  );
});

// All the server logic for http and https server
const unifiedServer = (req, res) =>{
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
    .on('data', data => {
      buffer += decoder.write(data);
    })
    .on('end', () => {
      buffer += decoder.end();

      // Choose handler this request should go to.
      // If non, choose the notFound handler.
      const chosenHandler =
        typeof router[trimmedPath] !== 'undefined'
          ? router[trimmedPath]
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
const router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens
};
