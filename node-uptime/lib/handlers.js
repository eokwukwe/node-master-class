/**
 * Request handlers
 */
const _data = require('./data');
const helpers = require('./helpers');

// Define the handlers
const handlers = {};

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
          _data.create('users', phone, userObject, (err) => {
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
handlers._users.get = (sentData, callback) => {
  // Check that the phone number provided is valid
  const phone =
    typeof sentData.queryStringObject.phone === 'string' &&
    sentData.queryStringObject.phone.trim().length === 10
      ? sentData.queryStringObject.phone.trim()
      : false;

  if (phone) {
    // Get token from the headers
    const token =
      typeof sentData.headers.token === 'string'
        ? sentData.headers.token
        : false;

    // Verify token is valid for the given phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            // Remove the hashed password
            delete userData.hashedPassword;
            callback(200, userData);
          } else {
            callback(404, {
              Error: 'User not found'
            });
          }
        });
      } else {
        callback(403, {
          Error: 'Missing required token in header, or token is invalid'
        });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
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
      // Get token from the headers
      const token =
        typeof sentData.headers.token === 'string'
          ? sentData.headers.token
          : false;

      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
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
                  callback(201, {
                    Message: 'User data updated successufully'
                  });
                } else {
                  console.log(err);
                  callback(500, {
                    Error: 'Could not update the user data'
                  });
                }
              });
            } else {
              callback(404, {
                Error: 'User not found'
              });
            }
          });
        } else {
          callback(403, {
            Error: 'Missing required token in header, or token is invalid'
          });
        }
      });
    } else {
      callback(400, { Error: 'Missing required fields' });
    }
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Users - delete
// Required data: phone
// Optional field: none
// @TODO Cleanup (delete) any other files associated with the user
handlers._users.delete = (sentData, callback) => {
  // Check that the phone number provided is valid
  const phone =
    typeof sentData.queryStringObject.phone === 'string' &&
    sentData.queryStringObject.phone.length === 10
      ? sentData.queryStringObject.phone
      : false;

  if (phone) {
    // Get token from the headers
    const token =
      typeof sentData.headers.token === 'string'
        ? sentData.headers.token
        : false;
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            _data.delete('users', phone, (err) => {
              if (!err) {
                callback(200);
              } else {
                console.log(err);
                callback(500, {
                  Error: 'Could not delete user'
                });
              }
            });
          } else {
            callback(404, {
              Error: 'User not found'
            });
          }
        });
      } else {
        callback(403, {
          Error: 'Missing required token in header, or token is invalid'
        });
      }
    });
  } else {
    callback(400, {
      Error: 'Missing required field'
    });
  }
};

// Tokens
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens- post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
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
  if (phone && password) {
    // Lookup the user with that phone number
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        // Hash sent password and compare with stored password
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          // create a new token with a random name with 1hr expiration
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = { phone, id: tokenId, expires };

          // Store token
          _data.create('tokens', tokenId, tokenObject, (err) => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: 'Could not create the new token' });
            }
          });
        } else {
          callback(400, { Error: 'Passwords does not match' });
        }
      } else {
        callback(404, { Error: 'User not found' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Tokens- get
// Required data: id
// Optional field: none
handlers._tokens.get = (sentData, callback) => {
  // Check that the phone number provided is valid
  const id =
    typeof sentData.queryStringObject.id === 'string' &&
    sentData.queryStringObject.id.trim().length === 20
      ? sentData.queryStringObject.id.trim()
      : false;

  if (id) {
    // Lookup the user
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {
      Error: 'Missing required field'
    });
  }
};

// Tokens- put
// Required data: id and extend
// Optional data: none
handlers._tokens.put = (sentData, callback) => {
  const id =
    typeof sentData.payload.id === 'string' &&
    sentData.payload.id.trim().length === 20
      ? sentData.payload.id.trim()
      : false;

  const extend =
    typeof sentData.payload.extend === 'boolean' &&
    sentData.payload.extend === true
      ? sentData.payload.extend
      : false;

  if (id && extend) {
    // Lookup token
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        // // Check that token is not expired
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          _data.update('tokens', id, tokenData, (err) => {
            if (!err) {
              callback(201);
            } else {
              callback(500, {
                Error: 'Could not extend token expiration time'
              });
            }
          });
        } else {
          callback(400, {
            Error: 'Token has already expired and cannot be extended'
          });
        }
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {
      Error: 'Missing required field'
    });
  }
};

// Tokens- delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (sentData, callback) => {
  const id =
    typeof sentData.queryStringObject.id === 'string' &&
    sentData.queryStringObject.id.trim().length === 20
      ? sentData.queryStringObject.id.trim()
      : false;

  if (id) {
    // Lookup the token
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        _data.delete('tokens', id, (err) => {
          if (!err) {
            callback(200);
          } else {
            console.log(err);
            callback(500, { Error: 'Could not delete token' });
          }
        });
      } else {
        callback(404, {
          Error: 'Token not found'
        });
      }
    });
  } else {
    callback(400, {
      Error: 'Missing required field'
    });
  }
};

// Verify current user token id is valid
handlers._tokens.verifyToken = (id, phone, callback) => {
  // Lookup token
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that the token belong to the current user and has not expired
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
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
