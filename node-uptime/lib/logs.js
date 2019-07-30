/**
 * Library for storing and rotating logs
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// Container for the module
const lib = {};

// Base directory for the logs folder
lib.baseDir = path.join(__dirname, '/../.logs/');

/**
 * @desc Append a string to the file. Create the file if it does not exist
 * @param {object} file The file to append
 * @param {object} str The JSON object to append to the file
 * @param {func} callback
 */
lib.append = (file, str, callback) => {
  // Open file for appending
  fs.open(`${lib.baseDir}${file}.log`, 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Append to the file and close it
      fs.appendFile(fileDescriptor, `${str}\n`, (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false);
            } else {
              callback('Error closing file that was being appended');
            }
          });
        } else {
          callback('Error appending to file');
        }
      });
    } else {
      callback('Could not open file for appending');
    }
  });
};

/**
 * @desc List all logs
 * @param {bool} false if false ? include only uncompressed logs :
 *                     include both compressed and uncompressed logs
 * @param {func} callback
 */
lib.list = (includeCompressedLogs, callback) => {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && data) {
      let trimmedFileNames = [];
      data.forEach((fileName) => {
        // Add the .log files
        if (fileName.indexOf('.log') > -1) {
          trimmedFileNames.push(fileName.replace('.log', ''));
        }

        // Add on the .gz files if includeCompressedLogs is true
        if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        }
      });
      callback(false, trimmedFileNames);
    } else {
      callback(err, data);
    }
  });
};

/**
 * @desc Compress a .log file into a .gz.b64 file
 * @param {string} logId The name of the file to compress without
 *                        the .log extention.
 * @param {string} newFileId The name of the compressed file
 * @param {func} callback
 */
lib.compress = (logId, newFileId, callback) => {
  const sourceFile = `${logId}.log`;
  const destinationFile = `${newFileId}.gz.b64`;

  // Read the source file
  fs.readFile(`${lib.baseDir}${sourceFile}`, 'utf8', (err, inputString) => {
    if (!err && inputString) {
      // Compress the data using gzip
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          // Send the data to the destination file
          fs.open(
            `${lib.baseDir}${destinationFile}`,
            'wx',
            (err, fileDescriptor) => {
              if (!err && fileDescriptor) {
                // Write to the destination file
                fs.writeFile(
                  fileDescriptor,
                  buffer.toString('base64'),
                  (err) => {
                    if (!err) {
                      // Close the destination file
                      fs.close(fileDescriptor, (err) => {
                        if (!err) {
                          callback(false);
                        } else {
                          callback(err);
                        }
                      });
                    } else {
                      callback(err);
                    }
                  }
                );
              } else {
                callback(err);
              }
            }
          );
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

/**
 * @desc Decompress .gz.b64 file
 * @param {string} fileId The name of the file to compress without
 *                        the .gz.b64 extention.
 * @param {func} callback
 */
lib.decompress = (fileId, callback) => {
  const fileName = `${fileId}.gz.b64`;
  fs.readFile(`${lib.baseDir}${fileName}`, 'utf8', (err, str) => {
    if (!err && str) {
      // Decompress the data
      const inputBuffer = Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          const str = outputBuffer.toString();
          callback(false, str);
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

/**
 * @desc Truncate a log file
 * @param {string} logId The name of the file to truncate without
 *                        the .log extention.
 * @param {func} callback
 */
lib.truncate = (logId, callback) => {
  fs.truncate(`${lib.baseDir}${logId}.log`, 0, (err) => {
    if (!err) {
      callback(false);
    } else {
      callback(err);
    }
  });
};

module.exports = lib;
