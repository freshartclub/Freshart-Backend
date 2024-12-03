const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const { fileUploadFunc } = require("../functions/common");
const Collection = require("../models/collectionModel");
const objectId = require("mongoose").Types.ObjectId;

const addCollection = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  let collection = null;
  const { id } = req.query;

  const fileData = await fileUploadFunc(req, res);

  if (id !== undefined) {
    const isExist = await Collection.countDocuments({
      collectionName: req.body.collectionName,
    }).lean(true);

    if (isExist !== 1) {
      return res
        .status(400)
        .send({ message: `Collection with this name already exist` });
    }

    collection = await Collection.findOne(
      {
        _id: id,
      },
      { expertDetails: 1 }
    ).lean(true);
  } else {
    const isExist = await Collection.countDocuments({
      collectionName: req.body.collectionName,
    }).lean(true);

    if (isExist) {
      return res
        .status(400)
        .send({ message: `Collection with this name already exist` });
    }
  }

  let artworkListArr = [];

  if (req.body.artworkList) {
    const artworkList = Array.isArray(req.body.artworkList)
      ? req.body.artworkList.map((item) => JSON.parse(item))
      : req.body.artworkList;

    if (typeof artworkList === "string") {
      const obj = JSON.parse(artworkList);
      artworkListArr.push({
        artworkId: obj.artworkId,
        artworkDesc: obj.artworkDesc,
      });
    } else {
      artworkList.forEach((element) => {
        artworkListArr.push({
          artworkId: element.artworkId,
          artworkDesc: element.artworkDesc,
        });
      });
    }
  }

  let obj = {
    collectionName: req.body.collectionName,
    collectionDesc: req.body.collectionDesc,
    artworkList: artworkListArr,
    artworkTags: req.body.artworkTags,
    status: req.body.status,
  };

  obj["expertDetails"] = {
    expertDesc: req.body.expertDesc,
    createdBy: req.body.createdBy,
    expertImg:
      fileData.data?.expertImg !== undefined
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

const getAllCollections = catchAsyncError(async (req, res, next) => {
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
        $or: [
          { collectionName: { $regex: s, $options: "i" } },
          { "expertDetails.createdBy": { $regex: s, $options: "i" } },
          { artworkTags: { $regex: s, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        collectionName: 1,
        createdBy: "$expertDetails.createdBy",
        collectionFile: 1,
        status: 1,
        artworkTags: 1,
        createdAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
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

  const collection = await Collection.findOne({
    _id: req.params.id,
  })
    .populate("artworkList.artworkId", "artworkName inventoryShipping.pCode")
    .lean(true);

  res
    .status(200)
    .send({ data: collection, url: "https://dev.freshartclub.com/images" });
});

const searchCollection = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);
  if (!admin) return res.status(400).send({ message: `Admin not found` });

  let { s } = req.query;

  if (s == "undefined") {
    s = "";
  } else if (typeof s === "undefined") {
    s = "";
  }

  const artworks = await Collection.find(
    {
      isDeleted: false,
      collectionName: { $regex: s, $options: "i" },
    },
    {
      collectionName: 1,
      collectionFile: 1,
      createdBy: "$expertDetails.createdBy",
    }
  ).lean(true);

  res.status(200).send({
    data: artworks,
    url: "https://dev.freshartclub.com/images",
  });
});

module.exports = {
  addCollection,
  getAllCollections,
  getCollectionById,
  searchCollection,
};
