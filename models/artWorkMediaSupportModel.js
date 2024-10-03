const mongoose = require("mongoose");

const artworkMediaSupportSchema = new mongoose.Schema(
	{
		isDeleted: {
			type: Boolean,
			default: false,
		},
		styleName: {
			type: String,
		},
		spanishStyleName: {
			type: String,
		},
		category: {
			type: [mongoose.Schema.Types.ObjectId],
		},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model(
	"ArtworkMediaSupport",
	artworkMediaSupportSchema
);
