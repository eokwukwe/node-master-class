const os = require('os');

// Define a handler
const handlers = {};

// Hello handlers
handlers.hello = (data, callback) => {
  // Get user PC info
  const hostname = os.hostname().split('-')[0];
  const { username } = os.userInfo();
  const { address } = os.networkInterfaces().lo0[0];
  const platform = os.platform();
  sysArch = os.arch();
  callback(200, {
    message: `Hello ${username}`,
    'System information': {
      hostname,
      username,
      address,
      sysArch,
      platform
    }
  });
};

// notFound handlers
handlers.notFound = (data, callback) => {
  callback(404, { message: 'Not found' });
};

module.exports = handlers;
