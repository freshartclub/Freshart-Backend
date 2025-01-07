const Plan = require("../models/plansModel");
const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const { fileUploadFunc } = require("../functions/common");

const addPlan = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const { id } = req.params;
  const fileData = await fileUploadFunc(req, res);

  let payload = {
    planGrp: req.body.planGrp,
    planName: req.body.planName,
    planDesc: req.body.planDesc,
    standardPrice: req.body.standardPrice,
    standardYearlyPrice: req.body.standardYearlyPrice,
    currentPrice: req.body.currentPrice,
    currentYearlyPrice: req.body.currentYearlyPrice,
    defaultArtistFees: req.body.defaultArtistFees,
    numArtworks: req.body.numArtworks,
    individualShipment: req.body.individualShipment,
    logCarrierSubscription: req.body.logCarrierSubscription,
    logCarrierPurchase: req.body.logCarrierPurchase,
    purchaseDiscount: req.body.purchaseDiscount,
    limitPurchaseDiscount: req.body.limitPurchaseDiscount,
    discountSubscription: req.body.discountSubscription,
    monthsDiscountSubscription: req.body.monthsDiscountSubscription,
    planData: req.body.planData,
    status: req.body.status,
  };

  if (fileData.data !== undefined) {
    payload["planImg"] = fileData.data.planImg[0].filename;
  }

  const condition = { $set: payload };

  if (id === undefined) {
    await Plan.create(payload);
    return res.status(200).send({ message: "Plan added successfully" });
  } else {
    Plan.updateOne({ _id: id }, condition).then();
    return res.status(200).send({ message: "Plan updated successfully" });
  }
});

const getPlans = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  // const plans = await Plan.find({}).lean(true);

  const plans = await Plan.aggregate([
    {
      $lookup: {
        from: "catalogs",
        localField: "planGrp",
        foreignField: "_id",
        as: "catData",
      },
    },
    {
      $unwind: {
        path: "$catData",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        planGrp: {
          _id: "$catData._id",
          catalogName: "$catData.catalogName",
        },
        planName: 1,
        planDesc: 1,
        standardPrice: 1,
        standardYearlyPrice: 1,
        currentPrice: 1,
        currentYearlyPrice: 1,
        defaultArtistFees: 1,
        numArtworks: 1,
        individualShipment: 1,
        logCarrierSubscription: 1,
        logCarrierPurchase: 1,
        purchaseDiscount: 1,
        limitPurchaseDiscount: 1,
        discountSubscription: 1,
        monthsDiscountSubscription: 1,
        planData: 1,
        status: 1,
      },
    },
  ]);

  res
    .status(200)
    .send({ data: plans, url: "https://dev.freshartclub.com/images" });
});

const getPlanById = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const { id } = req.params;
  const plan = await Plan.findOne({ _id: id }).lean(true);
  res
    .status(200)
    .send({ data: plan, url: "https://dev.freshartclub.com/images" });
});

module.exports = { addPlan, getPlans, getPlanById };
