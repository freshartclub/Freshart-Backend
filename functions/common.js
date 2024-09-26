const ArtworkMediaStyle = require("../models/artWorkMediaModel");
const ArtworkMediaTheme = require("../models/artWorkMediaThemeModel");
const ArtworkMediaTechnic = require("../models/artWorkMediaTechnicModel");
const ArtworkMediaSupport = require("../models/artWorkMediaSupportModel");

module.exports.createLog = (logName) => {
	try {
		return require("simple-node-logger").createRollingFileLogger({
			logDirectory: "logs", // NOTE: folder must exist and be writable...
			fileNamePattern: logName + "_<DATE>.log",
			dateFormat: "YYYY_MM_DD",
			timestampFormat: "YYYY-MM-DD HH:mm:ss",
		});
	} catch (error) {
		throw error;
	}
};

module.exports.getListArtworks = async (response) => {
	try {
		let data = [];

		let obj = {
			$lookup: {
				from: "categories",
				let: { category: "$category" },
				pipeline: [
					{
						$match: {
							$expr: {
								$in: ["$_id", "$$category"],
							},
						},
					},
					{
						$project: {
							categoryName: 1,
							categorySpanishName: 1,
						},
					},
				],
				as: "categories",
			},
		};

		switch (response) {
			case "style":
				data = await ArtworkMediaStyle.aggregate([
					{
						$match: {
							isDeleted: false,
						},
					},
					obj,
					{
						$project: {
							styleName: 1,
							spanishStyleName: 1,
							createdAt: 1,
							categoryName: {
								$reduce: {
									input: "$categories",
									initialValue: "",
									in: {
										$concat: [
											"$$value", // The accumulated string
											{
												$cond: {
													if: { $eq: ["$$value", ""] },
													then: "",
													else: ", ",
												},
											},
											"$$this.categoryName", // The current element
										],
									},
								},
							},
							categorySpanish: {
								$reduce: {
									input: "$categories",
									initialValue: "",
									in: {
										$concat: [
											"$$value", // The accumulated string
											{
												$cond: {
													if: { $eq: ["$$value", ""] },
													then: "",
													else: ", ",
												},
											},
											"$$this.categorySpanishName", // The current element
										],
									},
								},
							},
						},
					},
				]);
				break;

			case "theme":
				data = await ArtworkMediaTheme.aggregate([
					{
						$match: {
							isDeleted: false,
						},
					},
					obj,
					{
						$project: {
							styleName: 1,
							spanishStyleName: 1,
							categoryName: {
								$reduce: {
									input: "$categories",
									initialValue: "",
									in: {
										$concat: [
											"$$value", // The accumulated string
											{
												$cond: {
													if: { $eq: ["$$value", ""] },
													then: "",
													else: ", ",
												},
											},
											"$$this.categoryName", // The current element
										],
									},
								},
							},
							categorySpanish: {
								$reduce: {
									input: "$categories",
									initialValue: "",
									in: {
										$concat: [
											"$$value",
											{
												$cond: {
													if: { $eq: ["$$value", ""] },
													then: "",
													else: ", ",
												},
											},
											"$$this.categorySpanishName",
										],
									},
								},
							},
							_id: 0,
						},
					},
				]);
				break;

			case "technic":
				data = await ArtworkMediaTechnic.aggregate([
					{
						$match: {
							isDeleted: false,
						},
					},
					obj,
					{
						$project: {
							styleName: 1,
							spanishStyleName: 1,
							categoryName: {
								$reduce: {
									input: "$categories",
									initialValue: "",
									in: {
										$concat: [
											"$$value",
											{
												$cond: {
													if: { $eq: ["$$value", ""] },
													then: "",
													else: ", ",
												},
											},
											"$$this.categoryName",
										],
									},
								},
							},
							categorySpanish: {
								$reduce: {
									input: "$categories",
									initialValue: "",
									in: {
										$concat: [
											"$$value",
											{
												$cond: {
													if: { $eq: ["$$value", ""] },
													then: "",
													else: ", ",
												},
											},
											"$$this.categorySpanishName",
										],
									},
								},
							},
							_id: 0,
						},
					},
				]);
				break;

			case "support":
				data = await ArtworkMediaSupport.aggregate([
					{
						$match: {
							isDeleted: false,
						},
					},
					obj,
					{
						$project: {
							styleName: 1,
							spanishStyleName: 1,
							categoryName: {
								$reduce: {
									input: "$categories",
									initialValue: "",
									in: {
										$concat: [
											"$$value",
											{
												$cond: {
													if: { $eq: ["$$value", ""] },
													then: "",
													else: ", ",
												},
											},
											"$$this.categoryName",
										],
									},
								},
							},
							categorySpanish: {
								$reduce: {
									input: "$categories",
									initialValue: "",
									in: {
										$concat: [
											"$$value",
											{
												$cond: {
													if: { $eq: ["$$value", ""] },
													then: "",
													else: ", ",
												},
											},
											"$$this.categorySpanishName",
										],
									},
								},
							},
							_id: 0,
						},
					},
				]);
				break;
		}

		return data;
	} catch (error) {
		throw error;
	}
};
