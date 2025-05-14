const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const RecentlyView = require("../models/recentlyView");
const { fileUploadFunc, generateRandomId } = require("../functions/common");
const objectId = require("mongoose").Types.ObjectId;
const Catalog = require("../models/catalogModel");
const Notification = require("../models/notificationModel");
const HomeArtwork = require("../models/homeArtworkModel");
const { processImages } = require("../functions/upload");
const Circle = require("../models/circleModel");
const MakeOffer = require("../models/makeOfferModel");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkValidation");

const adminCreateArtwork = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { artworkId } = req.query;

  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);
  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const artist = await Artist.findOne({ _id: id }, { isActivated: 1 }).lean(true);
  if (!artist) return res.status(400).send({ message: `Artist not found` });
  if (!artist.isActivated) {
    return res.status(400).send({ message: `Artist not activated` });
  }

  let oldArtworkImages = [];
  let oldArtworkVideos = [];

  const artwork = await ArtWork.findOne(
    { _id: artworkId, isDeleted: false },
    { media: 1, status: 1, artworkId: 1, commercialization: 1, lastModified: 1, media: 1 }
  ).lean(true);

  const isArtwork = artwork ? true : false;

  if (isArtwork) {
    if (artwork.status === "rejected") {
      return res.status(400).send({
        message: "You can't modify this artwork. This Artwork is rejected.",
      });
    }

    if (artwork?.media?.backImage) oldArtworkImages.push(artwork?.media?.backImage);
    if (artwork?.media?.mainImage) oldArtworkImages.push(artwork?.media?.mainImage);
    if (artwork?.media?.inProcessImage) oldArtworkImages.push(artwork?.media?.inProcessImage);
    if (artwork?.media?.images.length > 0) oldArtworkImages.push(...artwork?.media?.images);

    if (artwork?.media?.mainVideo) oldArtworkVideos.push(artwork?.media?.mainVideo);
    if (artwork?.media?.otherVideo.length > 0) oldArtworkVideos.push(...artwork?.media?.otherVideo);
  }

  const fileData = await fileUploadFunc(req, res);
  await processImages(req, res);

  let images = [];
  let videos = [];

  if (fileData.data?.images) {
    fileData.data?.images.forEach((element) => {
      images.push(element.filename);
    });
  }

  if (fileData.data?.otherVideo) {
    fileData.data?.otherVideo.forEach((element) => {
      videos.push(element.filename);
    });
  }

  if (req?.body?.existingImages !== undefined) {
    if (typeof req?.body?.existingImages === "string") {
      images.push(req?.body?.existingImages);
    } else {
      for (let i = 0; i < req?.body?.existingImages.length; i++) {
        images.push(req?.body?.existingImages[i]);
      }
    }
  }

  if (req?.body?.existingVideos !== undefined) {
    if (typeof req?.body?.existingVideos === "string") {
      videos.push(req?.body?.existingVideos);
    } else {
      for (let i = 0; i < req?.body?.existingVideos.length; i++) {
        videos.push(req?.body?.existingVideos[i]);
      }
    }
  }

  let obj = {
    artworkName: req.body.artworkName,
    artworkCreationYear: req.body.artworkCreationYear ? req.body.artworkCreationYear : new Date().getFullYear(),
    artworkSeries: req.body.artworkSeries ? req.body.artworkSeries : "N/A",
    productDescription: req.body.productDescription,
    isArtProvider: req.body.isArtProvider ? req.body.isArtProvider : "No",
    artworkId: isArtwork ? artwork?.artworkId : "ARW-" + generateRandomId(),
    owner: id,
  };

  if (req.body.exclusive == "true") {
    obj["exclusive"] = true;
  }

  if (req.body?.isArtProvider === "Yes") {
    obj["provideArtistName"] = req.body.provideArtistName;
  }

  obj["media"] = {
    backImage: fileData.data?.backImage?.length ? fileData.data?.backImage[0].filename : req.body?.hasBackImg === "true" ? req.body?.backImage : null,
    images: images,
    inProcessImage: fileData.data?.inProcessImage?.length
      ? fileData.data?.inProcessImage[0].filename
      : req.body?.hasInProcessImg === "true"
      ? req.body?.inProcessImage
      : null,
    mainImage: fileData.data?.mainImage?.length ? fileData.data?.mainImage[0].filename : req.body?.hasMainImg === "true" ? req.body?.mainImage : null,
    mainVideo: fileData.data?.mainVideo?.length
      ? fileData.data?.mainVideo[0].filename
      : req.body?.hasMainVideo === "true"
      ? req.body?.mainVideo
      : null,
    otherVideo: videos,
  };

  obj["additionalInfo"] = {
    artworkTechnic: req.body.artworkTechnic,
    artworkTheme: req.body.artworkTheme,
    artworkOrientation: req.body.artworkOrientation,
    material: req.body.material,
    weight: Number(req.body.weight),
    length: Number(req.body.lenght),
    height: Number(req.body.height),
    width: Number(req.body.width),
    hangingAvailable: req.body.hangingAvailable,
    framed: req.body.framed,
    artworkStyle: typeof req.body.artworkStyle === "string" ? [req.body.artworkStyle] : req.body.artworkStyle,
    emotions: typeof req.body.emotions === "string" ? [req.body.emotions] : req.body.emotions,
    colors: typeof req.body.colors === "string" ? [req.body.colors] : req.body.colors,
    offensive: req.body.offensive,
  };

  if (req?.body?.hangingAvailable === "Yes") {
    obj["additionalInfo"]["hangingDescription"] = req.body.hangingDescription;
  }

  if (req?.body?.framed === "Yes") {
    obj["additionalInfo"]["framedDescription"] = req.body.framedDescription;
    obj["additionalInfo"]["frameHeight"] = req.body.frameHeight;
    obj["additionalInfo"]["frameLength"] = req.body.frameLenght;
    obj["additionalInfo"]["frameWidth"] = req.body.frameWidth;
  }

  if (req?.body?.activeTab === "subscription") {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseOption: req.body.purchaseOption,
      subscriptionCatalog: objectId(req.body.subscriptionCatalog),
    };
  } else {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseCatalog: objectId(req.body.purchaseCatalog),
      purchaseType: req.body.purchaseType,
    };
  }

  if (req.body?.activeTab === "subscription") {
    obj["pricing"] = {
      currency: req.body.currency,
      basePrice: Number(req.body.basePrice),
      dpersentage: Number(req.body.dpersentage),
      vatAmount: Number(req.body.vatAmount),
      artistFees: req.body.artistFees,
    };
  } else {
    obj["pricing"] = {
      currency: req.body.currency,
      basePrice: Number(req.body.basePrice),
      acceptOfferPrice: req.body.acceptOfferPrice,
      dpersentage: Number(req.body.dpersentage),
      vatAmount: Number(req.body.vatAmount),
      artistFees: req.body.artistFees,
    };
  }

  obj["inventoryShipping"] = {
    pCode: req.body.pCode,
    location: req.body.location,
    comingSoon: req.body.comingSoon === "true" ? true : false,
    packageMaterial: req.body.packageMaterial,
    packageWeight: req.body.packageWeight,
    packageLength: req.body.packageLength,
    packageHeight: req.body.packageHeight,
    packageWidth: req.body.packageWidth,
  };

  obj["discipline"] = {
    artworkDiscipline: req.body.artworkDiscipline,
  };

  obj["promotions"] = {
    promotion: req.body.promotion,
    promotionScore: Number(req.body.promotionScore),
  };

  obj["restriction"] = {
    availableTo: req.body.availableTo,
    discountAcceptation: req.body.discountAcceptation,
  };

  obj["tags"] = {
    intTags: typeof req.body.intTags === "string" ? [req.body.intTags] : req.body.intTags,
    extTags: typeof req.body.extTags === "string" ? [req.body.extTags] : req.body.extTags,
  };

  let date = [];

  if (isArtwork && artwork.lastModified) {
    date = [...artwork.lastModified];
  }
  date.push(new Date());

  if (isArtwork && artwork.status === "published") {
    obj["lastModified"] = date;
  }

  let condition = {
    $set: obj,
  };

  if (artworkId) {
    if (artwork.status === "modified") {
      await ArtWork.updateOne({ _id: artworkId }, { $set: { reviewDetails: obj } });

      await Notification.updateOne(
        { user: artist._id },
        {
          $push: {
            notifications: {
              subject: "Changes in Modified Artwork",
              message: `Admin has made changes in your modified artwork ${artwork.title}. Please check it out.`,
            },
          },
        }
      );

      let newArworkImages = [];
      let newArtworkVideos = [];

      if (obj?.media?.backImage) newArworkImages.push(obj?.media?.backImage);
      if (obj?.media?.mainImage) newArworkImages.push(obj?.media?.mainImage);
      if (obj?.media?.inProcessImage) newArworkImages.push(obj?.media?.inProcessImage);
      if (obj?.media?.images.length > 0) newArworkImages.push(...obj?.media?.images);

      if (obj?.media?.mainVideo) newArtworkVideos.push(obj?.media?.mainVideo);
      if (obj?.media?.otherVideo.length > 0) newArtworkVideos.push(...obj?.media?.otherVideo);

      let removedImages = oldArtworkImages.filter((img) => !newArworkImages.includes(img));
      let removedVideos = oldArtworkVideos.filter((vid) => !newArtworkVideos.includes(vid));

      if (removedImages.length > 0 || removedVideos.length > 0) {
        await deleteRemovedMedia(removedImages, removedVideos);
      }

      return res.status(200).send({ message: "Artwork Modified", data: artwork });
    }

    await ArtWork.updateOne({ _id: artworkId }, condition);

    const newCatalogId = req.body.activeTab === "subscription" ? req.body.subscriptionCatalog : req.body.purchaseCatalog;

    const existingCatalogId = artwork.commercialization?.purchaseCatalog || artwork.commercialization?.subscriptionCatalog;

    if (newCatalogId !== existingCatalogId) {
      Promise.all([
        Catalog.updateOne({ _id: existingCatalogId, artworkList: artworkId }, { $pull: { artworkList: artworkId } }),
        Catalog.updateOne({ _id: newCatalogId, artworkList: { $ne: artworkId } }, { $push: { artworkList: artworkId } }),
      ]);
    }

    await Notification.updateOne(
      { user: artist._id },
      {
        $push: {
          notifications: {
            subject: "Artwork Modified by Admin",
            message: `Artwork "${artwork.artworkName}" has been modified by Admin`,
          },
        },
      }
    );

    return res.status(200).send({
      message: "Artwork Editted Sucessfully",
      data: { _id: artworkId },
    });
  }

  obj["status"] = "draft";
  const newArt = await ArtWork.create(obj);

  const catalogId = req.body.subscriptionCatalog ? req.body.subscriptionCatalog : req.body.purchaseCatalog;
  await Catalog.updateOne({ _id: catalogId }, { $push: { artworkList: newArt._id } });

  await Notification.updateOne(
    { user: artist._id },
    {
      $push: {
        notifications: {
          subject: "New Artwork Added by Admin",
          message: `A New Artwork "${newArt.artworkName}" has been added by Admin for you`,
        },
      },
    }
  );

  return res.status(200).send({ message: "Artwork Added Sucessfully", data: { _id: newArt._id } });
});

const artistCreateArtwork = catchAsyncError(async (req, res, next) => {
  const artist = await Artist.findOne({ _id: req.user._id, isDeleted: false }, { isActivated: 1 }).lean(true);
  if (!artist) return res.status(400).send({ message: `Artist not found` });

  const { id } = req?.params;

  if (!artist.isActivated) {
    return res.status(400).send({ message: `Artist not activated` });
  }

  let artworkData = null;
  if (id !== "null") {
    artworkData = await ArtWork.findOne({ _id: id, isDeleted: false }, { media: 1, status: 1, artworkId: 1, lastModified: 1 }).lean(true);

    if (!artworkData) {
      return res.status(400).send({ message: `Artwork not found` });
    }
  }

  if ((artworkData && artworkData.status === "published") || artworkData.status === "modified" || artworkData.status === "rejected") {
    return res.status(400).send({
      message: `You already published/modified this artwork`,
    });
  }

  const fileData = await fileUploadFunc(req, res);
  await processImages(req, res);

  let images = [];
  let videos = [];

  if (fileData.data?.images) {
    fileData.data?.images.forEach((element) => {
      images.push(element.filename);
    });
  }

  if (fileData.data?.otherVideo) {
    fileData.data?.otherVideo.forEach((element) => {
      videos.push(element.filename);
    });
  }

  const cleanArray = (inputArray) => {
    if (!Array.isArray(inputArray)) return inputArray;
    return inputArray.map((image) => image.replace(/^"|"$/g, ""));
  };

  if (req?.body?.existingImage) {
    if (typeof req?.body?.existingImage === "string") {
      images.push(req?.body?.existingImage.replace(/^"|"$/g, ""));
    } else {
      const cleanedImages = cleanArray(req?.body?.existingImage);
      images = [...images, ...cleanedImages];
    }
  }

  if (req?.body?.existingVideo) {
    if (typeof req?.body?.existingVideo === "string") {
      videos.push(req?.body?.existingVideo.replace(/^"|"$/g, ""));
    } else {
      const cleanedVideo = cleanArray(req?.body?.existingVideo);
      videos = [...videos, ...cleanedVideo];
    }
  }

  let styleArr = [];
  let colorsArr = [];
  let emotionsArr = [];
  let intTagsArr = [];
  let extTagsArr = [];

  if (req.body.emotions) {
    const emotions = Array.isArray(req.body.emotions) ? req.body.emotions.map((item) => JSON.parse(item)) : req.body.emotions;

    if (typeof emotions === "string") {
      const obj = JSON.parse(emotions);
      emotionsArr.push(obj.value);
    } else {
      emotions.forEach((element) => {
        emotionsArr.push(element.value);
      });
    }
  }

  if (req.body.intTags) {
    const intTags = Array.isArray(req.body.intTags) ? req.body.intTags.map((item) => JSON.parse(item)) : req.body.intTags;

    if (typeof intTags === "string") {
      intTagsArr.push(intTags.replace(/^"|"$/g, ""));
    } else {
      intTags.forEach((element) => {
        intTagsArr.push(element);
      });
    }
  }

  if (req.body.extTags) {
    const extTags = Array.isArray(req.body.extTags) ? req.body.extTags.map((item) => JSON.parse(item)) : req.body.extTags;

    if (typeof extTags === "string") {
      extTagsArr.push(extTags.replace(/^"|"$/g, ""));
    } else {
      extTags.forEach((element) => {
        extTagsArr.push(element);
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
    const colors = Array.isArray(req.body.colors) ? req.body.colors.map((item) => JSON.parse(item)) : req.body.colors;

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
    artworkSeries: req.body.artworkSeries ? req.body.artworkSeries : "N/A",
    productDescription: req.body.productDescription,
    isArtProvider: req.body.isArtProvider == "Yes" ? "Yes" : "No",
    artworkId: artworkData === null ? "ARW-" + generateRandomId() : artworkData?.artworkId,
    owner: artist._id,
  };

  if (req.body.exclusive == "Yes") {
    obj["exclusive"] = true;
  }

  if (req.body?.isArtProvider === "Yes") {
    obj["provideArtistName"] = req.body.provideArtistName;
  }

  obj["media"] = {
    backImage: fileData.data?.backImage?.length
      ? fileData.data?.backImage[0].filename
      : req.body?.hasBackImg === "true"
      ? artworkData?.media?.backImage
      : null,
    images: images,
    inProcessImage: fileData.data?.inProcessImage?.length
      ? fileData.data?.inProcessImage[0].filename
      : req.body?.hasInProcessImg === "true"
      ? artworkData?.media?.inProcessImage
      : null,
    mainImage: fileData.data?.mainImage?.length
      ? fileData.data?.mainImage[0].filename
      : req.body?.hasMainImg === "true"
      ? artworkData?.media?.mainImage
      : null,
    mainVideo: fileData.data?.mainVideo?.length
      ? fileData.data?.mainVideo[0].filename
      : req.body?.hasMainVideo === "true"
      ? artworkData?.media?.mainVideo
      : null,
    otherVideo: videos,
  };

  obj["additionalInfo"] = {
    artworkTechnic: req.body.artworkTechnic,
    artworkTheme: req.body.artworkTheme,
    artworkOrientation: req.body.artworkOrientation,
    material: req.body.material,
    weight: Number(req.body.weight),
    length: Number(req.body.length),
    height: Number(req.body.height),
    width: Number(req.body.width),
    hangingAvailable: req.body.hangingAvailable,
    framed: req.body.framed,
    artworkStyle: styleArr,
    emotions: emotionsArr,
    colors: colorsArr,
    offensive: req.body.offensive,
  };

  if (req?.body?.hangingAvailable === "Yes") {
    obj["additionalInfo"]["hangingDescription"] = req.body.hangingDescription;
  }

  if (req?.body?.framed === "Yes") {
    obj["additionalInfo"]["framedDescription"] = req.body.framedDescription;
    obj["additionalInfo"]["frameHeight"] = req.body.frameHeight;
    obj["additionalInfo"]["frameLength"] = req.body.frameLength;
    obj["additionalInfo"]["frameWidth"] = req.body.frameWidth;
  }

  if (req?.body?.activeTab === "subscription") {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseOption: req.body.purchaseOption,
      subscriptionCatalog: objectId(req.body.subscriptionCatalog),
    };
  } else {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseCatalog: objectId(req.body.purchaseCatalog),
      purchaseType: req.body.purchaseType,
    };
  }

  if (req.body?.activeTab === "subscription") {
    obj["pricing"] = {
      currency: req.body.currency,
      basePrice: Number(req.body.basePrice),
      dpersentage: Number(req.body.dpersentage),
      vatAmount: Number(req.body.vatAmount),
      artistFees: req.body.artistFees,
    };
  } else {
    obj["pricing"] = {
      currency: req.body.currency,
      basePrice: Number(req.body.basePrice),
      acceptOfferPrice: req.body.acceptOfferPrice,
      dpersentage: Number(req.body.dpersentage),
      vatAmount: Number(req.body.vatAmount),
      artistFees: req.body.artistFees,
    };
  }

  obj["inventoryShipping"] = {
    pCode: req.body.pCode,
    location: req.body.location,
    comingSoon: req.body.comingSoon === "true" ? true : false,
    packageMaterial: req.body.packageMaterial,
    packageWeight: req.body.packageWeight,
    packageLength: req.body.packageLength,
    packageHeight: req.body.packageHeight,
    packageWidth: req.body.packageWidth,
  };

  obj["discipline"] = {
    artworkDiscipline: req.body.artworkDiscipline,
  };

  obj["promotions"] = {
    promotion: "No",
    promotionScore: 0,
  };

  obj["restriction"] = {
    availableTo: req.body.availableTo,
    discountAcceptation: req.body.discountAcceptation,
  };

  obj["tags"] = {
    intTags: intTagsArr,
    extTags: extTagsArr,
  };

  let date = [];

  if (artworkData && artworkData.lastModified) {
    date = [...artworkData.lastModified];
  }
  date.push(new Date());

  if (artworkData && artworkData.status === "published") {
    obj["status"] = "modified";
    obj["lastModified"] = date;
  }

  let condition = {
    $set: obj,
  };

  let artwork = null;

  if (id !== "null") {
    ArtWork.updateOne({ _id: id }, condition).then();

    const newCatalogId = req.body.activeTab === "subscription" ? req.body.subscriptionCatalog : req.body.purchaseCatalog;

    const existingCatalogId = artworkData.commercialization?.purchaseCatalog || artworkData.commercialization?.subscriptionCatalog;

    if (newCatalogId !== existingCatalogId) {
      Promise.all([
        Catalog.updateOne({ _id: existingCatalogId, artworkList: artworkData._id }, { $pull: { artworkList: artworkData._id } }),
        Catalog.updateOne({ _id: newCatalogId, artworkList: { $ne: artworkData._id } }, { $push: { artworkList: artworkData._id } }),
      ]);
    }

    await Notification.updateOne(
      { user: artist._id },
      {
        $push: {
          notifications: {
            subject: "Draft Artwork Editted",
            message: `You have editted a draft Artwork - "${obj.artworkName}"`,
          },
        },
      }
    );

    return res.status(200).send({ message: "Artwork Editted Sucessfully" });
  } else {
    artwork = await ArtWork.create(obj);

    const catalogId = req.body.subscriptionCatalog ? req.body.subscriptionCatalog : req.body.purchaseCatalog;

    await Catalog.updateOne({ _id: catalogId }, { $push: { artworkList: artwork._id } });

    await Notification.updateOne(
      { user: artist._id },
      {
        $push: {
          notifications: {
            subject: "New Artwork Added",
            message: `You have added a new Artwork - "${artwork.artworkName}"`,
          },
        },
      }
    );

    return res.status(200).send({ message: "Artwork Added Sucessfully", artwork });
  }
});

const artistModifyArtwork = catchAsyncError(async (req, res, next) => {
  const artist = await Artist.findOne({ _id: req.user._id, isDeleted: false }, { isActivated: 1 }).lean(true);
  if (!artist) return res.status(400).send({ message: `Artist not found` });

  const { id } = req.params;

  if (!artist.isActivated) {
    return res.status(400).send({ message: `Artist not activated` });
  }

  let artworkData = await ArtWork.findOne({ _id: id, isDeleted: false }, { artworkName: 1, media: 1, status: 1, artworkId: 1, lastModified: 1 }).lean(
    true
  );

  if (!artworkData) {
    return res.status(400).send({ message: `Artwork not found` });
  }

  if (artworkData.status === "draft" || artworkData.status === "rejected") {
    return res.status(400).send({
      message: `Artwork is in ${artworkData.status} status. You cannot modify this artwork`,
    });
  }

  const fileData = await fileUploadFunc(req, res);
  await processImages(req, res);

  let images = [];
  let videos = [];

  if (fileData.data?.images) {
    fileData.data?.images.forEach((element) => {
      images.push(element.filename);
    });
  }

  if (fileData.data?.otherVideo) {
    fileData.data?.otherVideo.forEach((element) => {
      videos.push(element.filename);
    });
  }

  const cleanArray = (inputArray) => {
    if (!Array.isArray(inputArray)) return inputArray;
    return inputArray.map((image) => image.replace(/^"|"$/g, ""));
  };

  if (req?.body?.existingImage) {
    if (typeof req?.body?.existingImage === "string") {
      images.push(req?.body?.existingImage.replace(/^"|"$/g, ""));
    } else {
      const cleanedImages = cleanArray(req?.body?.existingImage);
      images = [...images, ...cleanedImages];
    }
  }

  if (req?.body?.existingVideo) {
    if (typeof req?.body?.existingVideo === "string") {
      videos.push(req?.body?.existingVideo.replace(/^"|"$/g, ""));
    } else {
      const cleanedVideo = cleanArray(req?.body?.existingVideo);
      videos = [...videos, ...cleanedVideo];
    }
  }

  let styleArr = [];
  let colorsArr = [];
  let emotionsArr = [];
  let intTagsArr = [];
  let extTagsArr = [];

  if (req.body.emotions) {
    const emotions = Array.isArray(req.body.emotions) ? req.body.emotions.map((item) => JSON.parse(item)) : req.body.emotions;

    if (typeof emotions === "string") {
      const obj = JSON.parse(emotions);
      emotionsArr.push(obj.value);
    } else {
      emotions.forEach((element) => {
        emotionsArr.push(element.value);
      });
    }
  }

  if (req.body.intTags) {
    const intTags = Array.isArray(req.body.intTags) ? req.body.intTags.map((item) => JSON.parse(item)) : req.body.intTags;

    if (typeof intTags === "string") {
      intTagsArr.push(intTags.replace(/^"|"$/g, ""));
    } else {
      intTags.forEach((element) => {
        intTagsArr.push(element);
      });
    }
  }

  if (req.body.extTags) {
    const extTags = Array.isArray(req.body.extTags) ? req.body.extTags.map((item) => JSON.parse(item)) : req.body.extTags;

    if (typeof extTags === "string") {
      extTagsArr.push(extTags.replace(/^"|"$/g, ""));
    } else {
      extTags.forEach((element) => {
        extTagsArr.push(element);
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
    const colors = Array.isArray(req.body.colors) ? req.body.colors.map((item) => JSON.parse(item)) : req.body.colors;

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
    artworkSeries: req.body.artworkSeries ? req.body.artworkSeries : "N/A",
    productDescription: req.body.productDescription,
    isArtProvider: req.body.isArtProvider == "Yes" ? "Yes" : "No",
  };

  if (req.body?.exclusive == "Yes") {
    obj["exclusive"] = true;
  }

  if (req.body?.isArtProvider === "Yes") {
    obj["provideArtistName"] = req.body.provideArtistName;
  }

  obj["media"] = {
    backImage: fileData.data?.backImage?.length
      ? fileData.data?.backImage[0].filename
      : req.body?.hasBackImg === "true"
      ? artworkData?.media?.backImage
      : null,
    images: images,
    inProcessImage: fileData.data?.inProcessImage?.length
      ? fileData.data?.inProcessImage[0].filename
      : req.body?.hasInProcessImg === "true"
      ? artworkData?.media?.inProcessImage
      : null,
    mainImage: fileData.data?.mainImage?.length
      ? fileData.data?.mainImage[0].filename
      : req.body?.hasMainImg === "true"
      ? artworkData?.media?.mainImage
      : null,
    mainVideo: fileData.data?.mainVideo?.length
      ? fileData.data?.mainVideo[0].filename
      : req.body?.hasMainVideo === "true"
      ? artworkData?.media?.mainVideo
      : null,
    otherVideo: videos,
  };

  obj["additionalInfo"] = {
    artworkTechnic: req.body.artworkTechnic,
    artworkTheme: req.body.artworkTheme,
    artworkOrientation: req.body.artworkOrientation,
    material: req.body.material,
    weight: Number(req.body.weight),
    length: Number(req.body.length),
    height: Number(req.body.height),
    width: Number(req.body.width),
    hangingAvailable: req.body.hangingAvailable,
    framed: req.body.framed,
    artworkStyle: styleArr,
    emotions: emotionsArr,
    colors: colorsArr,
    offensive: req.body.offensive,
  };

  if (req?.body?.hangingAvailable === "Yes") {
    obj["additionalInfo"]["hangingDescription"] = req.body.hangingDescription;
  }

  if (req?.body?.framed === "Yes") {
    obj["additionalInfo"]["framedDescription"] = req.body.framedDescription;
    obj["additionalInfo"]["frameHeight"] = req.body.frameHeight;
    obj["additionalInfo"]["frameLength"] = req.body.frameLength;
    obj["additionalInfo"]["frameWidth"] = req.body.frameWidth;
  }

  if (req?.body?.activeTab === "subscription") {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseOption: req.body.purchaseOption,
      subscriptionCatalog: objectId(req.body.subscriptionCatalog),
    };
  } else {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseCatalog: objectId(req.body.purchaseCatalog),
      purchaseType: req.body.purchaseType,
    };
  }

  if (req.body?.activeTab === "subscription") {
    obj["pricing"] = {
      currency: req.body.currency,
      basePrice: Number(req.body.basePrice),
      dpersentage: Number(req.body.dpersentage),
      vatAmount: Number(req.body.vatAmount),
      artistFees: req.body.artistFees,
    };
  } else {
    obj["pricing"] = {
      currency: req.body.currency,
      basePrice: Number(req.body.basePrice),
      acceptOfferPrice: req.body.acceptOfferPrice,
      dpersentage: Number(req.body.dpersentage),
      vatAmount: Number(req.body.vatAmount),
      artistFees: req.body.artistFees,
    };
  }

  obj["inventoryShipping"] = {
    pCode: req.body.pCode,
    location: req.body.location,
    comingSoon: req.body.comingSoon === "true" ? true : false,
    packageMaterial: req.body.packageMaterial,
    packageWeight: req.body.packageWeight,
    packageLength: req.body.packageLength,
    packageHeight: req.body.packageHeight,
    packageWidth: req.body.packageWidth,
  };

  obj["discipline"] = {
    artworkDiscipline: req.body.artworkDiscipline,
  };

  obj["promotions"] = {
    promotion: "No",
    promotionScore: 0,
  };

  obj["restriction"] = {
    availableTo: req.body.availableTo,
    discountAcceptation: req.body.discountAcceptation,
  };

  obj["tags"] = {
    intTags: intTagsArr,
    extTags: extTagsArr,
  };

  let date = [];
  if (artworkData.lastModified) date = [...artworkData.lastModified];
  date.push(new Date());

  obj["lastModified"] = date;

  await ArtWork.updateOne({ _id: id, isDeleted: false }, { $set: { reviewDetails: obj, status: "modified" } });

  const notification = {
    subject: artworkData.status === "published" ? "Artwork Modification Requested" : "Modified Artwork Edited",
    message:
      artworkData.status === "published"
        ? `You have submitted an artwork modification request for "${artworkData.artworkName}".`
        : `You made changes to your modified artwork "${artworkData.artworkName}".`,
  };

  await Notification.updateOne({ user: artist._id }, { $push: { notifications: notification } });

  return res.status(200).send({ message: "Artwork Modified Successfully" });
});

const publishArtwork = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const artwork = await ArtWork.findOne({ _id: id, isDeleted: false }, { owner: 1, status: 1, artworkName: 1 }).lean(true);
  if (!artwork) return res.status(400).send({ message: "Artwork not found" });

  if (artwork.status !== "draft") {
    return res.status(400).send({ message: "Artwork is already published" });
  }

  if (req.user?.roles && req.user?.roles === "superAdmin") {
    ArtWork.updateOne({ _id: id }, { status: "published" }).then();
    Notification.updateOne(
      { user: artwork.owner },
      {
        $push: {
          notifications: {
            subject: "Artwork Published",
            message: `Your Artwork "${artwork.artworkName}" has been published by FreshArt Club.`,
          },
        },
      }
    ).then();

    return res.status(200).send({ message: "Artwork Published Sucessfully", data: artwork._id });
  } else {
    ArtWork.updateOne({ _id: id }, { status: "pending" }).then();
    Notification.updateOne(
      { user: req.user._id },
      {
        $push: {
          notifications: {
            subject: "Artwork Published",
            message: `Your Artwork "${artwork.artworkName}" status changed to Pending.`,
          },
        },
      }
    ).then();

    return res.status(200).send({ message: "Artwork Published Sucessfully", data: artwork._id });
  }
});

const getArtistById = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { nameEmail } = req.query;

  const artists = await Artist.aggregate([
    {
      $match: {
        isDeleted: false,
        isActivated: true,
        $or: [
          { artistName: { $regex: nameEmail, $options: "i" } },
          { artistSurname1: { $regex: nameEmail, $options: "i" } },
          { artistSurname2: { $regex: nameEmail, $options: "i" } },
          { email: { $regex: nameEmail, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        email: 1,
        artistName: 1,
        nickName: 1,
        artistSurname1: 1,
        artistSurname2: 1,
        artProvider: "$commercilization.artProvider",
        mainImage: "$profile.mainImage",
        artistId: 1,
        userId: 1,
        _id: 1,
      },
    },
  ]);

  return res.status(200).send({ data: artists });
});

const getAllUsers = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });
  const { nameEmail } = req.query;

  const artists = await Artist.aggregate([
    {
      $match: {
        isDeleted: false,
        userId: { $exists: true },
        $or: [
          { artistName: { $regex: nameEmail, $options: "i" } },
          { artistSurname1: { $regex: nameEmail, $options: "i" } },
          { artistSurname2: { $regex: nameEmail, $options: "i" } },
          { email: { $regex: nameEmail, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        email: 1,
        artistName: 1,
        nickName: 1,
        artistSurname1: 1,
        artistSurname2: 1,
        artProvider: "$commercilization.artProvider",
        mainImage: "$profile.mainImage",
        artistId: 1,
        userId: 1,
        _id: 1,
      },
    },
  ]);

  return res.status(200).send({ data: artists });
});

const getAdminArtworkList = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  let { s, status, days, limit, cursor, direction, currPage } = req.query;

  if (status == "All") status = "";
  if (s == "undefined" || typeof s === "undefined") s = "";
  if (days === "All") days = "";

  limit = parseInt(limit) || 10;
  cursor = cursor || null;

  let filter = {};
  if (days) {
    const dateLimit = new Date();

    if (days === "1 Day") {
      dateLimit.setDate(dateLimit.getDate() - 1);
      filter["createdAt"] = { $gte: dateLimit };
    } else if (days === "1 Week") {
      dateLimit.setDate(dateLimit.getDate() - 7);
      filter["createdAt"] = { $gte: dateLimit };
    } else if (days === "1 Month") {
      dateLimit.setMonth(dateLimit.getMonth() - 1);
      filter["createdAt"] = { $gte: dateLimit };
    } else if (days === "1 Quarter") {
      dateLimit.setMonth(dateLimit.getMonth() - 3);
      filter["createdAt"] = { $gte: dateLimit };
    } else if (days === "1 Year") {
      dateLimit.setFullYear(dateLimit.getFullYear() - 1);
      filter["createdAt"] = { $gte: dateLimit };
    }
  }

  const matchStage = {
    isDeleted: false,
    status: { $regex: status, $options: "i" },
    ...(filter.createdAt ? { createdAt: filter.createdAt } : {}),
  };

  const totalCount = await ArtWork.countDocuments(matchStage);

  if (cursor) {
    if (direction === "next") {
      matchStage._id = { $lt: objectId(cursor) };
    } else if (direction === "prev") {
      matchStage._id = { $gt: objectId(cursor) };
    }
  }

  let artworkList = await ArtWork.aggregate([
    { $match: matchStage },
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
      $match: {
        $or: [
          { artworkName: { $regex: s, $options: "i" } },
          { artworkId: { $regex: s, $options: "i" } },
          { "ownerInfo.artistName": { $regex: s, $options: "i" } },
          { "ownerInfo.artistId": { $regex: s, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        artworkId: 1,
        artistId: "$ownerInfo.artistId",
        artistName: "$ownerInfo.artistName",
        artistSurname1: "$ownerInfo.artistSurname1",
        artistSurname2: "$ownerInfo.artistSurname2",
        isDeleted: 1,
        status: 1,
        media: 1,
        discipline: 1,
        artworkName: 1,
        artworkCreationYear: 1,
        isArtProvider: 1,
        artworkSeries: 1,
        productDescription: 1,
        artworkTechnic: "$additionalInfo.artworkTechnic",
        upworkOffer: "$commercialization.upworkOffer",
        activeTab: "$commercialization.activeTab",
        comingSoon: "$inventoryShipping.comingSoon",
        createdAt: 1,
      },
    },
    { $sort: { _id: direction === "prev" ? 1 : -1 } },
    { $limit: limit + 1 },
  ]);

  const hasNextPage =
    (currPage === 1 && artworkList.length > limit) || artworkList.length > limit || (direction === "prev" && artworkList.length === limit);

  if (hasNextPage && direction) {
    if (direction === "next") artworkList.pop();
  } else if (hasNextPage) {
    artworkList.pop();
  }

  const hasPrevPage = currPage == 1 ? false : true;

  if (direction === "prev" && currPage != 1) {
    artworkList.reverse().shift();
  } else if (direction === "prev") {
    artworkList.reverse();
  }

  const nextCursor = hasNextPage ? artworkList[artworkList.length - 1]?._id : null;

  const prevCursor = hasPrevPage ? artworkList[0]?._id : null;

  res.status(200).send({
    data: artworkList,
    nextCursor,
    prevCursor,
    hasNextPage,
    hasPrevPage,
    totalCount,
  });
});

const removeArtwork = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Artwork Id is required" });

  const artwork = await ArtWork.findOne({ _id: id }, { status: 1, owner: 1, artworkName: 1 }).lean(true);
  if (!artwork) return res.status(400).send({ message: "Artwork not found" });

  if (artwork.status === "rejected") {
    return res.status(400).send({ message: "Artwork already rejected or removed" });
  }

  await ArtWork.updateOne({ _id: id }, { $set: { status: "rejected" } });
  await Notification.updateOne(
    { user: owner },
    {
      $push: {
        notifications: {
          subject: "Artwork Rejected",
          message: `Your Artwork "${artwork.artworkName}" has been rejected by FreshArtClub. Please contact FreshArtClub for further details.`,
        },
      },
    }
  );

  res.status(200).send({ message: "Artwork Removed Sucessfully" });
});

const moveArtworkToPending = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Artwork Id is required" });

  const artwork = await ArtWork.findOne({ _id: id }, { status: 1, owner: 1, artworkName: 1 }).lean(true);
  if (!artwork) return res.status(400).send({ message: "Artwork not found" });

  if (artwork.status !== "rejected") {
    return res.status(400).send({ message: "Artwork already in pending status" });
  }

  await ArtWork.updateOne({ _id: id }, { $set: { status: "pending" } });

  await Notification.updateOne(
    { user: owner },
    {
      $push: {
        notifications: {
          subject: "Artwork Pending",
          message: `Your Artwork "${artwork.artworkName}" has been moved to pending by FreshArtClub.`,
        },
      },
    }
  );

  res.status(200).send({ message: "Artwork Moved to Pending Sucessfully" });
});

const getArtistArtwork = catchAsyncError(async (req, res, next) => {
  let { artworkType } = req.query;

  const matchQuery = {
    owner: req.user._id,
    isDeleted: false,
  };

  const groupByField =
    artworkType === "series"
      ? "$artworkSeries"
      : artworkType === "discipline"
      ? "$discipline.artworkDiscipline"
      : artworkType === "artprovider"
      ? "$provideArtistName"
      : artworkType === "subscription"
      ? "$catalogInfo.catalogName"
      : artworkType === "purchase"
      ? "$catalogInfo.catalogName"
      : null;

  let artworks = [];

  if (!groupByField) {
    artworks = await ArtWork.aggregate([
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          status: 1,
          media: "$media.mainImage",
          artworkTechnic: "$additionalInfo.artworkTechnic",
          discipline: 1,
          artworkName: 1,
          createdAt: 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    return res.status(200).send({ data: artworks, url: "https://dev.freshartclub.com/images" });
  } else {
    artworks = await ArtWork.aggregate([
      { $match: matchQuery },
      { $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true } },
      {
        $set: {
          catalogField: {
            $ifNull: ["$commercialization.purchaseCatalog", "$commercialization.subscriptionCatalog"],
          },
        },
      },
      {
        $lookup: {
          from: "catalogs",
          localField: "catalogField",
          foreignField: "_id",
          as: "catalogInfo",
        },
      },
      {
        $unwind: { path: "$catalogInfo", preserveNullAndEmptyArrays: true },
      },
      ...(artworkType === "subscription"
        ? [
            {
              $match: {
                "commercialization.activeTab": { $eq: "subscription" },
              },
            },
          ]
        : artworkType === "purchase"
        ? [
            {
              $match: {
                "commercialization.activeTab": { $eq: "purchase" },
              },
            },
          ]
        : [
            {
              $match: {
                "commercialization.activeTab": { $in: ["purchase", "subscription"] },
              },
            },
          ]),
      {
        $group: {
          _id: groupByField,
          artworks: {
            $push: {
              _id: "$_id",
              status: "$status",
              media: "$media.mainImage",
              provideArtistName: "$provideArtistName",
              discipline: "$discipline",
              artworkName: "$artworkName",
              artworkTechnic: "$additionalInfo.artworkTechnic",
              artworkSeries: "$artworkSeries",
              createdAt: "$createdAt",
            },
          },
        },
      },
      {
        $project: {
          groupName: "$_id",
          artworks: 1,
          _id: 0,
        },
      },
      { $sort: { groupName: 1 } },
    ]);

    return res.status(200).send({
      data: artworks,
      url: "https://dev.freshartclub.com/images",
    });
  }
});

const getArtworkById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  let { preview, viewType, userId } = req.query;

  let artwork = null;
  let artworks = [];

  if (req.user?.roles && req.user?.roles === "superAdmin") {
    artwork = await ArtWork.aggregate([
      {
        $match: {
          _id: objectId(id),
          isDeleted: false,
        },
      },
      {
        $set: {
          catalogField: {
            $ifNull: ["$commercialization.purchaseCatalog", "$commercialization.subscriptionCatalog"],
          },
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
        $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "catalogs",
          localField: "catalogField",
          foreignField: "_id",
          as: "catalogInfo",
        },
      },
      {
        $unwind: { path: "$catalogInfo", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          artworkId: 1,
          isHighlighted: 1,
          isArtProvider: 1,
          exclusive: 1,
          provideArtistName: 1,
          owner: {
            _id: "$ownerInfo._id",
            artistName: "$ownerInfo.artistName",
            artistId: "$ownerInfo.artistId",
            artistSurname1: "$ownerInfo.artistSurname1",
            artistSurname2: "$ownerInfo.artistSurname2",
          },
          rejectReason: 1,
          artworkName: 1,
          artworkCreationYear: 1,
          artworkSeries: 1,
          productDescription: 1,
          collectionList: 1,
          media: 1,
          additionalInfo: 1,
          commercialization: {
            $mergeObjects: [
              "$commercialization",
              {
                publishingCatalog: {
                  _id: "$catalogInfo._id",
                  catalogName: "$catalogInfo.catalogName",
                },
              },
            ],
          },
          pricing: 1,
          inventoryShipping: 1,
          discipline: 1,
          promotions: 1,
          restriction: 1,
          tags: 1,
          catalogInfo: 1,
          reviewDetails: 1,
          createdAt: 1,
        },
      },
    ]);

    return res.status(200).send({
      data: artwork[0],
    });
  } else {
    if (preview == "false") {
      artwork = await ArtWork.aggregate([
        {
          $match: {
            _id: objectId(id),
            status: "published",
            isDeleted: false,
          },
        },
        {
          $set: {
            catalogField: {
              $ifNull: ["$commercialization.purchaseCatalog", "$commercialization.subscriptionCatalog"],
            },
          },
        },
        {
          $lookup: {
            from: "artists",
            localField: "owner",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, artistName: 1, artistSurname1: 1, artistSurname2: 1, aboutArtist: 1, address: 1, profile: 1, insignia: 1 } },
            ],
            as: "ownerInfo",
          },
        },
        {
          $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "catalogs",
            localField: "catalogField",
            foreignField: "_id",
            as: "catalogInfo",
          },
        },
        {
          $unwind: { path: "$catalogInfo", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "insignias",
            localField: "ownerInfo.insignia",
            foreignField: "_id",
            pipeline: [{ $project: { credentialName: 1, insigniaImage: 1 } }],
            as: "insig",
          },
        },
        {
          $project: {
            _id: 1,
            status: 1,
            artworkId: 1,
            commingSoon: "$inventoryShipping.comingSoon",
            owner: {
              _id: "$ownerInfo._id",
              artistName: "$ownerInfo.artistName",
              artistSurname1: "$ownerInfo.artistSurname1",
              artistSurname2: "$ownerInfo.artistSurname2",
              address: { city: "$ownerInfo.address.city", country: "$ownerInfo.address.country" },
              aboutArtist: "$ownerInfo.aboutArtist",
              insignia: "$insig",
              profile: "$ownerInfo.profile.mainImage",
            },
            artworkName: 1,
            artworkCreationYear: 1,
            artworkSeries: 1,
            productDescription: 1,
            inventoryShipping: {
              packageHeight: "$inventoryShipping.packageHeight",
              packageLength: "$inventoryShipping.packageLength",
              packageMaterial: "$inventoryShipping.packageMaterial",
              packageWeight: "$inventoryShipping.packageWeight",
              packageWidth: "$inventoryShipping.packageWidth",
            },
            media: 1,
            discipline: "$discipline.artworkDiscipline",
            additionalInfo: {
              framed: "$additionalInfo.framed",
              hangingAvailable: "$additionalInfo.hangingAvailable",
              height: "$additionalInfo.height",
              artworkTechnic: "$additionalInfo.artworkTechnic",
              length: "$additionalInfo.length",
              offensive: "$additionalInfo.offensive",
              width: "$additionalInfo.width",
              framedDescription: "$additionalInfo.framedDescription",
              hangingDescription: "$additionalInfo.hangingDescription",
              frameHeight: "$additionalInfo.frameHeight",
              frameLenght: "$additionalInfo.frameLenght",
              frameWidth: "$additionalInfo.frameWidth",
              weight: "$additionalInfo.weight",
            },
            commercialization: {
              $mergeObjects: [
                "$commercialization",
                {
                  publishingCatalog: {
                    _id: "$catalogInfo._id",
                    catalogName: "$catalogInfo.catalogName",
                  },
                },
              ],
            },
            pricing: {
              currency: "$pricing.currency",
              dpersentage: "$pricing.dpersentage",
              basePrice: {
                $cond: {
                  if: { $eq: ["$commercialization.activeTab", "purchase"] },
                  then: "$pricing.basePrice",
                  else: "$$REMOVE",
                },
              },
            },
            tags: 1,
          },
        },
      ]);

      if (artwork.length === 0) {
        return res.status(400).json({ message: "Either artwork not found or not published" });
      }

      artworks = await ArtWork.aggregate([
        {
          $match: {
            owner: objectId(artwork[0].owner._id),
            _id: { $ne: objectId(artwork[0]._id) },
            isDeleted: false,
            status: "published",
          },
        },
        {
          $project: {
            _id: 1,
            status: 1,
            offensive: "$additionalInfo.offensive",
            commingSoon: "$inventoryShipping.comingSoon",
            artworkName: 1,
            mainImage: "$media.mainImage",
            additionalInfo: {
              technic: "$additionalInfo.artworkTechnic",
              width: "$additionalInfo.width",
              height: "$additionalInfo.height",
              length: "$additionalInfo.length",
              offensive: "$additionalInfo.offensive",
            },
            pricing: {
              currency: "$pricing.currency",
              basePrice: {
                $cond: {
                  if: { $eq: ["$commercialization.activeTab", "purchase"] },
                  then: "$pricing.basePrice",
                  else: "$$REMOVE",
                },
              },
            },
            discipline: "$discipline.artworkDiscipline",
          },
        },
        { $limit: 10 },
      ]);

      const viewTypes = ["new", "trending", "comingSoon", "highlight", "search"];
      const type = viewTypes.includes(viewType) ? viewType : null;

      if (userId && type !== null && userId !== artwork[0].owner._id) {
        await ArtWork.updateOne({ _id: objectId(id), "views.type": type }, { $inc: { "views.$.count": 1 } }).then(async (res) => {
          if (res.matchedCount === 0) {
            await ArtWork.updateOne({ _id: objectId(id) }, { $push: { views: { type, count: 1 } } });
          }
        });
      }

      return res.status(200).send({
        data: artwork[0],
        artworks: artworks,
      });
    }

    artwork = await ArtWork.aggregate([
      {
        $match: {
          _id: objectId(id),
        },
      },
      {
        $set: {
          catalogField: {
            $ifNull: ["$commercialization.purchaseCatalog", "$commercialization.subscriptionCatalog"],
          },
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
        $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "catalogs",
          localField: "catalogField",
          foreignField: "_id",
          as: "catalogInfo",
        },
      },
      {
        $unwind: { path: "$catalogInfo", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          artworkId: 1,
          isArtProvider: 1,
          provideArtistName: 1,
          views: 1,
          exclusive: 1,
          owner: {
            _id: "$ownerInfo._id",
            artistName: "$ownerInfo.artistName",
            artistId: "$ownerInfo.artistId",
            artistSurname1: "$ownerInfo.artistSurname1",
            artistSurname2: "$ownerInfo.artistSurname2",
            address: "$ownerInfo.address",
            aboutArtist: "$ownerInfo.aboutArtist",
            profile: "$ownerInfo.profile",
          },
          artworkName: 1,
          artworkCreationYear: 1,
          artworkSeries: 1,
          productDescription: 1,
          reviewDetails: 1,
          media: 1,
          additionalInfo: 1,
          commercialization: {
            $mergeObjects: [
              "$commercialization",
              {
                publishingCatalog: {
                  _id: "$catalogInfo._id",
                  catalogName: "$catalogInfo.catalogName",
                },
              },
            ],
          },
          pricing: 1,
          inventoryShipping: 1,
          discipline: 1,
          restriction: 1,
          tags: 1,
        },
      },
    ]);

    return res.status(200).send({
      data: artwork[0],
      artworks: artworks,
    });
  }
});

const getHomeArtwork = catchAsyncError(async (req, res, next) => {
  const [newAdded, homeArt, artists, commingSoon, freshartCircle] = await Promise.all([
    ArtWork.find(
      {
        status: "published",
        "inventoryShipping.comingSoon": false,
        isDeleted: false,
        // createdAt: { $gt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      },
      {
        media: "$media.mainImage",
        artworkName: 1,
        additionalInfo: 1,
        provideArtistName: 1,
        activeTab: "$commercialization.activeTab",
        price: {
          $cond: {
            if: {
              $and: [{ $eq: ["$commercialization.activeTab", "purchase"] }, { $eq: ["$commercialization.purchaseType", "Fixed Price"] }],
            },
            then: "$pricing.basePrice",
            else: "$$REMOVE",
          },
        },
        currency: {
          $cond: {
            if: {
              $and: [{ $eq: ["$commercialization.activeTab", "purchase"] }, { $eq: ["$commercialization.purchaseType", "Fixed Price"] }],
            },
            then: "$pricing.currency",
            else: "$$REMOVE",
          },
        },
        dpersentage: {
          $cond: {
            if: {
              $and: [{ $eq: ["$commercialization.activeTab", "purchase"] }, { $eq: ["$commercialization.purchaseType", "Fixed Price"] }],
            },
            then: "$pricing.dpersentage",
            else: "$$REMOVE",
          },
        },
        discipline: 1,
        "inventoryShipping.comingSoon": 1,
      }
    )
      .limit(10)
      .populate("owner", "artistName artistSurname1 artistSurname2")
      .sort({ createdAt: -1 })
      .lean(true),
    HomeArtwork.aggregate([
      {
        $match: { type: "Home-Page" },
      },
      {
        $lookup: {
          from: "artworks",
          localField: "artworks",
          foreignField: "_id",
          as: "artwork",
        },
      },
      {
        $unwind: { path: "$artwork", preserveNullAndEmptyArrays: true },
      },
      {
        $match: { "artwork.status": "published" },
      },
      {
        $lookup: {
          from: "artists",
          localField: "artwork.owner",
          foreignField: "_id",
          as: "ownerData",
        },
      },
      {
        $addFields: {
          "artwork.owner": { $arrayElemAt: ["$ownerData", 0] },
        },
      },
      {
        $group: {
          _id: "$_id",
          artworksTitle: { $first: "$artworksTitle" },
          artworks: { $push: "$artwork" },
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
                media: "$$item.media.mainImage",
                additionalInfo: "$$item.additionalInfo",
                provideArtistName: "$$item.provideArtistName",
                activeTab: "$$item.commercialization.activeTab",
                price: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ["$item.commercialization.activeTab", "purchase"] },
                        { $eq: ["$item.commercialization.purchaseType", "Fixed Price"] },
                      ],
                    },
                    then: "$item.commercialization.basePrice",
                    else: "$$REMOVE",
                  },
                },
                currency: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ["$item.commercialization.activeTab", "purchase"] },
                        { $eq: ["$item.commercialization.purchaseType", "Fixed Price"] },
                      ],
                    },
                    then: "$item.commercialization.currency",
                    else: "$$REMOVE",
                  },
                },
                discount: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ["$item.commercialization.activeTab", "purchase"] },
                        { $eq: ["$item.commercialization.purchaseType", "Fixed Price"] },
                      ],
                    },
                    then: "$item.commercialization.dpersentage",
                    else: "$$REMOVE",
                  },
                },
                discipline: "$$item.discipline",
                comingSoon: "$$item.inventoryShipping.comingSoon",
                owner: {
                  artistName: "$$item.owner.artistName",
                  artistSurname1: "$$item.owner.artistSurname1",
                  artistSurname2: "$$item.owner.artistSurname2",
                },
              },
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]),
    Artist.find(
      {
        isActivated: true,
        isDeleted: false,
      },
      {
        artistName: 1,
        artistSurname1: 1,
        artistSurname2: 1,
        aboutArtist: 1,
        profile: 1,
      }
    )
      .limit(10)
      .sort({ createdAt: -1 })
      .lean(true),
    ArtWork.find(
      {
        "inventoryShipping.comingSoon": true,
        status: "published",
        isDeleted: false,
      },
      {
        media: "$media.mainImage",
        artworkName: 1,
        additionalInfo: 1,
        provideArtistName: 1,
        activeTab: "$commercialization.activeTab",
        price: {
          $cond: {
            if: {
              $and: [{ $eq: ["$commercialization.activeTab", "purchase"] }, { $eq: ["$commercialization.purchaseType", "Fixed Price"] }],
            },
            then: "$pricing.basePrice",
            else: "$$REMOVE",
          },
        },
        currency: {
          $cond: {
            if: {
              $and: [{ $eq: ["$commercialization.activeTab", "purchase"] }, { $eq: ["$commercialization.purchaseType", "Fixed Price"] }],
            },
            then: "$pricing.currency",
            else: "$$REMOVE",
          },
        },
        discounr: {
          $cond: {
            if: {
              $and: [{ $eq: ["$commercialization.activeTab", "purchase"] }, { $eq: ["$commercialization.purchaseType", "Fixed Price"] }],
            },
            then: "$pricing.dpersentage",
            else: "$$REMOVE",
          },
        },
        discipline: 1,
        "inventoryShipping.comingSoon": 1,
      }
    )
      .limit(10)
      .populate("owner", "artistName artistSurname1 artistSurname2")
      .sort({ createdAt: -1 })
      .lean(true),
    Circle.aggregate([
      {
        $match: {
          foradmin: true,
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
          foradmin: 1,
          status: 1,
        },
      },
    ]),
  ]);

  let trending = homeArt.find((item) => item.artworksTitle === "Trending Artworks")?.artworks;
  let highlighted = homeArt.find((item) => item.artworksTitle === "Highlighted Artworks")?.artworks;

  res.status(200).send({
    newAdded,
    trending: trending && trending[0].artworkName ? trending : [],
    highlighted: highlighted && highlighted[0].artworkName ? highlighted : [],
    artists,
    commingSoon,
    freshartCircle,
  });
});

const addToRecentView = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const artworkExists = await ArtWork.exists({ _id: id });
  if (!artworkExists) {
    return res.status(400).send({ message: "Artwork not found" });
  }

  const result = await RecentlyView.findOneAndUpdate(
    { owner: req.user._id },
    {
      $pull: { artworks: id },
    },
    { new: true, upsert: true }
  );

  if (result) {
    result.artworks.unshift(id);
    result.artworks = result.artworks.slice(0, 25);
    await result.save();
  }

  res.status(200).send({ message: "Success" });
});

const getRecentlyView = catchAsyncError(async (req, res, next) => {
  const recentViewed = await RecentlyView.findOne({ owner: req.user._id }, { artworks: 1 }).lean();

  if (!recentViewed || !recentViewed.artworks || recentViewed.artworks.length === 0) {
    return res.status(200).send({
      data: [],
    });
  }

  const artworks = await ArtWork.aggregate([
    {
      $match: {
        _id: { $in: recentViewed.artworks },
        status: "published",
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "owner",
        foreignField: "_id",
        as: "artist",
      },
    },
    {
      $unwind: {
        path: "$artist",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        status: 1,
        artworkId: 1,
        owner: {
          artistName: "$artist.artistName",
          artistSurname1: "$artist.artistSurname1",
          artistSurname2: "$artist.artistSurname2",
        },
        offensive: "$additionalInfo.offensive",
        artworkName: 1,
        media: "$media.mainImage",
        additionalInfo: {
          artworkTechnic: "$additionalInfo.artworkTechnic",
        },
        discipline: 1,
      },
    },
  ]);

  res.status(200).send({ data: artworks });
});

const validateArtwork = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const artwork = await ArtWork.findOne({ _id: id }, { status: 1, owner: 1, artworkName: 1 }).lean(true);
  if (!artwork) return res.status(400).send({ message: "Artwork not found" });

  if (artwork.status === "pending") {
    ArtWork.updateOne({ _id: id }, { status: "published" }).then();
    Notification.updateOne(
      { user: artwork.owner },
      {
        $push: {
          notifications: {
            subject: "Artwork Status Updated",
            message: `Status of your artwork "${artwork.artworkName}" has been updated to Published`,
          },
        },
      }
    );
    return res.status(200).send({ message: "Artwork successfully validated" });
  } else {
    return res.status(400).send({ message: "Artwork is in draft or already validated" });
  }
});

const searchArtwork = catchAsyncError(async (req, res, next) => {
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

  const artworks = await ArtWork.aggregate([
    {
      $lookup: {
        from: "artists",
        localField: "owner",
        foreignField: "_id",
        as: "artist",
      },
    },
    {
      $match: {
        isDeleted: false,
        status: "published",
        $or: [
          { artworkName: { $regex: s, $options: "i" } },
          { artworkId: { $regex: s, $options: "i" } },
          { "artist.artistName": { $regex: s, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        artworkId: 1,
        artworkName: 1,
        artistName: "$artist.artistName",
        artistSurname1: "$artist.artistSurname1",
        artistSurname2: "$artist.artistSurname2",
        nickname: "$artist.nickName",
        media: "$media.mainImage",
        inventoryShipping: 1,
      },
    },
  ]);

  res.status(200).send({ data: artworks });
});

const addSeriesToArtist = catchAsyncError(async (req, res, next) => {
  let { id } = req.params;
  if (!id) id = req.user._id;
  const { seriesName } = req.body;

  if (!seriesName) return res.status(400).send({ message: "Series name is required" });

  const result = await Artist.updateOne({ _id: id, artistSeriesList: { $ne: seriesName } }, { $addToSet: { artistSeriesList: seriesName.trim() } });

  if (result.matchedCount === 0) {
    return res.status(400).send({ message: "Artist not found or series already exists" });
  }

  return res.status(200).send({ message: "Series added successfully" });
});

const getAllArtworks = catchAsyncError(async (req, res, next) => {
  let {
    type,
    limit,
    cursor,
    direction,
    currPage,
    s,
    discipline,
    theme,
    technic,
    style,
    color,
    orientation,
    comingsoon,
    depth,
    height,
    weight,
    width,
    price,
    tag,
    name,
    discount,
    purchase,
    purchaseOption,
    exclusive,
    newIn,
    bigDiscount,
    insig,
  } = req.query;

  if (!type) return res.status(400).send({ message: "Artwork Type is required" });

  type = type.toLowerCase();
  s = s ? s : "";

  theme = req.query.theme ? req.query.theme.split(",") : [];
  discipline = req.query.discipline ? req.query.discipline.split(",") : [];
  technic = req.query.technic ? req.query.technic.split(",") : [];
  style = req.query.style ? req.query.style.split(",") : [];

  // weight = weight.split(",");
  height = height.split(",");
  width = width.split(",");
  depth = depth ? depth.split(",") : [];
  price = price ? price.split(",") : [];

  // if (weight[0] == 0 && weight[1] == 300) weight = [];
  if (height[0] == 0 && height[1] == 300) height = [];
  if (width[0] == 0 && width[1] == 300) width = [];
  if (price[0] == 0 && price[1] == 10000) price = [];
  if (depth && depth[0] == 0 && depth[1] == 300) depth = [];

  limit = parseInt(limit) || 10;
  cursor = cursor || null;
  const nameParts = name?.trim().split(/\s+/) || [];

  const matchStage = {
    isDeleted: false,
    status: "published",
    "commercialization.activeTab": type,
    artworkName: { $regex: s, $options: "i" },
    ...(name &&
      nameParts.length === 1 && {
        $or: [
          { "ownerInfo.artistName": { $regex: nameParts[0], $options: "i" } },
          { "ownerInfo.artistSurname1": { $regex: nameParts[0], $options: "i" } },
          { "ownerInfo.artistSurname2": { $regex: nameParts[0], $options: "i" } },
        ],
      }),

    ...(name &&
      nameParts.length >= 2 && {
        $or: [
          {
            $and: [
              { "ownerInfo.artistName": { $regex: `^${nameParts[0]}`, $options: "i" } },
              { "ownerInfo.artistSurname1": { $regex: `^${nameParts[1]}`, $options: "i" } },
            ],
          },
          {
            $and: [
              { "ownerInfo.artistName": { $regex: `^${nameParts[0]}`, $options: "i" } },
              { "ownerInfo.artistSurname2": { $regex: `^${nameParts[1]}`, $options: "i" } },
            ],
          },
          ...(nameParts.length === 3
            ? [
                {
                  $and: [
                    { "ownerInfo.artistName": { $regex: `^${nameParts[0]}`, $options: "i" } },
                    { "ownerInfo.artistSurname1": { $regex: `^${nameParts[1]}`, $options: "i" } },
                    { "ownerInfo.artistSurname2": { $regex: `^${nameParts[2]}`, $options: "i" } },
                  ],
                },
              ]
            : []),
        ],
      }),
    ...(discipline.length && { "discipline.artworkDiscipline": { $in: discipline } }),
    ...(theme.length && { "additionalInfo.artworkTheme": { $in: theme } }),
    ...(technic.length && { "additionalInfo.artworkTechnic": { $in: technic } }),
    ...(style.length && { "additionalInfo.artworkStyle": { $elemMatch: { $in: style } } }),
    ...(color && { "additionalInfo.colors": { $in: [color] } }),
    ...(orientation && { "additionalInfo.artworkOrientation": orientation }),
    ...(comingsoon && { "inventoryShipping.comingSoon": comingsoon == "Yes" ? true : false }),

    // ...(weight.length > 0 && { "additionalInfo.weight": { $gte: Number(weight[0]), $lte: Number(weight[1]) } }),
    ...(height.length > 0 && { "additionalInfo.height": { $gte: Number(height[0]), $lte: Number(height[1]) } }),
    ...(width.length > 0 && { "additionalInfo.width": { $gte: Number(width[0]), $lte: Number(width[1]) } }),
    ...(depth.length > 0 && { "additionalInfo.length": { $gte: Number(depth[0]), $lte: Number(depth[1]) } }),
    ...(price.length > 0 && { "pricing.basePrice": { $gte: Number(price[0]), $lte: Number(price[1]) } }),
    ...(tag && { "tags.extTags": { $regex: tag, $options: "i" } }),
    ...(discount && { "pricing.dpersentage": discount == "Yes" ? { $gt: 0 } : { $eq: 0 } }),
    ...(purchase && { "commercialization.purchaseType": purchase }),
    ...(purchaseOption && type == "subscription" && { "commercialization.purchaseOption": purchaseOption }),
    ...(exclusive === "Yes" ? { exclusive: true } : exclusive === "No" ? { exclusive: { $exists: false } } : {}),
    // ...(newIn && newIn === "Yes" && { createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) } }),
    ...(bigDiscount && bigDiscount == "Yes" && { "pricing.dpersentage": { $gte: 20 } }),
    ...(insig && { "ownerInfo.insignia": objectId(insig) }),
  };
  const totalCount = await ArtWork.countDocuments(matchStage);

  if (cursor) {
    if (direction === "next") {
      matchStage._id = { $lt: objectId(cursor) };
    } else if (direction === "prev") {
      matchStage._id = { $gt: objectId(cursor) };
    }
  }

  let artworkList = await ArtWork.aggregate([
    {
      $lookup: {
        from: "artists",
        localField: "owner",
        foreignField: "_id",
        as: "ownerInfo",
        pipeline: [{ $project: { _id: 1, artistName: 1, artistSurname1: 1, artistSurname2: 1, insignia: 1 } }],
      },
    },
    {
      $unwind: {
        path: "$ownerInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    { $match: matchStage },
    {
      $project: {
        _id: 1,
        artworkName: 1,
        artistName: "$ownerInfo.artistName",
        artistSurname1: "$ownerInfo.artistSurname1",
        artistSurname2: "$ownerInfo.artistSurname2",
        provideArtistName: 1,
        media: "$media.mainImage",
        artworkId: 1,
        artworkCreationYear: 1,
        artworkSeries: 1,
        discipline: "$discipline.artworkDiscipline",
        comingSoon: "$inventoryShipping.comingSoon",
        pricing: {
          basePrice: {
            $cond: {
              if: {
                $and: [{ $eq: ["$commercialization.activeTab", "purchase"] }, { $eq: ["$commercialization.purchaseType", "Fixed Price"] }],
              },
              then: "$pricing.basePrice",
              else: "$$REMOVE",
            },
          },
          currency: {
            $cond: {
              if: {
                $and: [{ $eq: ["$commercialization.activeTab", "purchase"] }, { $eq: ["$commercialization.purchaseType", "Fixed Price"] }],
              },
              then: "$pricing.currency",
              else: "$$REMOVE",
            },
          },
          dpersentage: {
            $cond: {
              if: {
                $and: [{ $eq: ["$commercialization.activeTab", "purchase"] }, { $eq: ["$commercialization.purchaseType", "Fixed Price"] }],
              },
              then: "$pricing.dpersentage",
              else: "$$REMOVE",
            },
          },
        },
        artworkTechnic: 1,
        additionalInfo: 1,
        commercialization: 1,
        owner: 1,
        status: 1,
      },
    },
    { $sort: { _id: direction === "prev" ? 1 : -1, ...(newIn && { createdAt: -1 }) } },
    { $limit: limit + 1 },
  ]);

  const hasNextPage =
    (currPage === 1 && artworkList.length > limit) || artworkList.length > limit || (direction === "prev" && artworkList.length === limit);

  if (hasNextPage && direction) {
    if (direction === "next") artworkList.pop();
  } else if (hasNextPage) {
    artworkList.pop();
  }

  const hasPrevPage = currPage == 1 ? false : true;

  if (direction === "prev" && currPage != 1) {
    artworkList.reverse().shift();
  } else if (direction === "prev") {
    artworkList.reverse();
  }

  const nextCursor = hasNextPage ? artworkList[artworkList.length - 1]._id : null;
  const prevCursor = hasPrevPage ? artworkList[0]._id : null;

  res.status(200).send({
    data: artworkList,
    nextCursor,
    prevCursor,
    hasNextPage,
    hasPrevPage,
    totalCount: totalCount,
  });
});

const getArtworkGroupBySeries = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Artist Id is required" });

  const artworks = await ArtWork.aggregate([
    {
      $match: {
        isDeleted: false,
        owner: objectId(id),
        status: "published",
      },
    },
    {
      $group: {
        _id: "$artworkSeries",
        // artworks: { $push: "$$ROOT" },
        artworks: {
          $push: {
            _id: "$_id",
            status: "$status",
            media: "$media.mainImage",
            artworkName: "$artworkName",
            artworkSeries: "$artworkSeries",
            createdAt: "$createdAt",
          },
        },
      },
    },
    {
      $project: {
        groupName: "$_id",
        artworks: 1,
        _id: 0,
      },
    },
    { $sort: { groupName: 1 } },
  ]);

  res.status(200).send({
    data: artworks,
    url: "https://dev.freshartclub.com/images",
  });
});

const getOtherArtworks = catchAsyncError(async (req, res, next) => {
  const { id, discipline, style, theme, subscription } = req.query;

  const artworks = await ArtWork.aggregate([
    {
      $match: {
        owner: { $ne: objectId(id) },
        isDeleted: false,
        status: "published",
        ...(discipline && { "discipline.artworkDiscipline": discipline }),
        ...(style && { "additionalInfo.artworkStyle": style }),
        ...(theme && { "additionalInfo.artworkTheme": theme }),
        // ...(subscription && { "commercialization.subscription": subscription }),
      },
    },
    {
      $project: {
        _id: 1,
        status: 1,
        offensive: "$additionalInfo.offensive",
        commingSoon: "$inventoryShipping.comingSoon",
        artworkName: 1,
        mainImage: "$media.mainImage",
        additionalInfo: {
          technic: "$additionalInfo.artworkTechnic",
          width: "$additionalInfo.width",
          height: "$additionalInfo.height",
          length: "$additionalInfo.length",
        },
        pricing: {
          currency: "$pricing.currency",
          basePrice: {
            $cond: {
              if: { $eq: ["$commercialization.activeTab", "purchase"] },
              then: "$pricing.basePrice",
              else: "$$REMOVE",
            },
          },
        },
        discipline: "$discipline.artworkDiscipline",
      },
    },
  ]);

  return res.status(200).send({
    data: artworks,
  });
});

// --------------------------- make offer -------------------------

const makeUserOffer = catchAsyncError(async (req, res, next) => {
  const errors = validationResult(req);
  const checkValid = await checkValidations(errors);

  if (checkValid.type === "error") {
    return res.status(400).send({
      message: checkValid.errors.msg,
    });
  }

  const { offer, offerType, artistId, counterAccept } = req.body;
  const { id: artworkId } = req.params;
  const userId = req.user._id;

  const MAX_COUNTER_OFFERS = 3;

  const [artwork, artist, user] = await Promise.all([
    ArtWork.findById(artworkId, { pricing: 1, commercialization: 1, owner: 1, status: 1 }).lean(),
    Artist.findById(artistId, { artistName: 1, isActivated: 1 }).lean(),
    Artist.findById(userId, { artistName: 1, monthlyNegotiations: 1 }).lean(),
  ]);

  if (!artwork || artwork.status !== "published") return res.status(400).send({ message: "Artwork not available." });
  if (!artist || !artist.isActivated) return res.status(400).send({ message: "Artist not found or not activated." });
  if (String(artwork.owner) === String(userId)) return res.status(400).send({ message: "You cannot make an offer on your own artwork." });
  if (artwork.commercialization.activeTab === "subscription") return res.status(400).send({ message: "Artwork is only available for subscription." });
  if (artwork.commercialization.purchaseType.toLowerCase() === "fixed price")
    return res.status(400).send({ message: "Artwork is fixed-price; offers cannot be made." });

  if (offerType !== artwork.commercialization?.purchaseType) {
    return res.status(400).send({ message: "Artwork not available for this offer." });
  }

  if (offerType === "Upward Offer" && offer && offer < Number(artwork.pricing?.acceptOfferPrice)) {
    return res.status(400).send({ message: "Offer is below minimum acceptable price." });
  }

  if (user.monthlyNegotiations == 0) {
    return res.status(400).send({ message: "User has no remaining negotiations this month." });
  }

  const offerExists = await MakeOffer.findOne({ user: userId, artwork: artworkId, type: offerType, offeredArtist: artistId })
    .sort({ createdAt: -1 })
    .lean();

  if (offerExists) {
    const offerCreatedDate = new Date(offerExists.createdAt);
    const currentDate = new Date();

    const isSameMonth = offerCreatedDate.getFullYear() === currentDate.getFullYear() && offerCreatedDate.getMonth() === currentDate.getMonth();

    if (isSameMonth) {
      if (offerExists.status === "complete") {
        return res.status(400).send({ message: "Your previous offer has been completed. Please wait for next month to again make an offer" });
      }

      const lastIndex = offerExists.counterOffer.length - 1;
      if (offerExists.counterOffer[lastIndex].userType == "user" && offerExists.counterOffer[lastIndex].isAccepted == null) {
        return res.status(400).send({ message: "Wait for the artist to accept/reject or counter the offer" });
      }

      if (counterAccept == true) {
        if (offerExists.counterOffer[lastIndex].isAccepted != null) {
          return res.status(400).send({ message: "Offer has already been accepted/rejected" });
        }

        const updateFields = {
          [`counterOffer.${lastIndex}.isAccepted`]: true,
          status: "complete",
        };

        const result = await MakeOffer.updateOne({ _id: offerExists._id }, { $set: updateFields });
        if (result.modifiedCount == 0) {
          return res.status(400).send({ message: "Something went wrong." });
        }

        return res.status(200).send({ message: "Offer accepted successfully." });
      }

      if (offerExists.maxOffer < MAX_COUNTER_OFFERS) {
        await MakeOffer.updateOne(
          { _id: offerExists._id },
          {
            $set: { [`counterOffer.${lastIndex}.isAccepted`]: false },
          }
        );

        const [resultOffer, negoUpdate] = await Promise.all([
          MakeOffer.updateOne(
            { _id: offerExists._id },
            {
              $inc: { maxOffer: 1 },
              $push: {
                counterOffer: {
                  offerprice: offer,
                  createdAt: new Date(),
                  userType: "user",
                  isAccepted: null,
                },
              },
            }
          ),
          Artist.updateOne(
            { _id: artistId },
            {
              $inc: { monthlyNegotiations: -1 },
            }
          ),
        ]);

        if (resultOffer.modifiedCount == 0 || negoUpdate.modifiedCount == 0) {
          return res.status(400).send({ message: "Something went wrong." });
        }

        return res.status(200).send({ message: "Counter Offer made successfully." });
      } else {
        await MakeOffer.updateOne(
          { _id: offerExists._id },
          {
            $set: {
              [`counterOffer.${lastIndex}.isAccepted`]: false,
              status: "complete",
            },
          }
        );

        return res.status(200).send({ message: "Counter Offer rejected." });
      }
    }

    return res.status(400).send({
      message: "Your previous offer has expired. Would you like to make new offer to this artwork",
    });
  }

  await Promise.all([
    MakeOffer.create({
      user: userId,
      artwork: artworkId,
      type: offerType,
      offeredArtist: artistId,
      status: "pending",
      maxOffer: 1,
      counterOffer: [{ offerprice: offer, userType: "user", isAccepted: null, createdAt: new Date() }],
    }),
    Artist.updateOne({ _id: userId }, { $inc: { monthlyNegotiations: -1 } }),
  ]);

  return res.status(200).send({
    message: "Offer submitted successfully.",
  });
});

const getOffer = catchAsyncError(async (req, res, next) => {
  const { id: artworkId } = req.params;

  const offer = await MakeOffer.findOne({ artwork: artworkId, user: req.user._id }, { status: 1, counterOffer: 1, maxOffer: 1, type: 1 }).lean();

  return res.status(200).send({ data: offer || {} });
});

const makeArtistOffer = catchAsyncError(async (req, res, next) => {
  const errors = validationResult(req);
  const checkValid = await checkValidations(errors);

  if (checkValid.type === "error") {
    return res.status(400).send({
      message: checkValid.errors.msg,
    });
  }

  const { offer, isAccepted, counterAccept } = req.body;
  const { id: offerId } = req.params;
  const artistId = req.user._id;

  const [checkOffer, artist] = await Promise.all([
    MakeOffer.findById(offerId).lean(),
    Artist.findById(artistId, { artistName: 1, isActivated: 1, monthlyNegotiations: 1 }).lean(),
  ]);

  if (!checkOffer) {
    return res.status(400).send({ message: "Offer not found" });
  }

  if (!artist || !artist.isActivated) {
    return res.status(400).send({ message: "Artist not found" });
  }

  if (checkOffer.offeredArtist.toString() !== artistId.toString()) {
    return res.status(400).send({ message: "You are not authorized to accept this offer" });
  }

  if (checkOffer.status !== "pending") {
    return res.status(400).send({ message: "Offer has been completed" });
  }

  const lastIndex = checkOffer.counterOffer.length - 1;
  if (checkOffer.counterOffer[lastIndex].userType !== "user") {
    return res.status(400).send({ message: "Wait for the user to make a counter offer" });
  }

  if (checkOffer.maxOffer === 3 && checkOffer.counterOffer[lastIndex].userType == "artist") {
    return res.status(400).send({ message: "Offer has reached the maximum number of counter" });
  }

  if (counterAccept == true) {
    if (checkOffer.counterOffer[lastIndex].isAccepted != null) {
      return res.status(400).send({ message: "Offer has already been accepted/rejected" });
    }

    const updateFields = {
      [`counterOffer.${lastIndex}.isAccepted`]: isAccepted,
    };

    if (checkOffer.maxOffer === 3 && (isAccepted == true || isAccepted == false)) {
      updateFields.status = "complete";
    } else if (isAccepted) {
      updateFields.status = "complete";
    }

    const result = await MakeOffer.updateOne({ _id: checkOffer._id }, { $set: updateFields });
    if (result.modifiedCount == 0) {
      return res.status(400).send({ message: "Something went wrong." });
    }

    return res.status(200).send({ message: "Offer accepted successfully." });
  }

  if (checkOffer.counterOffer[lastIndex].isAccepted != null) {
    return res.status(400).send({ message: "Can't make counter offer" });
  }

  // make previous offer automatically reject if counter offer is false

  await MakeOffer.updateOne(
    { _id: checkOffer._id },
    {
      $set: { [`counterOffer.${lastIndex}.isAccepted`]: false },
    }
  );

  const resultOffer = await MakeOffer.updateOne(
    { _id: checkOffer._id },
    {
      $push: {
        counterOffer: {
          offerprice: offer,
          createdAt: new Date(),
          userType: "artist",
          isAccepted: null,
        },
      },
    }
  );

  if (resultOffer.modifiedCount == 0) {
    return res.status(400).send({ message: "Something went wrong." });
  }

  return res.status(200).send({ message: "Counter Offer made successfully." });
});

module.exports = {
  adminCreateArtwork,
  artistCreateArtwork,
  getAdminArtworkList,
  getArtistById,
  getAllUsers,
  removeArtwork,
  getArtworkById,
  getArtistArtwork,
  publishArtwork,
  getHomeArtwork,
  addToRecentView,
  getRecentlyView,
  validateArtwork,
  searchArtwork,
  addSeriesToArtist,
  moveArtworkToPending,
  artistModifyArtwork,
  getAllArtworks,
  getArtworkGroupBySeries,
  getOtherArtworks,
  makeUserOffer,
  getOffer,
  makeArtistOffer,
};
