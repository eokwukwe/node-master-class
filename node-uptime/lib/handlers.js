/**
 * Request handlers
 */
const _data = require('./data');
const helpers = require('./helpers');

// Define the handlers
const handlers = {};

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
    _data.read('users', phone, (err, data) => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create the user object
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement
          };

          // Store the user
          _data.create('users', phone, userObject, err => {
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
// Required data: phone
// Optional field: none
// @TODO Allow only authenticated users to access only their object
handlers._users.get = (sentData, callback) => {
  // Check that the phone number provided is valid
  const phone =
    typeof sentData.queryStringObject.phone === 'string' &&
    sentData.queryStringObject.phone.length === 10
      ? sentData.queryStringObject.phone
      : false;

  if (phone) {
    // Lookup the user
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        // Remove the hashed password
        delete userData.hashedPassword;
        callback(200, userData);
      } else {
        callback(404, { Error: 'User not found' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// @TODO Allow only authenticated users to update only their object
handlers._users.put = (sentData, callback) => {
  // Check for the required field
  const phone =
    typeof sentData.payload.phone === 'string' &&
    sentData.payload.phone.length === 10
      ? sentData.payload.phone
      : false;

  // Check for optional fields
  const firstName =
    typeof sentData.payload.firstName === 'string' &&
    sentData.payload.firstName.trim().length > 0
      ? sentData.payload.firstName.trim()
      : false;
  const lastName =
    typeof sentData.payload.lastName === 'string' &&
    sentData.payload.lastName.trim().length > 0
      ? sentData.payload.lastName.trim()
      : false;
  const password =
    typeof sentData.payload.password === 'string' &&
    sentData.payload.password.trim().length > 0
      ? sentData.payload.password.trim()
      : false;

  // Error is phone is invalid
  if (phone) {
    // Error if nothing is sent update
    if (firstName || lastName || password) {
      // Look up user
      _data.read('users', phone, (err, userData) => {
        if (!err && userData) {
          // Update necessary field
          if (firstName) {
            userData.firstName = firstName;
          }

          if (lastName) {
            userData.lastName = lastName;
          }

          if (password) {
            userData.hashedPassword = helpers.hash(password);
          }

          // Store new update
          _data.update('users', phone, userData, (err, updatedData) => {
            if (!err) {
              callback(201, { Message: 'User data updated successufully' });
            } else {
              console.log(err);
              callback(500, { Error: 'Could not update the user data' });
            }
          });
        } else {
          callback(404, { Error: 'User not found' });
        }
      });
    } else {
      callback(400, { Error: 'Missing required field' });
    }
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Users - delete
// Required data: phone
// Optional field: none
// @TODO Allow only authenticated users to delete only their object
// @TODO Cleanup (delete) any other files associated with the user
handlers._users.delete = (sentData, callback) => {
  // Check that the phone number provided is valid
  const phone =
    typeof sentData.queryStringObject.phone === 'string' &&
    sentData.queryStringObject.phone.length === 10
      ? sentData.queryStringObject.phone
      : false;

  if (phone) {
    // Lookup the user
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        _data.delete('users', phone, err => {
          if (!err) {
            callback(200);
          } else {
            console.log(err);
            callback(500, { Error: 'Could not delete user' });
          }
        });
      } else {
        callback(404, {
          Error: 'User not found'
        });
      }
    });
  } else {
    callback(400, {
      Error: 'Missing required field'
    });
  }
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

// Ping handler
handlers.ping = (data, callback) => {
  // Callback a status code and/or a payload object
  callback(200);
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

module.exports = handlers;
