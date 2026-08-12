const { createAccessToken } = require('../../src/utils/token');

const makeToken = ({ sub = 1, role = 'Admin', firstName = 'Test', lastName = 'User' } = {}) => {
  const payload = { sub, role, firstName, lastName };
  return createAccessToken(payload);
};

module.exports = { makeToken };
