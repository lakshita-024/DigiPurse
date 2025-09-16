const validator = require("validator");

const validateRegisterInput = (data) => {
  const errors = {};

  if (!validator.isEmail(data.email)) {
    errors.email = "Invalid email";
  }

  if (data.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

module.exports = validateRegisterInput;
