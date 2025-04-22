const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const objectId = require("mongoose").Types.ObjectId;
const { fileUploadFunc, generateRandomOrderId, generateSchedulerRef } = require("../functions/common");
const Order = require("../models/orderModel");
const Transaction = require("../models/transactionModel");
const Plan = require("../models/plansModel");
const Subscription = require("../models/subscriptionModel");
const axios = require("axios");
const { validationResult } = require("express-validator");
const SubscriptionTransaction = require("../models/subscriptionTransaction");
const { checkValidations } = require("../functions/checkValidation");

const checkOutSub = catchAsyncError(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const checkValid = await checkValidations(errors);
  if (checkValid.type === "error") {
    return res.status(400).send({
      message: checkValid.errors.msg,
    });
  }

  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).send({ message: "Please provide valid artwork ids." });
  }

  const artist = await Artist.findOne({ _id: req.user._id }, { cart: 1 }).lean();

  const artworks = await ArtWork.find(
    {
      _id: { $in: artist.cart.map((art) => art.item) },
      "commercialization.activeTab": "subscription",
      status: "published",
      isDeleted: false,
    },
    { _id: 1, commercialization: 1 }
  ).lean();

  const foundIds = artworks.map((art) => art._id.toString());
  const missingIds = ids.filter((id) => !foundIds.includes(id));

  if (missingIds.length > 0) {
    return res.status(404).send({
      message: "Some artworks were not found or are not available for subscription.",
      missingArtworks: missingIds,
    });
  }

  const allRequestedIds = ids.map((id) => id.toString());

  const subPlans = await Subscription.aggregate([
    {
      $match: { user: objectId(req.user._id), status: "active" },
    },
    {
      $lookup: {
        from: "plans",
        localField: "plan",
        foreignField: "_id",
        pipeline: [{ $project: { _id: 1, name: 1, catalogs: 1 } }],
        as: "plan",
      },
    },
    { $unwind: "$plan" },
    {
      $lookup: {
        from: "catalogs",
        localField: "plan.catalogs",
        foreignField: "_id",
        pipeline: [{ $project: { _id: 1, artworkList: 1 } }],
        as: "plan.catalogs",
      },
    },
    { $unwind: "$plan.catalogs" },
    {
      $project: {
        _id: 1,
        isCurrActive: 1,
        planName: "$plan.planName",
        "plan.catalogs.artworkList": 1,
      },
    },
  ]);

  const currentPlanArtworkMap = new Map();
  const otherPlanArtworkMap = new Map();

  subPlans.forEach((sub) => {
    const isCurrent = sub.isCurrActive;
    const planName = sub.planName;

    sub.plan.catalogs.artworkList.forEach((artId) => {
      const strId = artId.toString();
      if (isCurrent) {
        currentPlanArtworkMap.set(strId, planName);
      } else if (!currentPlanArtworkMap.has(strId)) {
        otherPlanArtworkMap.set(strId, planName);
      }
    });
  });

  const presentInCurrentPlan = [];
  const errorDetails = [];

  allRequestedIds.forEach((id) => {
    if (currentPlanArtworkMap.has(id)) {
      presentInCurrentPlan.push(id);
    } else if (otherPlanArtworkMap.has(id)) {
      errorDetails.push({
        artworkId: id,
        status: "inOtherPlan",
        planName: otherPlanArtworkMap.get(id),
        message: `This artwork is not in your currently active plan but is available in another plan: ${otherPlanArtworkMap.get(id)}`,
      });
    } else {
      errorDetails.push({
        artworkId: id,
        status: "notInAnyPlan",
        planName: null,
        message: "This artwork is not available in any of your subscription plans.",
      });
    }
  });

  if (errorDetails.length > 0) {
    return res.status(400).json({
      message: "Some artworks are not accessible under your current subscription.",
      notInCurrentPlan: errorDetails,
    });
  }

  return res.status(200).json({
    message: "All artworks are available under your current subscription.",
    validArtworks: presentInCurrentPlan,
  });
});

module.exports = { checkOutSub };
