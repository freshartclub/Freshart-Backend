const mongoose = require("mongoose");

const artistSchema = new mongoose.Schema(
  {
    isActivated: {
      type: Boolean,
      default: false,
    },
    artistId: {
      type: String,
    },
    role: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isArtistRequest: {
      type: Boolean,
      default: false,
    },
    isArtistRequestStatus: {
      type: String,
      enum: ["pending", "processing", "approved", "rejected", "ban"],
    },
    userId: {
      type: String,
    },
    artistName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: [true, "Email already exists"],
      trim: true,
    },
    artistSurname1: {
      type: String,
      trim: true,
    },
    artistSurname2: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    password: {
      type: String,
      select: false,
    },
    nickName: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
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
      type: String,
    },
    currency: {
      type: String,
    },
    likedArtworks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ArtWork",
      },
    ],
    isManagerDetails: {
      type: Boolean,
      default: false,
    },
    insignia: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Insignia",
      },
    ],
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
    cart: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ArtWork",
        },
        quantity: {
          type: Number,
          default: 1,
        },
      },
    ],
    wishlist: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "ArtWork",
      default: [],
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
      discipline: {
        type: [Object],
      },
    },
    profile: {
      type: Object,
    },
    tokens: {
      type: [String],
    },
    invoice: {
      type: Object,
    },
    artistSeriesList: {
      type: Array,
    },
    commercilization: {
      type: Object,
      publishingCatalog: [Object],
    },
    billingInfo: [
      {
        billingDetails: {
          type: Object,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    logistics: {
      type: Object,
    },
    profileStatus: {
      type: String,
    },
    lastRevalidationDate: {
      type: Date,
    },
    nextRevalidationDate: {
      type: Date,
    },
    previousRevalidationDate: [{ type: Object }],
    documents: {
      type: Array,
    },
    otherTags: {
      type: Object,
    },
    extraInfo: {
      type: Object,
    },
    emergencyInfo: {
      type: Object,
    },
    managerDetails: {
      type: Object,
    },
    reviewDetails: {
      type: Object,
    },
    links: {
      type: Array,
    },
    OTP: {
      type: String,
    },
    pageCount: {
      type: Number,
      default: 1,
    },
    views: {
      type: Number,
      default: 0,
    },
    passwordLinkToken: { type: String },
    wallet: {
      id: { type: String },
      access_token: { type: String },
      time_created: { type: String },
      seconds_to_expire: { type: String },
    },
    referralCode: { type: String },
  },
  {
    timestamps: true,
  }
);

artistSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("Artist", artistSchema);
