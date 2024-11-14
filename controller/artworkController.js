const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const { fileUploadFunc } = require("../functions/common");

const adminCreateArtwork = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { artworkId } = req.query;

  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);
  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const artist = await Artist.findOne({ _id: id });
  if (!artist) return res.status(400).send({ message: `Artist not found` });

  if (!artist.isActivated) {
    return res.status(400).send({ message: `Artist not activated` });
  }
  const fileData = await fileUploadFunc(req, res);

  let images = [];
  if (fileData.data?.images) {
    fileData.data?.images.forEach((element) => {
      images.push(element.filename);
    });
  }

  let obj = {
    artworkName: req.body.artworkName,
    artworkCreationYear: req.body.artworkCreationYear,
    artworkSeries: req.body.artworkSeries,
    productDescription: req.body.productDescription,
    collectionList: req.body.collectionList,
    owner: id,
  };

  obj["media"] = {
    backImage: fileData.data?.backImage && fileData.data?.backImage[0].filename,
    images: images,
    inProcessImage:
      fileData.data?.inProcessImage &&
      fileData.data?.inProcessImage[0].filename,
    mainImage: fileData.data?.mainImage && fileData.data?.mainImage[0].filename,
    mainVideo: fileData.data?.mainVideo && fileData.data?.mainVideo[0].filename,
    otherVideo:
      fileData.data?.otherVideo && fileData.data?.otherVideo[0].filename,
  };

  obj["additionalInfo"] = {
    artworkTechnic: req.body.artworkTechnic,
    artworkTheme: req.body.artworkTheme,
    artworkOrientation: req.body.artworkOrientation,
    material: req.body.material,
    weight: req.body.weight,
    length: req.body.lenght,
    height: req.body.height,
    width: req.body.width,
    hangingAvailable: req.body.hangingAvailable,
    hangingDescription: req.body.hangingDescription,
    framed: req.body.framed,
    framedDescription: req.body.framedDescription,
    frameHeight: req.body.frameHeight,
    frameLength: req.body.frameLenght,
    frameWidth: req.body.frameWidth,
    artworkStyle:
      typeof req.body.artworkStyle === "string"
        ? [req.body.artworkStyle]
        : req.body.artworkStyle,
    emotions:
      typeof req.body.emotions === "string"
        ? [req.body.emotions]
        : req.body.emotions,
    colors:
      typeof req.body.colors === "string" ? [req.body.colors] : req.body.colors,
    offensive: req.body.offensive,
  };

  obj["commercialization"] = {
    purchaseCatalog: req.body.purchaseCatalog,
    artistbaseFees: req.body.artistbaseFees,
    downwardOffer: req.body.downwardOffer,
    upworkOffer: req.body.upworkOffer,
    acceptOfferPrice: req.body.acceptOfferPrice,
    priceRequest: req.body.priceRequest,
  };

  obj["pricing"] = {
    basePrice: req.body.basePrice,
    dpersentage: req.body.dpersentage,
    vatAmount: req.body.vatAmount,
    artistFees: req.body.artistFees,
  };

  obj["inventoryShipping"] = {
    sku: req.body.sku,
    pCode: req.body.pCode,
    location: req.body.location,
  };

  obj["discipline"] = {
    artworkDiscipline: req.body.artworkDiscipline,
    artworkTags:
      typeof req.body.artworkTags === "string"
        ? [req.body.artworkTags]
        : req.body.artworkTags,
  };

  obj["promotions"] = {
    promotion: req.body.promotion,
    promotionScore: req.body.promotionScore,
  };

  obj["restriction"] = {
    availableTo: req.body.availableTo,
    discountAcceptation: req.body.discountAcceptation,
  };

  let condition = {
    $set: obj,
  };

  if (artworkId) {
    ArtWork.updateOne({ _id: artworkId }, condition).then();
    return res.status(200).send({
      message: "Artwork Editted Sucessfully",
      data: { _id: artworkId },
    });
  } else {
    const artwork = await ArtWork.create(obj);
    res
      .status(200)
      .send({ message: "Artwork Added Sucessfully", data: artwork });
  }
});

const artistCreateArtwork = catchAsyncError(async (req, res, next) => {
  const artist = await Artist.findOne(
    { _id: req.user._id },
    { isActivated: 1 }
  ).lean(true);
  if (!artist) return res.status(400).send({ message: `Artist not found` });

  const { id } = req?.params;

  if (!artist.isActivated) {
    return res.status(400).send({ message: `Artist not activated` });
  }
  const fileData = await fileUploadFunc(req, res);

  let images = [];
  if (fileData.data?.additionalImage) {
    fileData.data?.additionalImage.forEach((element) => {
      images.push(element.filename);
    });
  }

  let videos = [];
  if (fileData.data?.otherVideo) {
    fileData.data?.otherVideo.forEach((element) => {
      videos.push(element.filename);
    });
  }

  let styleArr = [];
  let colorsArr = [];
  let emotionsArr = [];
  let tagsArr = [];

  if (req.body.emotions) {
    const emotions = Array.isArray(req.body.emotions)
      ? req.body.emotions.map((item) => JSON.parse(item))
      : req.body.emotions;

    if (typeof emotions === "string") {
      const obj = JSON.parse(emotions);
      emotionsArr.push(obj.value);
    } else {
      emotions.forEach((element) => {
        emotionsArr.push(element.value);
      });
    }
  }

  if (req.body.artworkTags) {
    const artworkTags = Array.isArray(req.body.artworkTags)
      ? req.body.artworkTags.map((item) => JSON.parse(item))
      : req.body.artworkTags;

    if (typeof artworkTags === "string") {
      const obj = JSON.parse(artworkTags);
      tagsArr.push(obj.value);
    } else {
      artworkTags.forEach((element) => {
        tagsArr.push(element.value);
      });
    }
  }

  if (req.body.artworkStyleType) {
    const styleType = Array.isArray(req.body.artworkStyleType)
      ? req.body.artworkStyleType.map((item) => JSON.parse(item))
      : req.body.artworkStyleType;

    if (typeof styleType === "string") {
      const obj = JSON.parse(styleType);
      styleArr.push(obj.value);
    } else {
      styleType.forEach((element) => {
        styleArr.push(element.value);
      });
    }
  }

  if (req.body.colors) {
    const colors = Array.isArray(req.body.colors)
      ? req.body.colors.map((item) => JSON.parse(item))
      : req.body.colors;

    if (typeof colors === "string") {
      const obj = JSON.parse(colors);
      colorsArr.push(obj.value);
    } else {
      colors.forEach((element) => {
        colorsArr.push(element.value);
      });
    }
  }

  let obj = {
    artworkName: req.body.artworkName,
    artworkCreationYear: req.body.artworkCreationYear,
    artworkSeries: req.body.artworkSeries,
    productDescription: req.body.productDescription,
    collectionList: req.body.collectionList,
    owner: artist._id,
  };

  obj["media"] = {
    backImage: fileData.data?.backImage && fileData.data?.backImage[0].filename,
    images: images,
    inProcessImage:
      fileData.data?.inProcessImage &&
      fileData.data?.inProcessImage[0].filename,
    mainImage: fileData.data?.mainImage && fileData.data?.mainImage[0].filename,
    mainVideo: fileData.data?.mainVideo && fileData.data?.mainVideo[0].filename,
    otherVideo: videos,
  };

  obj["additionalInfo"] = {
    artworkTechnic: req.body.artworkTechnic,
    artworkTheme: req.body.artworkTheme,
    artworkOrientation: req.body.artworkOrientation,
    material: req.body.material,
    weight: req.body.weight,
    length: req.body.length,
    height: req.body.height,
    width: req.body.width,
    hangingAvailable: req.body.hangingAvailable,
    hangingDescription: req.body.hangingDescription,
    framed: req.body.framed,
    framedDescription: req.body.framedDescription,
    frameHeight: req.body.frameHeight,
    frameLength: req.body.frameLength,
    frameWidth: req.body.frameWidth,
    artworkStyle: styleArr,
    emotions: emotionsArr,
    colors: colorsArr,
    offensive: req.body.offensive,
  };

  obj["commercialization"] = {
    purchaseCatalog: req.body.purchaseCatalog,
    artistbaseFees: req.body.artistbaseFees,
    downwardOffer: req.body.downwardOffer,
    upworkOffer: req.body.upworkOffer,
    acceptOfferPrice: req.body.acceptOfferPrice,
    priceRequest: req.body.priceRequest,
  };

  obj["pricing"] = {
    basePrice: req.body.basePrice,
    dpersentage: req.body.dpersentage,
    vatAmount: req.body.vatAmount,
    artistFees: req.body.artistFees,
  };

  obj["inventoryShipping"] = {
    sku: req.body.sku,
    pCode: req.body.pCode,
    location: req.body.location,
  };

  obj["discipline"] = {
    artworkDiscipline: req.body.artworkDiscipline,
    artworkTags: tagsArr,
  };

  obj["promotions"] = {
    promotion: req.body.promotion,
    promotionScore: req.body.promotionScore,
  };

  obj["restriction"] = {
    availableTo: req.body.availableTo,
    discountAcceptation: req.body.discountAcceptation,
  };

  let condition = {
    $set: obj,
  };

  let artwork = null;

  if (id !== "null") {
    ArtWork.updateOne({ _id: id }, condition).then();
    return res.status(200).send({ message: "Artwork Editted Sucessfully" });
  } else {
    artwork = await ArtWork.create(obj);
    return res
      .status(200)
      .send({ message: "Artwork Added Sucessfully", artwork });
  }
});

const publishArtwork = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const artwork = await ArtWork.findOne({ _id: id }, { status: 1 }).lean(true);

  if (artwork.status === "published") {
    return res.status(400).send({ message: "Artwork Already Published" });
  }

  ArtWork.updateOne({ _id: id }, { status: "pending" }).then();

  return res
    .status(200)
    .send({ message: "Artwork Published Sucessfully", data: artwork._id });
});

const getArtistById = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { artistId } = req.query;
  const query = {};

  if (artistId) {
    query.artistId = { $regex: artistId, $options: "i" };
  }

  const artists = await Artist.find(
    {
      isDeleted: false,
      isActivated: true,
      ...query,
    },
    {
      email: 1,
      artistName: 1,
      artistSurname1: 1,
      artistSurname2: 1,
      artistId: 1,
      userId: 1,
      avatar: 1,
    }
  ).lean(true);

  res.status(200).send({ data: artists });
});

const getArtworkList = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const artworkList = await ArtWork.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "owner",
        foreignField: "_id",
        as: "ownerInfo",
      },
    },
    {
      $unwind: {
        path: "$ownerInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        artistName: "$ownerInfo.artistName",
        artistSurname1: "$ownerInfo.artistSurname1",
        artistSurname2: "$ownerInfo.artistSurname2",
        isDeleted: 1,
        isApproved: 1,
        status: 1,
        artworkName: 1,
        artworkCreationYear: 1,
        artworkSeries: 1,
        productDescription: 1,
        artworkTechnic: "$additionalInfo.artworkTechnic",
        upworkOffer: "$commercialization.upworkOffer",
        createdAt: 1,
      },
    },
  ]);

  res
    .status(200)
    .send({ data: artworkList, url: "http://91.108.113.224:5000" });
});

const removeArtwork = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  await ArtWork.updateOne({ _id: id }, { $set: { isDeleted: true } });

  res.status(200).send({ message: "Artwork Removed Sucessfully" });
});

const getUserArtwork = catchAsyncError(async (req, res, next) => {
  const artworks = await ArtWork.find({
    owner: req.user._id,
  })
    .populate("owner", "artistName artistSurname1 artistSurname2")
    .sort({ createdAt: -1 })
    .lean(true);

  res.status(200).send({ data: artworks, url: "http://91.108.113.224:5000" });
});

const getArtworkById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  let artwork = null;
  let artworks = [];

  if (req.user?.roles && req.user?.roles === "superAdmin") {
    artwork = await ArtWork.findOne({ _id: id })
      .populate("owner", {
        artistName: 1,
        artistId: 1,
        artistSurname1: 1,
        artistSurname2: 1,
      })
      .lean(true);
  } else {
    artwork = await ArtWork.findOne({ _id: id })
      .populate("owner", {
        artistName: 1,
        artistSurname1: 1,
        artistSurname2: 1,
        address: 1,
        aboutArtist: 1,
        profile: 1,
      })
      .lean(true);

    artworks = await ArtWork.find({ owner: artwork.owner._id })
      .sort({ createdAt: -1 })
      .lean(true);
  }

  res.status(200).send({
    data: artwork,
    artworks: artworks,
    url: "http://91.108.113.224:5000",
  });
});

module.exports = {
  adminCreateArtwork,
  artistCreateArtwork,
  getArtworkList,
  getArtistById,
  removeArtwork,
  getArtworkById,
  getUserArtwork,
  publishArtwork,
};
