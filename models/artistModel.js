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
      enum: ["pending", "approved", "rejected", "ban"],
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
      type: [String],
    },
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
    commercilization: {
      type: Object,
    },
    logistics: {
      type: Object,
    },
    document: {
      documentName: {
        type: String,
      },
      documents: {
        type: Array,
      },
    },
    managerDetails: {
      type: Object,
    },
    links: {
      type: Array, // change it to array
    },
    OTP: {
      type: String,
    },
    pageCount: {
      type: Number,
      default: 1,
    },
    passwordLinkToken: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Artist", artistSchema);
