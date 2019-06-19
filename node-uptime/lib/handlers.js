/**
 * Request handlers
 */
const _data = require('./data');
const helpers = require('./helpers');

// Define the handlers
const handlers = {};

// Ping handler
handlers.ping = (data, callback) => {
  // Callback a status code and/or a payload object
  callback(200);
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Users
handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users submethod
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
  // Check that all required fields are filled out
  const firstName =
    typeof data.payload.firstName === 'string' &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName === 'string' &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  const phone =
    typeof data.payload.phone === 'string' &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password === 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  const tosAgreement =
    typeof data.payload.tosAgreement === 'boolean' &&
    data.payload.tosAgreement === true
      ? true
      : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure user does not already exist
    _data.read('users', 'phone', (err, data) => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        if (hashPassword) {
          // Create the user object
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement
          };

          // Store the user
          _data.create('users', 'phone', userObject, err => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, {
                Error: 'Could not create the new user '
              });
            }
          });
        } else {
          callback(500, { Error: "Could not hash user's password" });
        }
      } else {
        // User already exit
        callback(400, { Error: 'A user with that phone number already exist' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Users - get
handlers._users.post = (data, callback) => {};

// Users - put
handlers._users.post = (data, callback) => {};

// Users - delete
handlers._users.post = (data, callback) => {};


module.exports = handlers;
