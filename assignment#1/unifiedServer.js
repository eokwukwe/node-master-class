const url = require('url');
const { StringDecoder } = require('string_decoder');

const router = require('./route');

const unifiedServer = (req, res) => {
  // Get URL and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path from the URL
  const trimmedPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  const queryStringObject = JSON.stringify(parsedUrl.query);

  // Get the HTTP method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = JSON.stringify(req.headers);

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
          : router['notFound'];

      // Construct the data object to send to the handler
      const data = {
        method: method,
        payload: buffer,
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
      });
    });
};

module.exports = unifiedServer;
