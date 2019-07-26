// Instantiate the workers object
const workers = {};

// Look up all checks, get their data, and send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        // Read in the check data
        _data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // Pass the data to the check validator and let the function
            // continue or log error as needed
            workers.validateCheckData(originalCheckData);
          } else {
            console.log("Error reading one of the check's data");
          }
        });
      });
    } else {
      console.log('Error: Could not find any checks to process');
    }
  });
};

// Sanity check the check data
workers.validateCheckData = (originalCheckData) => {
  originalCheckData =
    typeof originalCheckData === 'object' && originalCheckData !== null
      ? originalCheckData
      : {};
  originalCheckData.id =
    typeof originalCheckData.id === 'string' &&
    originalCheckData.id.trim().length === 20
      ? originalCheckData.id.trim()
      : false;
  originalCheckData.userPhone =
    typeof originalCheckData.userPhone === 'string' &&
    originalCheckData.userPhone.trim().length === 10
      ? originalCheckData.userPhone.trim()
      : false;
  originalCheckData.protocol =
    typeof originalCheckData.protocol === 'string' &&
    ['https', 'http'].indexOf(originalCheckData.protocol) > -1
      ? originalCheckData.protocol
      : false;
  originalCheckData.url =
    typeof originalCheckData.url === 'string' &&
    originalCheckData.url.trim().length > 0
      ? originalCheckData.url.trim()
      : false;
  originalCheckData.method =
    typeof originalCheckData.method === 'string' &&
    ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1
      ? originalCheckData.method
      : false;
  originalCheckData.successCodes =
    typeof originalCheckData.successCodes === 'object' &&
    originalCheckData.successCodes instanceof Array &&
    originalCheckData.successCodes.length > 0
      ? originalCheckData.successCodes
      : false;
  originalCheckData.timeoutSeconds =
    typeof originalCheckData.timeoutSeconds === 'number' &&
    originalCheckData.timeoutSeconds % 1 === 0 &&
    originalCheckData.timeoutSeconds >= 1 &&
    originalCheckData.timeoutSeconds <= 5
      ? originalCheckData.timeoutSeconds
      : false;

  // Set the keys that may not be set (if the workers have never seen
  // this checks before)
  originalCheckData.state =
    typeof originalCheckData.state === 'string' &&
    ['up', 'down'].indexOf(originalCheckData.state) > -1
      ? originalCheckData.state
      : 'down';
  originalCheckData.lastChecked =
    typeof originalCheckData.lastChecked === 'number' &&
    originalCheckData.lastChecked > 0
      ? originalCheckData.lastChecked
      : false;

  // If all the checks passed, pass the data along tothe next step in the process
  if (
    originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.timeoutSeconds &&
    originalCheckData.method &&
    originalCheckData.successCodes
  ) {
    workers.performCheck(originalCheckData);
  } else {
    // If checks fail, log the error and fail silently
    console.log(
      'Error: One of the checks is not properly formatted. Skipping..'
    );
  }
};

// Process the check outcome, update the check data as needed, and
// trigger an alert to user if needed
// Special logic for accomodating a check that has never been tested before (
// dont't alert on that)
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  console.log(checkOutcome);
  // Decide if the check is considered up or down
  const state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
      ? 'up'
      : 'down';

  // Decide if an alert is warranted
  const alertWarranted =
    originalCheckData.lastChecked && originalCheckData.state !== state
      ? true
      : false;

  // Update the check data
  let newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  // Save the update
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (!err) {
      // Send the new check data to the next phase of the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log('Check outcome has not changed. No alert needed');
      }
    } else {
      console.log('Error trying to save update to one of the checks');
    }
  });
};

// Alert the user to a change in their check status
workers.alertUserToStatusChange = (newCheckData) => {
  const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} 
    ${newCheckData.protocol}://${newCheckData.url} is currently ${
    newCheckData.state
  }`;
  helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) => {
    if (!err) {
      console.log(
        `Success: User was alerted to a status change in their checks ${msg}`
      );
    } else {
      console.log(
        'Error: Could not alert user to a status change in their checks'
      );
    }
  });
};

// Perform the checks, send the originalCheckData and the outcome
// of the check process to the next step in the process.
workers.performCheck = (originalCheckData) => {
  // Prepare the initial check outcome
  let checkOutcome = {
    error: false,
    responseCode: false
  };

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // Parse hostname and path out of the originalCheckData
  const parsedUrl = url.parse(
    `${originalCheckData.protocol}://${originalCheckData.url}`,
    true
  );
  const hostname = parsedUrl.hostname;
  const path = parsedUrl.path; // Using path not 'pathname' b/c we want the query string

  // Construct the request
  // The method is expected to be in uppercase
  const requestDetails = {
    path,
    hostname,
    protocol: `${originalCheckData.protocol}:`,
    method: originalCheckData.method.toUpperCase(),
    timeout: originalCheckData.timeoutSeconds * 1000 // convert the timeout to seconds
  };

  // Instantiate the request object
  const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
  const req = _moduleToUse.request(requestDetails, (res) => {
    const status = res.statusCode;

    // Update the checkOutcome and pass the data along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so that it doesn't get thrown
  req.on('error', (err) => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: err
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event. This event will be throw is the request
  // exceeds the timeoutSeconds
  req.on('timeout', (err) => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: 'timeout'
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};

// Timer to execute the worker-process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 10);
};

// Init workers
workers.init = () => {
  // Execute all the checks immediately
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();
};

// Export workers
module.exports = workers;
