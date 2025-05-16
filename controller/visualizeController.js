const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const { fileUploadFunc } = require("../functions/common");
const objectId = require("mongoose").Types.ObjectId;
const Visualize = require("../models/visualizeModel");
const deleteRemovedMedia = require("../functions/deleteMedia");

const addVisualize = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  const fileData = await fileUploadFunc(req, res);

  let obj = {
    ...req.body,
  };

  if (id) {
    const visualize = await Visualize.findById(id, { image: 1 }).lean();
    let image = visualize.image;

    if (fileData.data?.planImg) {
      obj["image"] = fileData.data.planImg[0].filename;

      await deleteRemovedMedia([image], []);
    }

    const updatedVisualize = await Visualize.updateOne({ _id: id }, { $set: obj });
    return res.status(200).send({ message: "Visualize updated successfully", data: updatedVisualize });
  }

  if (!fileData.data?.planImg) {
    return res.status(400).send({ message: "Please upload plan image" });
  }
  obj["image"] = fileData.data.planImg[0].filename;
  const newVisualize = await Visualize.create(obj);
  return res.status(201).send({ message: "Visualize added successfully", data: newVisualize });
});

const getAllVisualize = catchAsyncError(async (req, res) => {
  let { s, grp } = req.query;

  if (!s) s = "";
  if (!grp || grp === "All") grp = "";

  const allVisualize = await Visualize.aggregate([
    {
      $match: {
        ...(s && {
          $or: [{ name: { $regex: s, $options: "i" } }, { tags: { $elemMatch: { $regex: s, $options: "i" } } }],
        }),
        ...(grp && { group: { $regex: grp, $options: "i" } }),
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        group: 1,
        dimension_width: 1,
        dimension_height: 1,
        tags: 1,
        image: 1,
        createdAt: 1,
      },
    },
  ]);

  return res.status(200).send({ data: allVisualize });
});

const getVisualizeById = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Please provide visualize id" });

  const visualize = await Visualize.findById(id).lean();
  return res.status(200).send({ data: visualize });
});

const getAllUserVisualize = catchAsyncError(async (req, res) => {
  const allVisualize = await Visualize.aggregate([
    {
      $match: { isDeleted: false },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        group: 1,
        dimension_width: 1,
        dimension_height: 1,
        area_x1: 1,
        area_y1: 1,
        area_x2: 1,
        area_y2: 1,
        tags: 1,
        image: 1,
      },
    },
    {
      $group: {
        _id: "$group",
        data: { $push: "$$ROOT" },
      },
    },
  ]);

  const groupedData = {};
  allVisualize.forEach((group) => {
    groupedData[group._id] = group.data;
  });

  return res.status(200).send({ data: groupedData });
});

module.exports = { addVisualize, getAllVisualize, getVisualizeById, getAllUserVisualize };
