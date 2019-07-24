/**
 * Request handlers
 */
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

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
handlers._users.post = (sentData, callback) => {
  // Check that all required fields are filled out
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
  const phone =
    typeof sentData.payload.phone === 'string' &&
    sentData.payload.phone.trim().length === 10
      ? sentData.payload.phone.trim()
      : false;
  const password =
    typeof sentData.payload.password === 'string' &&
    sentData.payload.password.trim().length > 0
      ? sentData.payload.password.trim()
      : false;
  const tosAgreement =
    typeof sentData.payload.tosAgreement === 'boolean' &&
    sentData.payload.tosAgreement === true
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
                // Delete checks associated with the user
                const userChecks =
                  typeof userData.checks === 'object' &&
                  userData.checks instanceof Array
                    ? userData.checks
                    : [];
                const checksToDelete = userChecks.length;

                if (checksToDelete > 0) {
                  let deletedChecks = 0;
                  let deletionErrors = false;

                  userChecks.forEach((checkId) => {
                    _data.delete('checks', checkId, (err) => {
                      if (err) deletionErrors = true;
                      deletedChecks++;
                      if (deletedChecks === checksToDelete) {
                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, {
                            Error:
                              "Errors encountered while deleting user's check. All checks may not have been deleted"
                          });
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
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
handlers._tokens.post = (sentData, callback) => {
  const phone =
    typeof sentData.payload.phone === 'string' &&
    sentData.payload.phone.trim().length === 10
      ? sentData.payload.phone.trim()
      : false;
  const password =
    typeof sentData.payload.password === 'string' &&
    sentData.payload.password.trim().length > 0
      ? sentData.payload.password.trim()
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

// Checks
handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the checks methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (sentData, callback) => {
  const protocol =
    typeof sentData.payload.protocol === 'string' &&
    ['https', 'http'].indexOf(sentData.payload.protocol) > -1
      ? sentData.payload.protocol
      : false;
  const url =
    typeof sentData.payload.url === 'string' &&
    sentData.payload.url.trim().length > 0
      ? sentData.payload.url.trim()
      : false;
  const method =
    typeof sentData.payload.method === 'string' &&
    ['post', 'get', 'put', 'delete'].indexOf(sentData.payload.method) > -1
      ? sentData.payload.method
      : false;
  const successCodes =
    typeof sentData.payload.successCodes === 'object' &&
    sentData.payload.successCodes instanceof Array &&
    sentData.payload.successCodes.length > 0
      ? sentData.payload.successCodes
      : false;
  const timeoutSeconds =
    typeof sentData.payload.timeoutSeconds === 'number' &&
    sentData.payload.timeoutSeconds % 1 === 0 &&
    sentData.payload.timeoutSeconds >= 1 &&
    sentData.payload.timeoutSeconds <= 5
      ? sentData.payload.timeoutSeconds
      : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get token from headers
    const token =
      typeof sentData.headers.token === 'string'
        ? sentData.headers.token
        : false;

    // Look up user by reading the token
    _data.read('tokens', token, (err, tokenData) => {
      if (!err && token) {
        const userPhone = tokenData.phone;
        _data.read('users', userPhone, (err, userData) => {
          if (!err && userData) {
            const userChecks =
              typeof userData.checks === 'object' &&
              userData.checks instanceof Array
                ? userData.checks
                : [];

            // Verify that user has less not the maxChecks per user
            if (userChecks.length < config.maxChecks) {
              // Create a random ID for the check
              const checkId = helpers.createRandomString(20);

              // Create the check object and include user's phone
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds
              };

              _data.create('checks', checkId, checkObject, (err) => {
                if (!err) {
                  // Add the checkId to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update('users', userPhone, userData, (err) => {
                    if (!err) {
                      // Return the data about the new check
                      callback(200, checkObject);
                    } else {
                      callback(500, {
                        Error: 'Could not update the user with the new check'
                      });
                    }
                  });
                } else {
                  callback(500, { Error: 'Could not create the new check' });
                }
              });
            } else {
              callback(400, {
                Error: `User already has the maximum number of checkd (${
                  config.maxChecks
                })`
              });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { Error: 'Missing required inputs or inputs are invalid' });
  }
};

// Checks - get
// Required data: id
// Optinal data: none
handlers._checks.get = (sentData, callback) => {
  // Check that the id provided is valid
  const id =
    typeof sentData.queryStringObject.id === 'string' &&
    sentData.queryStringObject.id.trim().length === 20
      ? sentData.queryStringObject.id.trim()
      : false;

  if (id) {
    // Lookup the checks
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Get token from the headers
        const token =
          typeof sentData.headers.token === 'string'
            ? sentData.headers.token
            : false;

        // Verify token is valid for the given user phone number
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          (tokenIsValid) => {
            if (tokenIsValid) {
              // Return the check data
              callback(200, checkData);
            } else {
              callback(403);
            }
          }
        );
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

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds
// NOTE <=====> [one of the above optional data must be set]
handlers._checks.put = (sentData, callback) => {
  // Check for the required field
  const id =
    typeof sentData.payload.id === 'string' &&
    sentData.payload.id.trim().length === 20
      ? sentData.payload.id.trim()
      : false;

  // Check for optional fields
  const protocol =
    typeof sentData.payload.protocol === 'string' &&
    ['https', 'http'].indexOf(sentData.payload.protocol) > -1
      ? sentData.payload.protocol
      : false;
  const url =
    typeof sentData.payload.url === 'string' &&
    sentData.payload.url.trim().length > 0
      ? sentData.payload.url.trim()
      : false;
  const method =
    typeof sentData.payload.method === 'string' &&
    ['post', 'get', 'put', 'delete'].indexOf(sentData.payload.method) > -1
      ? sentData.payload.method
      : false;
  const successCodes =
    typeof sentData.payload.successCodes === 'object' &&
    sentData.payload.successCodes instanceof Array &&
    sentData.payload.successCodes.length > 0
      ? sentData.payload.successCodes
      : false;
  const timeoutSeconds =
    typeof sentData.payload.timeoutSeconds === 'number' &&
    sentData.payload.timeoutSeconds % 1 === 0 &&
    sentData.payload.timeoutSeconds >= 1 &&
    sentData.payload.timeoutSeconds <= 5
      ? sentData.payload.timeoutSeconds
      : false;

  if (id) {
    // Check for one or more optional fields
    if (protocol || url || method || successCodes || timeoutSeconds) {
      // Lookup the checks
      _data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          // Get token from the headers
          const token =
            typeof sentData.headers.token === 'string'
              ? sentData.headers.token
              : false;

          // Verify token is valid for the given user phone number
          handlers._tokens.verifyToken(
            token,
            checkData.userPhone,
            (tokenIsValid) => {
              if (tokenIsValid) {
                // Update the check
                if (protocol) checkData.protocol = protocol;
                if (url) checkData.url = url;
                if (method) checkData.method = method;
                if (successCodes) checkData.successCodes = successCodes;
                if (timeoutSeconds) checkData.timeoutSeconds = timeoutSeconds;

                // Save updates
                _data.update('checks', id, checkData, (err) => {
                  if (!err) {
                    callback(200);
                  } else {
                    callback(500, { Error: 'Could not update the check' });
                  }
                });
              } else {
                callback(403);
              }
            }
          );
        } else {
          callback(404, { Error: 'Check ID does not exist' });
        }
      });
    } else {
      callback(400, { Error: 'Missing fields to update' });
    }
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Checks - delete
// Required data: id
// Optinal data: none
handlers._checks.delete = (sentData, callback) => {
  // Check that the id provided is valid
  const id =
    typeof sentData.queryStringObject.id === 'string' &&
    sentData.queryStringObject.id.trim().length === 20
      ? sentData.queryStringObject.id.trim()
      : false;
  if (id) {
    // Lookup the checks
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Get token from the headers
        const token =
          typeof sentData.headers.token === 'string'
            ? sentData.headers.token
            : false;

        // Verify token is valid for the given user phone number
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          (tokenIsValid) => {
            if (tokenIsValid) {
              // Delete the check data
              _data.delete('checks', id, (err) => {
                if (!err) {
                  _data.read('users', checkData.userPhone, (err, userData) => {
                    if (!err && userData) {
                      const userChecks =
                        typeof userData.checks === 'object' &&
                        userData.checks instanceof Array
                          ? userData.checks
                          : [];

                      // Remove the deleted check from the list of checks
                      const checkPosition = userChecks.indexOf(id);
                      if (checkPosition > -1) {
                        userChecks.splice(checkPosition, 1);

                        // Re-save the user's data
                        _data.update(
                          'users',
                          checkData.userPhone,
                          userData,
                          (err) => {
                            if (!err) {
                              callback(200);
                            } else {
                              callback(500, {
                                Error: 'Could not update the user'
                              });
                            }
                          }
                        );
                      } else {
                        callback(500, {
                          Error:
                            'Could not find the check, so could not remove it'
                        });
                      }
                    } else {
                      callback(500, {
                        Error:
                          'Could not find the user who created the check, so could not remove the check from the check data'
                      });
                    }
                  });
                } else {
                  callback(500, { Error: 'Could not delete the check data' });
                }
              });
            } else {
              callback(403);
            }
          }
        );
      } else {
        callback(404, { Error: 'Check ID does not exist' });
      }
    });
  } else {
    callback(400, {
      Error: 'Missing required field'
    });
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
