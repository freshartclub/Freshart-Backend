const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const { fileUploadFunc } = require("../functions/common");
const Coupon = require("../models/couponModel");
const objectId = require("mongoose").Types.ObjectId;

const addCoupon = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const { id } = req.params;

  const { couponCode, discount, expiryDate, description, numOfUses } = req.body;

  if (id) {
    await Coupon.updateOne({ _id: id }, { $set: req.body });

    return res.status(200).json({
      success: true,
      message: "Coupon editted successfully",
    });
  } else {
    await Coupon.create({
      couponCode,
      discount,
      expiryDate,
      description,
      numOfUses,
    });

    return res.status(200).json({
      success: true,
      message: "Coupon added successfully",
    });
  }
});

const getCoupons = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean(true);

  res.status(200).json({
    success: true,
    data: coupons,
  });
});

const getCoupon = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const { id } = req.params;
  const coupon = await Coupon.findOne({ _id: id }).lean(true);

  res.status(200).json({
    success: true,
    data: coupon,
  });
});

module.exports = { addCoupon, getCoupons, getCoupon };
