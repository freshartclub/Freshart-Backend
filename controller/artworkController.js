const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const { fileUploadFunc, createLog } = require("../functions/common");
const APIErrorLog = createLog("API_error_log");

const createArtwork = catchAsyncError(async (req, res, next) => {
  // const { id } = req.params;
  const id = "6708131b37736542341fd013";
  const fileData = await fileUploadFunc(req, res);

  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

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
      fileData.data?.inProcessImage &&
      fileData.data?.inProcessImage[0].otherVideo,
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
    artworkStyle: req.body.artworkStyle,
    emotions: req.body.emotions,
    colors: req.body.colors,
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
    artworkTags: req.body.artworkTags,
  };

  obj["promotions"] = {
    promotion: req.body.promotion,
    promotionScore: req.body.promotionScore,
  };

  obj["restriction"] = {
    availableTo: req.body.availableTo,
    discountAcceptation: req.body.discountAcceptation,
  };

  const artwork = await ArtWork.create(obj);

  res.status(200).send({ message: "Artwork Added Sucessfully", artwork });
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

  const artists = await Artist.find({
    isDeleted: false,
    role: "artist",
    ...query,
  })
    .select("artistName artistId email artistSurname1 artistSurname2")
    .lean(true);

  res.status(200).send({ data: artists });
});

const getArtworkList = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const artworkList = await ArtWork.find({}).lean(true);

  res.status(200).send({ data: artworkList });
});

module.exports = {
  createArtwork,
  getArtworkList,
  getArtistById,
};