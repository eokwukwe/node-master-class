/**
 * Create and export configuration environment
 */

// Container for all environment
let environments = {};

// Staging {default} environment
environments.staging = {
  httpPort: 4000,
  httpsPort: 4001,
  envName: 'staging'
};

// Production environment
environments.production = {
  httpPort: 8000,
  httpsPort: 8001,
  envName: 'production'
};

// Determine which environment was passed as a command-line argument
const currentEnvironment =
  typeof process.env.NODE_ENV === 'string'
    ? process.env.NODE_ENV.toLowerCase()
    : '';

// Check that the current environment is one of the above environments, if not, default to staging
const environmentToExport =
  typeof environments[currentEnvironment] === 'object'
    ? environments[currentEnvironment]
    : environments.staging;

// Export environment
module.exports = environmentToExport;
