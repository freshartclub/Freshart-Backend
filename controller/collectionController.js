const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const { fileUploadFunc } = require("../functions/common");
const Collection = require("../models/collectionModel");

const addCollection = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const collection = null;

  const { id } = req.query;
  if (id !== undefined) {
    collection = await Collection.findOne(
      {
        _id: id,
      },
      { expertDetails: 1 }
    ).lean(true);
  }
  const fileData = await fileUploadFunc(req, res);

  let obj = {
    collectionName: req.body.collectionName,
    collectionDesc: req.body.collectionDesc,
    createdBy: req.body.createdBy,
    artworkList: req.body.artworkList,
    artworkTags: req.body.artworkTags,
    status: req.body.status,
  };

  obj["expertDetails"] = {
    expertDesc: req.body.expertDesc,
    expertImg: fileData.data?.expertImg
      ? fileData.data?.expertImg[0].filename
      : collection?.expertDetails?.expertImg,
  };

  if (fileData.data?.collectionFile !== undefined) {
    obj["collectionFile"] = fileData.data.collectionFile[0].filename;
  }

  const condition = { $set: obj };

  if (id === undefined) {
    await Collection.create(obj);
    return res.status(200).send({ message: "Collection added successfully" });
  } else {
    Collection.updateOne({ _id: id }, condition).then();
    return res.status(200).send({ message: "Collection updated successfully" });
  }
});

const getCollection = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  let { s } = req.query;

  const collection = await Collection.aggregate([
    {
      $match: {
        isDeleted: false,
        catalogName: { $regex: s, $options: "i" },
      },
    },
    {
      $project: {
        _id: 1,
        collectionName: 1,
        collectionDesc: 1,
        collectionFile: 1,
        status: 1,
        expertDetails: 1,
      },
    },
  ]);

  res
    .status(200)
    .send({ data: collection, url: "https://dev.freshartclub.com/images" });
});

const getCollectionById = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const catalog = await Collection.findOne({
    _id: req.params.id,
  }).lean(true);

  res
    .status(200)
    .send({ data: catalog, url: "https://dev.freshartclub.com/images" });
});

module.exports = { addCollection, getCollection, getCollectionById };
