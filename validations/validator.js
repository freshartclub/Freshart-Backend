const { body } = require("express-validator");
const loginData = [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email or phone number is required")
    .isEmail()
    .withMessage("Invalid email format")
    .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .withMessage("Please enter a valid email address"),
  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Password is required"),
];

module.exports = {
  loginData,
};
