const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const { fileUploadFunc } = require("../functions/common");
const Catalog = require("../models/catalogModel");

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

  if (fileData.type !== "success") {
    return res.status(fileData.status).send({
      message:
        fileData?.type === "fileNotFound"
          ? "Please upload the documents"
          : fileData.type,
    });
  }

  const obj = {
    catalogImg: fileData?.data?.catalogImg[0].filename,
    catalogName: req.body.catalogName,
    catalogDesc: req.body.catalogDesc,
    artworkList: req.body.artworkList,
    catalogCollection: req.body.catalogCollection,
    artProvider: req.body.artProvider,
    subPlan: req.body.subPlan,
    exclusiveCatalog: req.body.exclusiveCatalog,
  };

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
        isDeleted: false,
        catalogName: { $regex: s, $options: "i" },
      },
    },
    {
      $project: {
        catalogName: 1,
        catalogImg: 1,
        catalogDesc: 1,
        _id: 1,
        artworkList: 1,
        subPlan: 1,
        exclusiveCatalog: 1,
        createdAt: 1,
      },
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

  const catalog = await Catalog.findOne({
    _id: req.params.id,
  }).lean(true);

  res
    .status(200)
    .send({ data: catalog, url: "https://dev.freshartclub.com/images" });
});

module.exports = { addCatalog, getCatalog, getCatalogById };
