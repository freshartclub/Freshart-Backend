const mongoose = require("mongoose");
const BecomeArtist = require("../models/becomeArtistModel");
const Artist = require("../models/artistModel");

const { createLog, fileUploadFunc } = require("../functions/common");

const { sendMail } = require("../functions/mailer");

const APIErrorLog = createLog("API_error_log");

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

const becomeArtist = async (req, res) => {
	try {
		const checkDuplicate = await Artist.countDocuments({
			$or: [
				{ phone: req.body.phone.replace(/[- )(]/g, "").trim() },
				{ email: req.body.email.toLowerCase() },
			],
			isDeleted: false,
		});

		if (checkDuplicate) {
			return res.status(400).send({
				message:
					"These credentials have already been used. Please use different credentials.",
			});
		}

		let obj = {
			fullName: req.body.fullName
				.toLowerCase()
				.replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
				.trim(),
			phone: req.body.phone.replace(/[- )(]/g, "").trim(),
			email: req.body.email.toLowerCase(),
			category: req.body.category,
			style: req.body.style,
			socialMedia: req.body.socialMedia,
			website: req.body.website,
		};

		obj["address"] = {
			city: req.body.city.trim(),
			region: req.body.region.trim(),
			country: req.body.country.trim(),
			zipCode: String(req.body.zipCode),
		};

		const fileData = await fileUploadFunc(req, res);

		if (fileData.type !== "success") {
			return res.status(fileData.status).send({
				message: fileData.type,
			});
		}

		obj["_id"] = mongoose.Types.ObjectId(fileData.data.slice(0, 24));
		await BecomeArtist.create(obj);

		const mailVariable = {
			"%fullName%": obj.fullName,
			"%phone%": obj.phone,
			"%email%": obj.email,
		};

		sendMail("become-an-artist", mailVariable, obj.email);

		return res.status(200).send({
			message: "Your Become Artist request sent successfully.",
		});
	} catch (error) {
		APIErrorLog.error("Error while register the artist information");
		APIErrorLog.error(error);
		// error response
		return res.status(500).send({ message: "Something went wrong" });
	}
};

module.exports = {
	login,
	becomeArtist,
};
