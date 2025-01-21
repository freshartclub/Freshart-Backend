const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const HomeArtwork = require("../models/homeArtworkModel");
const objectId = require("mongoose").Types.ObjectId;

const addHomeArtwork = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { artworksTitle, artworks } = req.body;
  const { id } = req.params;

  if (id) {
    const existingHomeArt = await HomeArtwork.findOne(
      {
        artworksTitle: artworksTitle,
        _id: { $ne: id },
      },
      { artworksTitle: 1 }
    ).lean();

    if (existingHomeArt) {
      return res.status(400).send({ message: "Artwork Name Already Exists" });
    }

    await HomeArtwork.updateOne(
      { artworksTitle: artworksTitle },
      { $set: { artworks: artworks } }
    );
  } else {
    const existingHomeArt = await HomeArtwork.findOne(
      { artworksTitle: artworksTitle },
      { artworksTitle: 1 }
    ).lean();

    if (existingHomeArt) {
      return res.status(400).send({ message: "Artwork Name Already Exists" });
    }

    await HomeArtwork.create({
      artworksTitle: artworksTitle,
      artworks: artworks,
    });
  }

  res
    .status(200)
    .send({ message: `${artworksTitle} Artwork added successfully` });
});

const getAdminHomeArtworks = catchAsyncError(async (req, res, next) => {
  let { s } = req.query;
  s = s === "undefined" || typeof s === "undefined" ? "" : s;

  const homeArt = await HomeArtwork.aggregate([
    {
      $match: { artworksTitle: { $regex: s, $options: "i" } },
    },
    {
      $lookup: {
        from: "artworks",
        localField: "artworks",
        foreignField: "_id",
        as: "artworks",
      },
    },
    {
      $project: {
        artworksTitle: 1,
        artworks: {
          $map: {
            input: "$artworks",
            as: "item",
            in: {
              _id: "$$item._id",
              artworkId: "$$item.artworkId",
              artworkName: "$$item.artworkName",
              img: "$$item.media.mainImage",
            },
          },
        },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  res.status(200).send({ data: homeArt });
});

const getHomeArtworkById = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });
  const { id } = req.params;
  if (!id) return res.status(404).send({ message: "Id not found" });

  const homeArt = await HomeArtwork.aggregate([
    {
      $match: { _id: objectId(id) },
    },
    {
      $lookup: {
        from: "artworks",
        localField: "artworks",
        foreignField: "_id",
        as: "artworks",
      },
    },
    {
      $project: {
        artworksTitle: 1,
        artworks: {
          $map: {
            input: "$artworks",
            as: "item",
            in: {
              _id: "$$item._id",
              artworkId: "$$item.artworkId",
              artworkName: "$$item.artworkName",
              img: "$$item.media.mainImage",
            },
          },
        },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  res.status(200).send({ data: homeArt[0] });
});

const deleteHomeArtworkItem = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id, itemId } = req.params;

  const homeArt = await HomeArtwork.findById(id).lean(true);
  if (!homeArt) {
    return res.status(400).send({ message: "Home Artwork not found" });
  }

  await HomeArtwork.updateOne(
    { _id: id },
    { $pull: { artworks: objectId(itemId) } }
  );

  return res.status(200).send({ message: "Item deleted successfully" });
});

module.exports = {
  addHomeArtwork,
  getAdminHomeArtworks,
  getHomeArtworkById,
  deleteHomeArtworkItem,
};
