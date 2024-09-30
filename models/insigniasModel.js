const mongoose = require("mongoose");

const insigniaSchema = new mongoose.Schema(
	{
		isDeleted: {
			type: Boolean,
			default: false,
		},
		areaName: {
			type: String,
		},
		group: {
			type: String,
		},
		priority: {
			type: String,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		uploadImage: {
			type: String,
		},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Insignia", insigniaSchema);
