const mongoose = require("mongoose");

const artistSchema = new mongoose.Schema(
	{
		artistName: {
			type: String,
		},
		artistId: {
			type: String,
		},
		email: {
			type: String,
		},
		artistSurname1: {
			type: String,
		},
		artistSurname2: {
			type: String,
		},
		nickName: {
			type: String,
		},
		status: {
			type: Object,
		},
		roles: {
			type: String,
			default: "artist",
		},
		gender: {
			type: String,
		},
		dob: {
			type: Date,
		},
		phone: {
			type: String,
		},
		language: {
			type: [String],
		},
		isManagerDetails: {
			type: Boolean,
			default: false,
		},
		address: {
			residentialAddress: {
				type: String,
			},
			city: {
				type: String,
			},
			zipCode: {
				type: String,
			},
			state: {
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
		highlights: {
			addHighlights: {
				type: String,
			},
			cv: {
				type: [Object],
			},
		},
		aboutArtist: {
			about: {
				type: String,
			},
			category: {
				type: [Object],
			},
		},
		profile: {
			type: Object,
		},
		token: {
			type: String,
		},
		tokens: {
			type: [String],
		},
		invoice: {
			type: Object,
		},
		logistics: {
			type: Object,
		},
		managerDetails: {
			type: Object,
		},
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
		},
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
		},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Artist", artistSchema);
