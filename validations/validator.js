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
const userChangePassword = [
	body("password")
		.exists({ checkFalsy: true })
		.withMessage("Please enter the current password"),

	body("newPassword")
		.exists({ checkFalsy: true })
		.withMessage("Please enter the new Password")
		.isLength({ min: 8 })
		.withMessage(
			"The Password must be a minimum of 8 characters long and include at least one number digit, one uppercase letter, one lowercase letter, and one special character (@, $, !, %, *, ?, &)."
		)
		.matches(
			/^(?=.*?[A-Z])(?=(.*[a-z]){1,})(?=(.*[\d]){1,})(?=(.*[\W]){1,})(?!.*\s).{5,}$/
		)
		.withMessage(
			"The Password must be a minimum of 8 characters long and include at least one number digit, one uppercase letter, one lowercase letter, and one special character (@, $, !, %, *, ?, &)."
		),

	body("confirmPassword")
		.exists({ checkFalsy: true })
		.withMessage("Please enter the confirm Password"),
];
module.exports = {
  loginData,
  userChangePassword
};
