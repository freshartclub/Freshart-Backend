const Plan = require("../models/plansModel");
const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const { fileUploadFunc } = require("../functions/common");
const Catalog = require("../models/catalogModel");
const objectId = require("mongoose").Types.ObjectId;

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

  const parsedCatalogs = JSON.parse(req.body.catalogs);

  let payload = {
    planGrp: req.body.planGrp,
    planName: req.body.planName,
    planDesc: req.body.planDesc,
    catalogs: parsedCatalogs,
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
    monthsDiscountSubscription: req.body.monthsDiscountSubscription,
    planData: JSON.parse(req.body.planData),
    defaultPlan: req.body.defaultPlan,
    status: req.body.status,
  };

  if (fileData.data?.planImg) {
    payload["planImg"] = fileData.data.planImg[0].filename;
  }

  if (!id) {
    const newPlan = await Plan.create(payload);

    if (parsedCatalogs) {
      await Catalog.updateMany(
        { _id: { $in: parsedCatalogs } },
        { $addToSet: { subPlan: newPlan._id } }
      );
    }

    return res
      .status(201)
      .send({ message: "Plan added successfully", data: newPlan });
  } else {
    const plan = await Plan.findOne({ _id: id }, { planImg: 1 }).lean(true);

    if (fileData.data?.planImg) {
      payload["planImg"] = fileData.data.planImg[0].filename;
    } else {
      payload["planImg"] = plan.planImg;
    }

    await Plan.updateOne({ _id: id }, { $set: payload });

    if (parsedCatalogs) {
      const catalogsToUpdate = parsedCatalogs;

      const existingCatalogs = await Catalog.find(
        { subPlan: id },
        { _id: 1 }
      ).lean();

      const existingCatalogIds = existingCatalogs.map((catalog) =>
        catalog._id.toString()
      );

      const catalogsToAdd = catalogsToUpdate.filter(
        (catalogId) => !existingCatalogIds.includes(catalogId)
      );
      const catalogsToRemove = existingCatalogIds.filter(
        (catalogId) => !catalogsToUpdate.includes(catalogId)
      );

      if (catalogsToAdd.length > 0) {
        await Catalog.updateMany(
          { _id: { $in: catalogsToAdd } },
          { $addToSet: { subPlan: id } }
        );
      }

      if (catalogsToRemove.length > 0) {
        await Catalog.updateMany(
          { _id: { $in: catalogsToRemove } },
          { $pull: { subPlan: id } }
        );
      }
    }

    return res.status(200).send({ message: "Plan updated successfully" });
  }
});

const getPlans = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const plans = await Plan.aggregate([
    {
      $project: {
        _id: 1,
        planName: 1,
        planImg: 1,
        planGrp: 1,
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
        monthsDiscountSubscription: 1,
        planData: 1,
        status: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  res.status(200).send({ data: plans });
});

const getPlanById = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  if(!id) return res.status(400).send({ message: `Plan id not found` });
  
  const plan = await Plan.findOne({ _id: id }).lean(true);
  res.status(200).send({ data: plan });
});

module.exports = { addPlan, getPlans, getPlanById };
