## Node.js Masterclass Assignment 1

This is a simple `Hello World` RESTful API

### How to run the app
- Clone the repo
- Run `node index.js`. The app will start on port 4000
- Make a GET request to the URL `localhost:4000/hello`
jo- The response will be in *JSON* with the format:
   ```
   {
      message: "Hello <device username>",
      System information: {
        hostname: "device hostname>",
        username: "device username>",
        address: "<device address>",
        sysArch: "<device architecture>",
        platform: "<device platform>",
      },
    }
   ```


