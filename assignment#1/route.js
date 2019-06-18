const handers = require('./handlers');

// Define router
const router = {
  hello: handers.hello,
  notFound: handers.notFound
};

module.exports = router;
