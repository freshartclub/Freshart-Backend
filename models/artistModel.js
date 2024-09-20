const mongoose = require("mongoose");

const artistSchema = new mongoose.Schema(
	{
		firstName: {
			type: String,
		},
		middleName: {
			type: String,
		},
		lastName: {
			type: String,
		},
		email: {
			type: String,
		},
		secondLastName: {
			type: String
		},
		nickName: {
			type: String
		},
		status: {
			type: String,
			enum: ["active", "inactive", "pending"]
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
		phone1: {
			type: String,
		},
		views: {
			type: Number,
			default: 0,
		},
		likes: {
			type: [String],
			default: [],
		},
		followers: {
			type: [mongoose.Schema.Types.ObjectId],
		},
		skills: {
			type: [String],
		},
		usaResidencyStatus: {
			type: String
		},
		language: {
			type: String
		},
		ssn: {
			type: String
		},
		incomeLevel: {
			type: String
		},
		income: {
			type: String
		},
		native: {
			type: [String]
		},
		isNative: {
			type: Boolean,
			default: false
		},
		address: {
			residentialAddress: {
				type: String,
			},
			apartment: {
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
			citizenShip: {
				type: String,
			},
			latitude: {
				type: String,
			},
			longitude: {
				type: String
			}
		},
		works: {
			type: Number,
			default: 0,
		},
		description: {
			type: String,
		},
		password: {
			type: String,
		},
		OTP: {
			type: String
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
		deletedStatus: {
			type: String
		},
		isVerified: {
			type: Boolean,
			default: false,
		},
		profileImage: {
			type: String,
		},
		token: {
			type: String,
		},
		tokens: {
			type: [String],
		},
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
		},
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
		},
		subscriptionPlanId: {
			type: mongoose.Schema.Types.ObjectId
		},
		biography: {
			type: String,
		},

		followedArtist: {
			type: [mongoose.Schema.Types.ObjectId],
		},
		currentWebURL: {
			type: String,
		},
		socialAccounts: {
			type: Array,
		},
		shippingInfo: {
			socialLink: {
				type: String,
			},
			URL: {
				type: String,
			},
			shippingCountry: {
				type: String,
			},
			residentalAddress: {
				type: String,
			},
			apartment: {
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
				type: String
			}
		},
		additionalInfo: {
			isCommissions: {
				type: Boolean,
				default: false,
			},
			isPrivateClients: {
				type: Boolean,
				default: false,
			},
			isCommissionsCustomers: {
				type: Boolean,
				default: false,
			},
			isMurals: {
				type: Boolean,
				default: false,
			},
			isCreatingMurals: {
				type: Boolean,
				default: false,
			},
			sellArtSubscription: {
				type: Boolean
			}
		},
		knownArtistInfo: {
			type: Array
		},
		selfIdentification: {
			type: [Object],
		},
		termination: {
			reason: {
				type: String
			},
			date: {
				type: Date
			}
		},
		artistId: {
			type: Number
		},
		isCompletedForm: {
			type: Boolean,
			default: false
		},
		contactVerification: {

			isEmailVerified: {
				type: Boolean,
				default: false
			},

			isPhoneVerified: {
				type: Boolean,
				default: false
			},
		},
		isArtistCurated: {
			type: Boolean,
			default: false
		},
		customerId: {
			type: String
		},
		isPauseSubscription: {
			type: Boolean,
			default: false
		},
		accountId: {
			type: String
		},
		favoriteArt: {
			type: [mongoose.Schema.Types.ObjectId],
			default: [],
		},
		artworkId: {
			type: String
		},
		marketPlaceURL: {
			type: String
		},
		artistIdStr: {
			type: String
		},
		signature: {
			digitalSignature: {
				type: String
			},
			date: {
				type: Date
			}
		},
		IdentificationArray: {
			type: [String]
		},
		isSafeSearch: {
			type: Boolean,
			default: true
		},
		ipAddress: {
			type: String
		}
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Artist", artistSchema);
