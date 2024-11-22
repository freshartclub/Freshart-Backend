const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const SubscriptionOrder = require("../models/subscriptionOrderModel");
const PurchaseOrder = require("../models/purchaseOrderModel");
const objectId = require("mongoose").Types.ObjectId;

const createOrder = catchAsyncError(async (req, res, next) => {
  const user = await Artist.findById({ _id: req.user._id }, { cart: 1 }).lean(
    true
  );
  if (!user) return res.status(400).send({ message: "User not found" });
  let items = [];

  const orderID = Math.random().toString(36).substring(2, 8).toUpperCase();

  console.log(req.body);
  console.log(items);

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
      status: "success",
      tax: req.body.tax,
      shipping: req.body.shipping,
      subTotal: req.body.subTotal,
      items: items,
    });
  } else {
    order = await PurchaseOrder.create({
      user: user._id,
      status: "success",
      tax: req.body.tax,
      shipping: req.body.shipping,
      subTotal: req.body.subTotal,
      items: items,
    });
  }

  if (!order) return res.status(400).send({ message: "Order not created" });
  Artist.updateOne(
    { _id: user._id },
    { $pull: { cart: { $in: items.artWork } } }
  ).then();

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
          select: "artworkName media inventoryShipping pricing",
        },
      })
      .lean(true),
    PurchaseOrder.find({ user: req.user._id })
      .populate({
        path: "items",
        select: "quantity artWork",
        populate: {
          path: "artWork",
          select: "artworkName media inventoryShipping pricing",
        },
      })
      .lean(true),
  ]);

  return res
    .status(200)
    .send({ subscription: subOrders, purchase: purchaseOrders });
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

const getArtistOrder = catchAsyncError(async (req, res, next) => {
  const loggedUserId = req.user._id;

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
      {
        $match: {
          "artWorkDetails.owner": objectId(loggedUserId),
        },
      },
      {
        $project: {
          _id: 1,
          user: 1,
          status: 1,
          tax: 1,
          shipping: 1,
          subTotal: 1,
          items: 1,
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
      {
        $match: {
          "artWorkDetails.owner": objectId(loggedUserId),
        },
      },
      {
        $project: {
          _id: 1,
          user: 1,
          status: 1,
          tax: 1,
          shipping: 1,
          subTotal: 1,
          items: 1,
          createdAt: 1,
        },
      },
    ]),
  ]);

  return res.status(200).send({
    subscription: subOrder,
    purchase: purchaseOrder,
  });
});

module.exports = {
  createOrder,
  getAllSubscriptionOrder,
  getAllPurchaseOrder,
  getAllUserOrder,
  getOrder,
  getArtistOrder,
};
