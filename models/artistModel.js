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
    isArtistRequest: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: String,
    },
    artistName: {
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
    avatar: {
      type: String,
    },
    password: {
      type: String,
      select: false,
    },
    nickName: {
      type: String,
    },
    // artworkStatus: {
    //   type: Object,
    // },
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
    // token: {
    //   type: String,
    // },
    tokens: {
      type: [String],
    },
    invoice: {
      type: Object,
    },
    logistics: {
      type: Object,
    },
    document: {
      type: Object,
    },
    managerDetails: {
      type: Object,
    },
    links: {
      type: Object,
    },
    OTP: {
      type: String,
    },
    // createdBy: {
    //   type: mongoose.Schema.Types.ObjectId,
    // },
    // updatedBy: {
    //   type: mongoose.Schema.Types.ObjectId,
    // },
    pageCount: {
      type: Number,
      default: 1,
    },
    passwordLinkToken: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Artist", artistSchema);
