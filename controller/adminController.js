const Admin = require("../models/adminModel");

const login = async (req, res) => {
	try {
		return res.status(200).send({
			token,
			message: "Admin login Successfully",
		});
	} catch (error) {
		APIErrorLog.error("Error while login the admin");
		APIErrorLog.error(error);
		// error response
		return res.status(500).send({ message: "Something went wrong" });
	}
};

module.exports = {
	login,
};
