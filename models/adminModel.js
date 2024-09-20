const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    firstName: {
      type: String
    },
    middleName: {
      type: String
    },
    lastName: {
      type: String
    },
    email: {
      type: String
    },
    status: {
      type: String,
      default: "active",
      enum: ['active', 'inactive']
    },
    roles: {
      type: String
    },
    gender: {
      type: String
    },
    dob: {
      type: Date
    },
    phone: {
      type: String
    },
    password: {
      type: String
    },
    OTP: {
      type: String
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    profileImage: {
      type: String
    },
    token: {
      type: String
    },
    tokens: {
      type: [String]
    },
    permission: {
      type: [String],
      default: []
    },
    adminId:{
      type: Number
    },
    access: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Admin", adminSchema);