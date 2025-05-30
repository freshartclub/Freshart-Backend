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
    },
    cart: [{ type: mongoose.Schema.Types.ObjectId, default: [] }],
    offer_cart: [
      {
        artwork: { type: mongoose.Schema.Types.ObjectId },
        offerprice: { type: Number },
        type: { type: String },
      },
    ],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId }],
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
    order_OTP: {
      type: Object,
    },
    pageCount: {
      type: Number,
      default: 1,
    },
    monthlyNegotiations: { type: Number, default: 12 },
    views: {
      type: Number,
      default: 0,
    },
    invite: {
      inviteId: { type: mongoose.Schema.Types.ObjectId },
      code: { type: String },
      isUsed: { type: Boolean, default: false },
    },
    passwordLinkToken: { type: String },
    card: {
      pay_ref: { type: String },
      pmt_ref: { type: String },
      card_stored: { type: Boolean },
      card_details: { type: Object },
    },
    isCardExpired: { type: Boolean },
    isCardExpiring: { type: String },
    prev_saved: { type: Boolean },
    isSubscribed: { type: Boolean },
    referralCode: { type: String },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
  }
);

artistSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("Artist", artistSchema);
