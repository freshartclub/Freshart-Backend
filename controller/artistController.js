const Artist = require("../models/artistModel");

const login = async (req, res) => {
	try {
		return res.status(200).send({
			token,
			message: "Artist login Successfully",
		});
	} catch (error) {
		APIErrorLog.error("Error while login the artist");
		APIErrorLog.error(error);
		// error response
		return res.status(500).send({ message: "Something went wrong" });
	}
};

module.exports = {
	login,
};
