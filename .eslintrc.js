module.exports = {
	env: {
		browser: true,
		commonjs: true,
		es2021: true,
	},
	extends: ["airbnb-base"],
	parserOptions: {
		ecmaVersion: 12,
	},
	rules: {
		"no-console": "off",
		"no-underscore-dangle": "off",
		"max-len": "off",
		"consistent-return": "off",
		"no-unused-vars": "off",
		quotes: ["error", "single", "double"],
	},
};
