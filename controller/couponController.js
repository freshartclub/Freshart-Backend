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

  const payload = {
    code: req.body.code,
    name: req.body.name,
    note: req.body.note,
    validFrom: req.body.validFrom,
    validTo: req.body.validTo,
    restriction: req.body.restriction,
    usage: req.body.usage,
    subscriptionPlan: req.body.subscriptionPlan,
    catalogs: req.body.catalogs,
    extension: req.body.extension,
    discount: req.body.discount,
    disAmount: req.body.disAmount,
  };

  if (id !== "null") {
    await Coupon.updateOne({ _id: id }, { $set: payload });

    return res.status(200).send({
      message: "Coupon editted successfully",
    });
  } else {
    await Coupon.create(payload);

    return res.status(200).send({
      message: "Coupon added successfully",
    });
  }
});

const getCoupons = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  let { s } = req.query;
  s = s === "undefined" || typeof s === "undefined" ? "" : s;

  const coupons = await Coupon.aggregate([
    {
      $match: {
        $or: [
          { code: { $regex: s, $options: "i" } },
          { name: { $regex: s, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        code: 1,
        name: 1,
        validFrom: 1,
        validTo: 1,
        restriction: 1,
        usage: 1,
        subscriptionPlan: 1,
        catalogs: 1,
        extension: 1,
        discount: 1,
        disAmount: 1,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    }
  ]);

  return res.status(200).send({ data: coupons });
});

const getCoupon = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  const coupon = await Coupon.findOne({ _id: id }).lean(true);

  return res.status(200).send({ data: coupon });
});

module.exports = { addCoupon, getCoupons, getCoupon };
