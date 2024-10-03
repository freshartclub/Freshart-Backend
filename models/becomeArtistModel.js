const mongoose = require("mongoose");

const artistSchema = new mongoose.Schema(
	{
		fullName: {
			type: String,
		},
		email: {
			type: String,
		},
		status: {
			type: String,
		},
		roles: {
			type: String,
			default: "artist",
		},
		phone: {
			type: String,
		},
		category: {
			type: String,
		},
		style: {
			type: String,
		},
		address: {
			city: {
				type: String,
			},
			zipCode: {
				type: String,
			},
			region: {
				type: String,
			},
			country: {
				type: String,
			},
			latitude: {
				type: String,
			},
			longitude: {
				type: String,
			},
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
		website: {
			type: String,
		},
		socialMedia: {
			type: String,
		},
		uploadFile: {
			type: String,
		},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("BecomeArtist", artistSchema);
