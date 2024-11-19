const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const { fileUploadFunc } = require("../functions/common");
const PickList = require("../models/pickListModel");

const addPickList = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const { picklistName, name } = req.body;

  const picklist = await PickList.findOne({
    picklistName: picklistName,
  }).lean(true);

  if (picklist) {
    const findField = picklist.picklist.find((item) => item.name === name);
    if (findField) {
      return res
        .status(400)
        .send({ message: `Field already exist in "${picklistName}" Picklist` });
    }

    PickList.updateOne(
      { picklistName: picklistName },
      { $push: { picklist: { name: name } } }
    ).then();
  } else {
    await PickList.create({
      picklistName: picklistName,
      picklist: [{ name: name }],
    });
  }

  res.status(200).send({ message: "Picklist added successfully" });
});

const getPickList = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }
  const picklist = await PickList.find().lean(true);

  res.status(200).send({ data: picklist });
});

const getPickListById = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const { id } = req.params;
  const { name } = req.query;

  const picklist = await PickList.findById(id).lean(true);
  if (!picklist) {
    return res.status(400).send({ message: "Picklist not found" });
  }

  let findField = picklist.picklist.find((item) => item.name === name);
  if (!findField) {
    return res.status(400).send({ message: "Requested field not found" });
  }
  findField.picklistName = picklist.picklistName;

  res.status(200).send({ data: findField });
});

const updatePicklist = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const { id } = req.params;
  const { name: queryName } = req.query;

  const { name, isDeleted } = req.body;

  const picklist = await PickList.findById(id).lean(true);
  if (!picklist) {
    return res.status(400).send({ message: "Picklist not found" });
  }

  const findField = picklist.picklist.find((item) => item.name === queryName);
  if (!findField) {
    return res.status(400).send({ message: "Requested field not found" });
  }

  PickList.updateOne(
    {
      _id: id,
      "picklist.name": queryName,
    },
    {
      $set: {
        "picklist.$.name": name,
        "picklist.$.isDeleted": isDeleted,
      },
    }
  ).then();

  return res.status(200).send({ message: "Picklist updated successfully" });
});

module.exports = { addPickList, getPickList, getPickListById, updatePicklist };
