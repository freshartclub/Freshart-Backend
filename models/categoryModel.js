const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
	{
		isDeleted: {
			type: Boolean,
			default: false,
		},
		categoryName: {
			type: String,
		},
		categorySpanishName: {
			type: String,
		},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Category", categorySchema);
