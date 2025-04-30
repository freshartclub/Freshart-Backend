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
const SubscribeArtwork = require("../models/subscribeArtwork");
const { checkValidations } = require("../functions/checkValidation");
const { sendMail } = require("../functions/mailer");

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
        pipeline: [{ $project: { _id: 1, planName: 1, planGrp: 1, catalogs: 1 } }],
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
        planGrp: "$plan.planGrp",
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
    const planGrp = sub.planGrp;

    sub.plan.catalogs.artworkList.forEach((artId) => {
      const strId = artId.toString();
      if (isCurrent) {
        currentPlanArtworkMap.set(strId, { planName, planGrp });
      } else if (!currentPlanArtworkMap.has(strId)) {
        otherPlanArtworkMap.set(strId, { planName, planGrp });
      }
    });
  });

  const presentInCurrentPlan = [];
  const errorDetails = [];

  allRequestedIds.forEach((id) => {
    const planData = otherPlanArtworkMap.get(id);

    if (currentPlanArtworkMap.has(id)) {
      presentInCurrentPlan.push(id);
    } else if (otherPlanArtworkMap.has(id)) {
      errorDetails.push({
        artworkId: id,
        status: "inOtherPlan",
        planName: planData.planName,
        planGrp: planData.planGrp,
        message: `This artwork is not in your currently active plan but is available in another plan: ${planData.planGrp} - ${planData.planName}.`,
      });
    } else {
      errorDetails.push({
        artworkId: id,
        status: "notInAnyPlan",
        planName: null,
        planGrp: null,
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

const confrimExchange = catchAsyncError(async (req, res, next) => {
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

  const { subscribeIds, exchangeIds, returnDate, pickupDate, instructions } = req.body;

  if (exchangeIds && exchangeIds.length > 0) {
    // if user has already has an another artwork
    const exchange = await SubscribeArtwork.find({ artwork: { $in: exchangeIds }, user: req.user._id, status: "active" }).lean();

    if (exchange.length !== exchangeIds.length) {
      return res.status(400).send({
        message: "Some artworks were not found in your exchange request.",
      });
    }
  }

  // if user has no another artwork
  const validArtworks = await ArtWork.find({ _id: { $in: subscribeIds }, status: "published" }, { owner: 1, artworkName: 1, artworkId: 1 }).lean();
  const artOwners = new Set();

  if (validArtworks.length !== subscribeIds.length) {
    return res.status(400).send({
      message: "Some artworks were not found or are not available for subscription.",
    });
  }

  for (let i = 0; i < subscribeIds.length; i++) {
    if (validArtworks[i].owner.toString() === req.user._id.toString()) {
      return res.status(400).send({
        message: "You cannot subscribe to your own artwork.",
      });
    }
  }

  const newSub = await SubscribeArtwork.create({
    user: req.user._id,
    artwork: subscribeIds,
    pickupDate,
    returnDate,
    instructions,
    status: "requested",
  });

  let langCode = req.body?.langCode || "EN";
  if (langCode == "GB") langCode = "EN";

  const findEmail = await EmailType.findOne({
    emailType: "artwork-subscribe-request",
    emailLang: langCode,
    isDeleted: false,
  }).lean(true);

  artOwners.forEach(async (owner) => {
    const artist = await Artist.findOne({ _id: owner }, { email: 1, artistName: 1 }).lean();

    let artworkRows = artworks
      .map(
        (art) => `
      <tr>
        <td><img src="${art.image}" alt="${art.name}" width="100"/></td>
        <td>${art.name}</td>
        <td>${art._id}</td>
        <td>
          <a href="https://freshartclub.com/artist-panel">Accept / Reject</a>
        </td>
      </tr>
    `
      )
      .join("");

    const mailVariable = {
      "%head%": findEmail.emailHead,
      "%email%": artist.email,
      "%msg%": findEmail.emailDesc,
      "%name%": artist.artistName,
      "%userName%": req.user.artistName,
    };

    await sendMail("sample-email", mailVariable, email);
  });

  return res.status(200).json({
    message: "Exchange Requested Successfully.",
    data: newSub,
  });
});

module.exports = { checkOutSub, confrimExchange };
