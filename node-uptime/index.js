/**
 * Primary file for the API
 */
const server = require('./lib/server')
const workers = require('./lib/workers')

// Declare the app
const app = {}

// Init function
app.init = () => {
  // Start the server
  server.init()

  // Start the worker
  workers.init()
}

// Start the app
app.init()

module.exports = app
