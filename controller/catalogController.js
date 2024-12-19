const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const { fileUploadFunc } = require("../functions/common");
const Catalog = require("../models/catalogModel");
const objectId = require("mongoose").Types.ObjectId;

const addCatalog = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const { id } = req.query;
  const fileData = await fileUploadFunc(req, res);

  let obj = {
    catalogName: req.body.catalogName,
    catalogDesc: req.body.catalogDesc,
    catalogCollection: req.body.catalogCollection,
    catalogCommercialization: req.body.catalogCommercialization,
    defaultArtistFee: req.body.defaultArtistFee,
    subPlan: req.body.subPlan,
    status: req.body.status,
    exclusiveCatalog: req.body.exclusiveCatalog,
    details: {
      maxPrice: Number(req.body.maxPrice),
      maxHeight: Number(req.body.maxHeight),
      maxWidth: Number(req.body.maxWidth),
      maxDepth: Number(req.body.maxDepth),
      maxWeight: Number(req.body.maxWeight),
    },
  };

  if (fileData.data !== undefined) {
    obj["catalogImg"] = fileData.data.catalogImg[0].filename;
  }

  const condition = { $set: obj };

  if (id === undefined) {
    await Catalog.create(obj);
    return res.status(200).send({ message: "Catalog added successfully" });
  } else {
    Catalog.updateOne({ _id: id }, condition).then();
    return res.status(200).send({ message: "Catalog updated successfully" });
  }
});

const getCatalog = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  let { s } = req.query;

  const catalog = await Catalog.aggregate([
    {
      $match: {
        catalogName: { $regex: s, $options: "i" },
      },
    },
    {
      $lookup: {
        from: "artworks",
        localField: "artworkList",
        foreignField: "_id",
        as: "artworkList",
      },
    },
    {
      $project: {
        isDeleted: 1,
        catalogName: 1,
        catalogImg: 1,
        catalogDesc: 1,
        _id: 1,
        artworkList: {
          $map: {
            input: "$artworkList",
            as: "item",
            in: {
              _id: "$$item._id",
              artworkName: "$$item.artworkName",
            },
          },
        },
        subPlan: 1,
        exclusiveCatalog: 1,
        createdAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  res
    .status(200)
    .send({ data: catalog, url: "https://dev.freshartclub.com/images" });
});

const getCatalogById = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const catalog = await Catalog.aggregate([
    {
      $match: {
        _id: objectId(req.params.id),
      },
    },
    {
      $lookup: {
        from: "artworks",
        localField: "artworkList",
        foreignField: "_id",
        as: "artworkList",
      },
    },
    {
      $lookup: {
        from: "collections",
        localField: "catalogCollection",
        foreignField: "_id",
        as: "catalogCollection",
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "artProvider",
        foreignField: "_id",
        as: "artProvider",
      },
    },
    {
      $project: {
        _id: 1,
        catalogName: 1,
        catalogImg: 1,
        catalogDesc: 1,
        catalogCollection: {
          $map: {
            input: "$catalogCollection",
            as: "item",
            in: {
              _id: "$$item._id",
              collectionName: "$$item.collectionName",
            },
          },
        },
        artworkList: {
          $map: {
            input: "$artworkList",
            as: "item",
            in: {
              _id: "$$item._id",
              artworkName: "$$item.artworkName",
            },
          },
        },
        artProvider: {
          $map: {
            input: "$artProvider",
            as: "item",
            in: {
              _id: "$$item._id",
              artistName: "$$item.artistName",
              artistSurname1: "$$item.artistSurname1",
              artistSurname2: "$$item.artistSurname2",
              mainImage: "$$item.profile.mainImage",
            },
          },
        },
        status: 1,
        exclusiveCatalog: 1,
        details: 1,
        subPlan: 1,
        catalogCommercialization: 1,
        defaultArtistFee: 1,
        exclusiveCatalog: 1,
        createdAt: 1,
      },
    },
  ]);

  res
    .status(200)
    .send({ data: catalog[0], url: "https://dev.freshartclub.com/images" });
});

const deleteCatalog = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Catalog Id is required" });

  await Catalog.updateOne({ _id: id }, { $set: { isDeleted: true } });
  res.status(200).send({ message: "Catalog deleted successfully" });
});

const getCatalogList = catchAsyncError(async (req, res, next) => {
  const catalogs = await Catalog.find(
    {
      isDeleted: false,
    },
    { catalogName: 1, defaultArtistFee: 1 }
  )
    .sort({ createdAt: -1 })
    .lean(true);

  res.status(200).send({ data: catalogs });
});

module.exports = {
  addCatalog,
  getCatalog,
  getCatalogById,
  getCatalogList,
  deleteCatalog,
};
