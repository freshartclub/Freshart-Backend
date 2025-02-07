const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const HomeArtwork = require("../models/homeArtworkModel");
const Carousel = require("../models/carouselModel");
const { fileUploadFunc } = require("../functions/common");
const objectId = require("mongoose").Types.ObjectId;

const addHomeArtwork = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { artworksTitle, artworks, text, type } = req.body;
  const { id } = req.params;

  let obj = {
    artworksTitle: artworksTitle,
    artworks: artworks,
    type: type,
  };

  if (type === "Main-page") {
    obj["text"] = text;
  }

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

    await HomeArtwork.updateOne({ _id: id }, { $set: obj });
  } else {
    const existingHomeArt = await HomeArtwork.findOne(
      { artworksTitle: artworksTitle },
      { artworksTitle: 1 }
    ).lean();

    if (existingHomeArt) {
      return res.status(400).send({ message: "Artwork Name Already Exists" });
    }

    await HomeArtwork.create(obj);
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
        type: 1,
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
        text: 1,
        type: 1,
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

const addCarousel = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  const fileData = await fileUploadFunc(req, res);

  if (id) {
    const carousel = await Carousel.findById(id, { carouselImg: 1 }).lean(true);

    if (!carousel) {
      return res.status(400).send({ message: "Carousel not found" });
    }

    const obj = {
      type: req.body.type,
      title: req.body.title,
      subtitle: req.body.subtitle,
      content: req.body.content,
      carouselImg: fileData?.data
        ? fileData.data.carouselImg[0].filename
        : carousel.carouselImg,
      link: JSON.parse(req.body?.link),
    };

    await Carousel.updateOne({ _id: id }, { $set: obj });

    return res.status(200).send({ message: "Carousel updated successfully" });
  } else {
    if (fileData.status !== 200) {
      return res.status(400).send({ message: "Please upload a valid image" });
    }

    await Carousel.create({
      type: req.body.type,
      title: req.body.title,
      subtitle: req.body.subtitle,
      content: req.body.content,
      carouselImg: fileData.data.carouselImg[0].filename,
      link: JSON.parse(req.body?.link),
    });

    return res.status(200).send({ message: "Carousel added successfully" });
  }
});

const getCarousel = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  if (!id) return res.status(404).send({ message: "Id not found" });

  const carousel = await Carousel.findById(id).lean(true);

  if (!carousel) {
    return res.status(400).send({ message: "Carousel not found" });
  }

  return res.status(200).send({ data: carousel });
});

const deleteCarousel = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  const carousel = await Carousel.updateOne(
    { _id: id },
    { $set: { isDeleted: true } }
  );

  if (carousel.modifiedCount === 0) {
    return res.status(400).send({ message: "Carousel not found" });
  }

  return res.status(200).send({ message: "Carousel deleted successfully" });
});

const getCarousels = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  let { s } = req.query;
  s = s === "undefined" || typeof s === "undefined" ? "" : s;

  const carousels = await Carousel.aggregate([
    {
      $match: {
        isDeleted: false,
        $or: [
          { type: { $regex: s, $options: "i" } },
          { title: { $regex: s, $options: "i" } },
          { subtitle: { $regex: s, $options: "i" } },
          { content: { $regex: s, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        type: 1,
        title: 1,
        subtitle: 1,
        content: 1,
        carouselImg: 1,
        link: 1,
        createdAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).send({ data: carousels });
});

const activateCarousel = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  const carousel = await Carousel.updateOne(
    { _id: id },
    { $set: { isDeleted: false } }
  );

  if (carousel.modifiedCount === 0) {
    return res.status(400).send({ message: "Carousel not found" });
  }

  return res.status(200).send({ message: "Carousel activated successfully" });
});

module.exports = {
  addHomeArtwork,
  getAdminHomeArtworks,
  getHomeArtworkById,
  deleteHomeArtworkItem,

  addCarousel,
  getCarousel,
  getCarousels,
  deleteCarousel,
  activateCarousel,
};
