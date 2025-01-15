const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const { fileUploadFunc } = require("../functions/common");
const Circle = require("../models/circleModel");
const objectId = require("mongoose").Types.ObjectId;

const addCircle = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  const fileData = await fileUploadFunc(req, res);

  if (id) {
    const circle = await Circle.findOne(
      { _id: id },
      { mainImage: 1, coverImage: 1, title: 1 }
    ).lean(true);

    await Circle.updateOne(
      { _id: id },
      {
        $set: {
          title: req.body.title,
          description: req.body.description,
          content: req.body.content,
          mainImage: fileData.data?.mainImage
            ? fileData.data?.mainImage[0]?.filename
            : circle.mainImage,
          coverImage: fileData.data?.backImage
            ? fileData.data?.backImage[0]?.filename
            : circle.coverImage,
          managers: JSON.parse(req.body.managers),
          categories: JSON.parse(req.body.categories),
          status: req.body.status,
        },
      }
    );

    return res.status(200).send({ message: "Circle updated successfully" });
  } else {
    await Circle.create({
      title: req.body.title,
      description: req.body.description,
      content: req.body.content,
      mainImage: fileData.data?.mainImage[0]?.filename,
      coverImage: fileData.data?.backImage[0]?.filename,
      managers: JSON.parse(req.body.managers),
      categories: JSON.parse(req.body.categories),
      status: req.body.status,
    });

    return res.status(200).send({ message: "Circle added successfully" });
  }
});

const getCircle = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  if (!id) return res.status(400).send({ message: `Circle id not found` });

  const circle = await Circle.aggregate([
    {
      $match: {
        _id: objectId(id),
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "managers",
        foreignField: "_id",
        as: "managers",
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        content: 1,
        mainImage: 1,
        coverImage: 1,
        categories: 1,
        status: 1,
        managers: {
          $map: {
            input: "$managers",
            as: "manager",
            in: {
              _id: "$$manager._id",
              artistName: "$$manager.artistName",
              artistSurname1: "$$manager.artistSurname1",
              artistSurname2: "$$manager.artistSurname2",
              artistId: "$$manager.artistId",
              img: "$$manager.profile.mainImage",
            },
          },
        },
      },
    },
  ]);

  return res.status(200).send({ data: circle[0] });
});

const getCircleList = catchAsyncError(async (req, res) => {
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

  const circle = await Circle.aggregate([
    {
      $match: {
        $or: [
          { title: { $regex: s, $options: "i" } },
          { description: { $regex: s, $options: "i" } },
        ],
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "managers",
        foreignField: "_id",
        as: "managers",
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        content: 1,
        mainImage: 1,
        coverImage: 1,
        categories: 1,
        createdAt: 1,
        status: 1,
        managers: {
          $map: {
            input: "$managers",
            as: "manager",
            in: {
              _id: "$$manager._id",
              artistName: "$$manager.artistName",
              artistSurname1: "$$manager.artistSurname1",
              artistSurname2: "$$manager.artistSurname2",
              artistId: "$$manager.artistId",
              img: "$$manager.profile.mainImage",
            },
          },
        },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).send({ data: circle });
});
module.exports = { addCircle, getCircle, getCircleList };
