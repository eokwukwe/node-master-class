/**
 * Helpers for various tasks
 */

const crypto = require('crypto');
const config = require('./config');

// Container for all the helpers
const helpers = {};

// Create a SHA256 hash
helpers.hash = str => {
  if (typeof str === 'string' && str.length > 0) {
    const hash = crypto
      .createHmac('sha256', config.hashingSecret)
      .update(str)
      .digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Parse a JSON string to an object in all cases without throwing
helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (error) {
    return {};
  }
};

// Create a string of random alphanumeric character of a given length
helpers.createRandomString = strLength => {
  strLength =
    typeof strLength === 'number' && strLength > 0 ? strLength : false;
  
  if (strLength) {
    // Define all the possible characters that could go into a string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Final random string
    let randomString = '';
    for (let i = 1; i <= strLength; i++) {
      let randomCharacter = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );
      randomString += randomCharacter;
    }

    // Return the random string
    return randomString;
  } else {
    return false;
  }
};

// Export helpers
module.exports = helpers;
