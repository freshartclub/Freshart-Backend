const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const { fileUploadFunc } = require("../functions/common");
const objectId = require("mongoose").Types.ObjectId;
const Collection = require("../models/collectionModel");

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

    if (isExist > 0) {
      return res.status(400).send({ message: `Collection with this name already exist` });
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
      return res.status(400).send({ message: `Collection with this name already exist` });
    }
  }

  let artworkListArr = [];

  if (req.body.artworkList) {
    const artworkList = Array.isArray(req.body.artworkList) ? req.body.artworkList.map((item) => JSON.parse(item)) : req.body.artworkList;

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
    collectionTags: req.body.collectionTags,
    status: req.body.status,
  };

  obj["expertDetails"] = {
    expertDesc: req.body.expertDesc,
    createdBy: req.body.createdBy,
    expertImg: fileData.data?.expertImg !== undefined ? fileData.data?.expertImg[0].filename : collection?.expertDetails?.expertImg,
  };

  if (fileData.data?.collectionFile !== undefined) {
    obj["collectionFile"] = fileData.data.collectionFile[0].filename;
  }

  const condition = { $set: obj };

  if (id === undefined) {
    await Collection.create(obj);
    return res.status(200).send({ message: "Collection added successfully" });
  } else {
    await Collection.updateOne({ _id: id }, condition);
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
        $or: [
          { collectionName: { $regex: s, $options: "i" } },
          { "expertDetails.createdBy": { $regex: s, $options: "i" } },
          { collectionTags: { $regex: s, $options: "i" } },
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
        isDeleted: 1,
        collectionTags: 1,
        createdAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  res.status(200).send({ data: collection, url: "https://dev.freshartclub.com/images" });
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

    .populate({
      path: "artworkList.artworkId",
      select: "artworkName artworkId owner media.mainImage",
      populate: {
        path: "owner",
        model: "Artist",
        select: "artistName artistSurname1 artistSurname2",
      },
    })
    .lean(true);

  res.status(200).send({ data: collection });
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

const deleteArtworkFromCollection = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);
  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  const { artworkId } = req.body;

  if (!id || !artworkId) {
    return res.status(400).send({ message: "Please provide collection id" });
  }

  const collection = await Collection.countDocuments({
    _id: id,
  }).lean(true);

  if (!collection) {
    return res.status(400).send({ message: "Collection not found" });
  }

  await Collection.updateOne({ _id: id }, { $pull: { artworkList: { artworkId: artworkId } } });

  res.status(200).send({ message: "Artwork removed from collection" });
});

const deleteCollection = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);
  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;

  if (!id) {
    return res.status(400).send({ message: "Please provide collection id" });
  }

  const collection = await Collection.findOne({ _id: id }, { isDeleted: 1 }).lean(true);

  if (!collection) {
    return res.status(400).send({ message: "Collection not found" });
  }

  if (collection.isDeleted) {
    return res.status(400).send({ message: "Collection already deleted" });
  }

  await Collection.updateOne({ _id: id }, { isDeleted: true });

  res.status(200).send({ message: "Collection deleted successfully" });
});

const restoreCollection = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);
  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;

  if (!id) {
    return res.status(400).send({ message: "Please provide collection id" });
  }

  const collection = await Collection.findOne({ _id: id }, { isDeleted: 1 }).lean(true);

  if (!collection) {
    return res.status(400).send({ message: "Collection not found" });
  }

  if (!collection.isDeleted) {
    return res.status(400).send({ message: "Collection is already active" });
  }

  await Collection.updateOne({ _id: id }, { isDeleted: false });

  res.status(200).send({ message: "Collection restored successfully" });
});

// --------------------------- User Side (Frontend) ----------------------

const getUserSideCollections = catchAsyncError(async (req, res, next) => {
  const collection = await Collection.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },
    {
      $project: {
        _id: 1,
        collectionName: 1,
        collectionDesc: 1,
        collectionFile: 1,
        status: 1,
        isDeleted: 1,
        collectionTags: 1,
        createdAt: 1,
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  res.status(200).send({ data: collection });
});

const getUserSideCollectionById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).send({ message: "Please provide collection id" });
  }

  const collection = await Collection.aggregate([
    {
      $match: {
        _id: objectId(id),
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: "artworks",
        localField: "artworkList.artworkId",
        foreignField: "_id",
        as: "arts",
      },
    },
    {
      $project: {
        _id: 1,
        collectionName: 1,
        collectionDesc: 1,
        collectionFile: 1,
        status: 1,
        isDeleted: 1,
        collectionTags: 1,
        createdAt: 1,
        artworks: {
          $map: {
            input: "$arts",
            as: "art",
            in: {
              _id: "$$art._id",
              artworkName: "$$art.artworkName",
              media: "$$art.media.mainImage",
            },
          },
        },
      },
    },
  ]);

  if (collection.length == 0 || !collection) {
    return res.status(400).send({ message: "Collection Not Found" });
  }

  res.status(200).send({ data: collection[0] });
});

module.exports = {
  addCollection,
  getAllCollections,
  getCollectionById,
  searchCollection,
  deleteArtworkFromCollection,
  deleteCollection,
  restoreCollection,
  getUserSideCollections,
  getUserSideCollectionById,
};
