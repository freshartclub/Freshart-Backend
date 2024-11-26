const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const SubscriptionOrder = require("../models/subscriptionOrderModel");
const PurchaseOrder = require("../models/purchaseOrderModel");
const objectId = require("mongoose").Types.ObjectId;

const createOrder = catchAsyncError(async (req, res, next) => {
  const user = await Artist.findOne({ _id: req.user._id }, { cart: 1 }).lean(
    true
  );
  if (!user) return res.status(400).send({ message: "User not found" });
  let items = [];

  const orderID = Math.random().toString(36).substring(2, 8).toUpperCase();

  if (req.body.items) {
    items = req.body.items.map((item) => {
      return {
        artWork: item.id,
        quantity: item.quantity,
      };
    });
  }

  let order = null;
  if (req.body.orderType === "subscription") {
    order = await SubscriptionOrder.create({
      orderID: orderID,
      user: user._id,
      status: "pending",
      tax: req.body.tax,
      shipping: req.body.shipping,
      discount: req.body.discount,
      subTotal: req.body.subTotal,
      items: items,
    });
  } else {
    order = await PurchaseOrder.create({
      user: user._id,
      orderID: orderID,
      status: "pending",
      tax: req.body.tax,
      shipping: req.body.shipping,
      subTotal: req.body.subTotal,
      discount: req.body.discount,
      items: items,
    });
  }

  if (!order) return res.status(400).send({ message: "Order not created" });

  const itemIds = items.map((item) => objectId(item.artWork));
  await Artist.updateOne(
    { _id: user._id },
    { $pull: { cart: { item: { $in: itemIds } } } }
  );

  return res
    .status(200)
    .send({ message: "Order Created Successfully", data: order });
});

const getAllSubscriptionOrder = catchAsyncError(async (req, res, next) => {
  const orders = await SubscriptionOrder.find({})
    .populate("user", "artistName artistSurname1 artistSurname2 email")
    .populate({
      path: "items",
      select: "quantity artWork",
      populate: {
        path: "artWork",
        select: "artworkName media inventoryShipping pricing",
      },
    })
    .lean(true);

  return res
    .status(200)
    .send({ data: orders, url: "https://dev.freshartclub.com/images" });
});

const getAllPurchaseOrder = catchAsyncError(async (req, res, next) => {
  const orders = await PurchaseOrder.find({})
    .populate("user", "artistName artistSurname1 artistSurname2 email profile")
    .populate({
      path: "items",
      select: "quantity artWork",
      populate: {
        path: "artWork",
        select: "artworkName media inventoryShipping pricing",
      },
    })
    .lean(true);

  return res
    .status(200)
    .send({ data: orders, url: "https://dev.freshartclub.com/images" });
});

const getAllUserOrder = catchAsyncError(async (req, res, next) => {
  const [subOrders, purchaseOrders] = await Promise.all([
    SubscriptionOrder.find({ user: req.user._id })
      .populate({
        path: "items",
        select: "quantity artWork",
        populate: {
          path: "artWork",
          select: "artworkName media.mainImage inventoryShipping pricing",
        },
      })
      .lean(true),
    PurchaseOrder.find({ user: req.user._id })
      .populate({
        path: "items",
        select: "quantity artWork",
        populate: {
          path: "artWork",
          select: "artworkName media.mainImage inventoryShipping pricing",
        },
      })
      .lean(true),
  ]);

  return res.status(200).send({
    subscription: subOrders,
    purchase: purchaseOrders,
    url: "https://dev.freshartclub.com/images",
  });
});

// const getCombinedArtistOrder = catchAsyncError(async (req, res, next) => {
//   const loggedUserId = req.user._id;

//   const user = await Artist.findOne({ _id: loggedUserId }, { role: 1 }).lean(
//     true
//   );
//   if (!user) return res.status(400).send({ message: "Artist not found" });
//   if (user.role !== "artist")
//     return res
//       .status(400)
//       .send({ message: "You are not authorized to access this page" });

//   const combinedOrders = await SubscriptionOrder.aggregate([
//     {
//       $lookup: {
//         from: "artworks",
//         localField: "items.artWork",
//         foreignField: "_id",
//         as: "artWorkDetails",
//       },
//     },
//     { $unwind: "$artWorkDetails" },
//     {
//       $lookup: {
//         from: "artists",
//         localField: "user",
//         foreignField: "_id",
//         as: "user",
//       },
//     },
//     { $unwind: "$user" },
//     {
//       $match: {
//         "artWorkDetails.owner": objectId(loggedUserId),
//       },
//     },
//     {
//       $project: {
//         _id: 1,
//         status: 1,
//         tax: 1,
//         shipping: 1,
//         subTotal: 1,
//         image: "$artWorkDetails.media.mainImage",
//         artWorkName: "$artWorkDetails.artworkName",
//         artistName: "$user.artistName",
//         artistSurname1: "$user.artistSurname1",
//         artistSurname2: "$user.artistSurname2",
//         email: "$user.email",
//         length: "$artWorkDetails.additionalInfo.length",
//         height: "$artWorkDetails.additionalInfo.height",
//         width: "$artWorkDetails.additionalInfo.width",
//         orderID: 1,
//         orderType: 1,
//         createdAt: 1,
//       },
//     },
//     {
//       $unionWith: {
//         coll: "purchaseorders",
//         pipeline: [
//           {
//             $lookup: {
//               from: "artworks",
//               localField: "items.artWork",
//               foreignField: "_id",
//               as: "artWorkDetails",
//             },
//           },
//           { $unwind: "$artWorkDetails" },
//           {
//             $lookup: {
//               from: "artists",
//               localField: "user",
//               foreignField: "_id",
//               as: "user",
//             },
//           },
//           { $unwind: "$user" },
//           {
//             $match: {
//               "artWorkDetails.owner": objectId(loggedUserId),
//             },
//           },
//           {
//             $project: {
//               _id: 1,
//               status: 1,
//               tax: 1,
//               shipping: 1,
//               subTotal: 1,
//               image: "$artWorkDetails.media.mainImage",
//               artWorkName: "$artWorkDetails.artworkName",
//               artistName: "$user.artistName",
//               artistSurname1: "$user.artistSurname1",
//               artistSurname2: "$user.artistSurname2",
//               email: "$user.email",
//               length: "$artWorkDetails.additionalInfo.length",
//               height: "$artWorkDetails.additionalInfo.height",
//               width: "$artWorkDetails.additionalInfo.width",
//               orderID: 1,
//               orderType: 1,
//               createdAt: 1,
//             },
//           },
//         ],
//       },
//     },
//     { $sort: { createdAt: -1 } }, // Sort combined results by `createdAt`
//   ]);

//   return res.status(200).send({
//     orders: combinedOrders,
//     url: "https://dev.freshartclub.com/images",
//   });
// });

const getArtistOrder = catchAsyncError(async (req, res, next) => {
  const loggedUserId = req.user._id;

  const user = await Artist.findOne({ _id: loggedUserId }, { role: 1 }).lean(
    true
  );
  if (!user) return res.status(400).send({ message: "Artist not found" });
  if (user.role !== "artist")
    return res
      .status(400)
      .send({ message: "You are not authorized to access this page" });

  const [subOrder, purchaseOrder] = await Promise.all([
    SubscriptionOrder.aggregate([
      {
        $lookup: {
          from: "artworks",
          localField: "items.artWork",
          foreignField: "_id",
          as: "artWorkDetails",
        },
      },
      { $unwind: "$artWorkDetails" },
      {
        $lookup: {
          from: "artists",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "artWorkDetails.owner": objectId(loggedUserId),
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          tax: 1,
          shipping: 1,
          subTotal: 1,
          items: 1,
          image: "$artWorkDetails.media.mainImage",
          artWorkName: "$artWorkDetails.artworkName",
          artistName: "$user.artistName",
          artistSurname1: "$user.artistSurname1",
          artistSurname2: "$user.artistSurname2",
          email: "$user.email",
          length: "$artWorkDetails.additionalInfo.length",
          height: "$artWorkDetails.additionalInfo.height",
          width: "$artWorkDetails.additionalInfo.width",
          orderID: 1,
          orderType: 1,
          createdAt: 1,
        },
      },
    ]),
    PurchaseOrder.aggregate([
      {
        $lookup: {
          from: "artworks",
          localField: "items.artWork",
          foreignField: "_id",
          as: "artWorkDetails",
        },
      },
      { $unwind: "$artWorkDetails" },
      {
        $lookup: {
          from: "artists",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "artWorkDetails.owner": objectId(loggedUserId),
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          tax: 1,
          image: "$artWorkDetails.media.mainImage",
          artWorkName: "$artWorkDetails.artworkName",
          artistName: "$user.artistName",
          artistSurname1: "$user.artistSurname1",
          artistSurname2: "$user.artistSurname2",
          email: "$user.email",
          length: "$artWorkDetails.additionalInfo.length",
          height: "$artWorkDetails.additionalInfo.height",
          width: "$artWorkDetails.additionalInfo.width",
          shipping: 1,
          subTotal: 1,
          orderID: 1,
          items: 1,
          orderType: 1,
          createdAt: 1,
        },
      },
    ]),
  ]);

  return res.status(200).send({
    subscription: subOrder,
    purchase: purchaseOrder,
    url: "https://dev.freshartclub.com/images",
  });
});

const getArtistSingleOrder = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { orderType } = req.query;

  if (!id || !orderType)
    return res
      .status(400)
      .send({ message: "Please provide valid order id and order type" });

  let order = null;
  if (orderType.toLowerCase() === "subscription") {
    order = await SubscriptionOrder.findOne({ _id: id })
      .populate("user", "artistName artistSurname1 artistSurname2 email")
      .populate({
        path: "items",
        select: "quantity artWork",
        populate: {
          path: "artWork",
          select: "artworkName media.mainImage inventoryShipping pricing",
        },
      })
      .lean(true);
  } else {
    order = await PurchaseOrder.findOne({ _id: id })
      .populate(
        "user",
        "artistName artistSurname1 artistSurname2 email profile.mainImage"
      )
      .populate({
        path: "items",
        select: "quantity artWork",
        populate: {
          path: "artWork",
          select: "artworkName media.mainImage inventoryShipping pricing",
        },
      })
      .lean(true);
  }

  return res
    .status(200)
    .send({ data: order, url: "https://dev.freshartclub.com/images" });
});

const acceptRejectOrderRequest = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { orderType } = req.query;
  let { status } = req.body;

  if (!id || !orderType)
    return res.status(404).send({ message: "OrderId not found" });

  if (status === "accept") {
    status = "accepted";
  } else {
    status = "rejected";
  }

  if (orderType.toLowerCase() === "subscription") {
    await SubscriptionOrder.updateOne(
      { _id: id },
      { $set: { status: status } }
    );

    return res.status(200).send({ message: `Order Request ${status}` });
  } else {
    await PurchaseOrder.updateOne({ _id: id }, { $set: { status: status } });

    return res.status(200).send({ message: `Order Request ${status}` });
  }
});

const getOrder = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { orderType } = req.query;

  if (orderType === "subscription") {
    const order = await SubscriptionOrder.findById(id)
      .populate("user", "artistName artistSurname1 artistSurname2 email")
      .populate({
        path: "items",
        select: "quantity artWork",
        populate: {
          path: "artWork",
          select: "artworkName media inventoryShipping pricing",
        },
      });
    return res.status(200).send({ order });
  } else {
    const order = await PurchaseOrder.findById(id)
      .populate("user", "artistName artistSurname1 artistSurname2 email")
      .populate({
        path: "items",
        select: "quantity artWork",
        populate: {
          path: "artWork",
          select: "artworkName media inventoryShipping pricing",
        },
      });
    return res.status(200).send({ order });
  }
});

module.exports = {
  createOrder,
  getAllSubscriptionOrder,
  getAllPurchaseOrder,
  getAllUserOrder,
  getArtistSingleOrder,
  getArtistOrder,
  acceptRejectOrderRequest,
  // getCombinedArtistOrder,
};
