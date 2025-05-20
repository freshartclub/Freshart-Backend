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
const { getShipmentAccessToken } = require("../functions/getAccessToken");

const languageCode = ["EN", "CAT", "ES"];

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const generateRef = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "";
  for (let i = 0; i < 8; i++) {
    ref += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return ref;
};

const generateFACRef = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "FAC-INV-";
  for (let i = 0; i < 4; i++) {
    ref += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  ref += "-";
  let numbers = "0123456789";
  for (let i = 0; i < 4; i++) {
    ref += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  return ref;
};

const formatTime = (time) => {
  const d = new Date(time);
  return `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
};

const name = (val) => {
  let fullName = val?.artistName || "";

  if (val?.nickName) fullName += " " + `"${val?.nickName}"`;
  if (val?.artistSurname1) fullName += " " + val?.artistSurname1;
  if (val?.artistSurname2) fullName += " " + val?.artistSurname2;

  return fullName.trim();
};

const checkOutSub = catchAsyncError(async (req, res, next) => {
  const errors = validationResult(req);
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
  if (!artist) return res.status(400).send({ message: "Artist not found" });

  const artworks = await ArtWork.find(
    {
      _id: { $in: artist.cart },
      "commercialization.activeTab": "subscription",
      status: "published",
    },
    { _id: 1, commercialization: 1 }
  ).lean();

  const foundIds = artworks.map((art) => art._id.toString());
  const missingIds = ids.filter((id) => !foundIds.includes(id));

  if (missingIds.length > 0) {
    return res.status(400).send({
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

  const checkValid = await checkValidations(errors);
  if (checkValid.type === "error") {
    return res.status(400).send({
      message: checkValid.errors.msg,
    });
  }

  const { subscribeIds, exchangeIds, returnDate, pickupDate, instructions } = req.body;

  if (exchangeIds && exchangeIds.length > 0) {
    const exchange = await SubscribeArtwork.find({ artwork: { $in: exchangeIds }, user: req.user._id, status: "active" }).lean();

    if (exchange.length !== exchangeIds.length) {
      return res.status(400).send({
        message: "Some artworks were not found in your exchange request.",
      });
    }
  }

  // if user has no another artwork
  const validArtworks = await ArtWork.find({ _id: { $in: subscribeIds }, status: "published" }, { owner: 1, artworkName: 1, artworkId: 1 }).lean();
  let artOwners = new Set();

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

  validArtworks.forEach((art) => {
    artOwners.add(art.owner);
  });

  let langCode = "EN";
  if (req.body?.langCode && languageCode.includes(req.body?.langCode)) {
    langCode = req.body.langCode;
  }

  const findEmail = await EmailType.findOne({
    emailType: "artwork-subscribe-request",
    emailLang: langCode,
    isDeleted: false,
  }).lean(true);

  artOwners.forEach(async (owner) => {
    const artist = await Artist.findOne({ _id: owner }, { email: 1, artistName: 1 }).lean();

    let artworkRows = validArtworks
      .map(
        (art) => `
      <tr>
        <td><img src="${art.image}" alt="${art.name}" width="100"/></td>
        <td>${art.name}</td>
        <td>
          <a href="https://freshartclub.com/artist-panel/order/approve-order?id=${newSub._id}">Accept / Reject</a>
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

const createPurchaseLogistics = catchAsyncError(async (req, res, next) => {
  const errors = validationResult(req);
  const checkValid = await checkValidations(errors);
  if (checkValid.type === "error") {
    return res.status(400).send({
      message: checkValid.errors.msg,
    });
  }

  const access_token = getShipmentAccessToken(req, res);
  const { id: userId } = req.params;
  const { ids: artworkIds, morningFrom, morningTo, eveningFrom, eveningTo, observe } = req.body;

  const [artist, user] = await Promise.all([
    Artist.findOne(
      { _id: req.user._id, isActivated: true },
      { address: 1, email: 1, phone: 1, nickName: 1, artistName: 1, artistSurname1: 1, artistSurname2: 1, artistId: 1 }
    ).lean(),
    Artist.findOne(
      { _id: userId },
      { address: 1, email: 1, nickName: 1, phone: 1, artistName: 1, artistSurname1: 1, artistSurname2: 1, userId: 1 }
    ).lean(),
  ]);

  if (!artist || !user) return res.status(400).send({ message: "Artist/User not found" });

  let parcels = [];
  const artworks = await ArtWork.find(
    {
      _id: { $in: artworkIds },
      owner: req.user._id,
      "commercialization.activeTab": "purchase",
      status: "published",
    },
    { _id: 1, commercialization: 1, inventoryShipping: 1 }
  ).lean();

  if (artworks.length === 0) {
    return res.status(400).send({
      message: "Please provide valid artwork ids.",
    });
  }

  if (artworks.length !== ids.length) {
    return res.status(400).send({
      message: "Some artworks were not found or are not available for purchase.",
    });
  }

  artworks.forEach((art) => {
    parcels.push({
      weight: art.inventoryShipping.packageWeight,
      length: art.inventoryShipping.packageLength,
      height: art.inventoryShipping.packageHeight,
      width: art.inventoryShipping.packageWidth,
      packReference: generateRef(),
    });
  });

  const data = {
    customer: {
      accountNumber: "77017-8",
      idNumber: "A17521279",
      name: "Fresh Art Club",
      email: "logistics@freshartclub.com",
      phone: "+34 638 549 463",
    },
    collectionDate: formatDate(new Date()),
    serviceCode: 1,
    productCode: 2,
    ref: generateFACRef(),
    label: true,
    payer: "ORD",
    sender: {
      name: name(artist),
      contactName: artist.nickName ? artist.nickName : name(artist),
      idNumber: artist.artistId,
      phone: artist.phone,
      email: artist.email,
      address: {
        streetName: artist.address.residentialAddress,
        postalCode: artist.address.zipCode,
        cityName: artist.address.city,
        country: artist.address.country,
      },
    },
    receiver: {
      name: name(user),
      contactName: user.nickName ? user.nickName : name(user),
      idNumber: user.userId,
      phone: user.phone,
      email: user.email,
      address: {
        streetName: user.address.residentialAddress,
        postalCode: user.address.zipCode,
        cityName: user.address.city,
        country: user.address.country,
      },
    },
    parcels: parcels,
    observations: observe,
    restrictions: {
      scheduleMorningTimeSlotFrom: formatTime(morningFrom),
      scheduleMorningTimeSlotTo: formatTime(morningTo),
      scheduleEveningTimeSlotFrom: formatTime(eveningFrom),
      scheduleEveningTimeSlotTo: formatTime(eveningTo),
    },
    insuredValue: 3000,
  };

  const response = await axios.post("https://pic-pre.apicast.seur.io/v1/collections", data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
  });

  return res.status(200).send({
    message: "Logistics created successfully.",
  });
});

module.exports = { checkOutSub, confrimExchange, createPurchaseLogistics };
