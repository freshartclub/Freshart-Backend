const { CronJob } = require("cron");
const Order = require("../models/orderModel");
const User = require("../models/artistModel");
const Subscription = require("../models/subscriptionModel");

const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

const scheduleJob = new CronJob(
  "0 0 * * *",
  async function () {
    try {
      const pendingOrders = await Order.aggregate([
        {
          $match: {
            status: "created",
            createdAt: { $lt: oneDayAgo },
          },
        },
        {
          $project: {
            _id: 1,
            status: 1,
            createdAt: 1,
          },
        },
      ]);

      if (pendingOrders.length === 0) {
        return console.log("No pending order found.");
      }

      await Order.deleteMany({
        _id: { $in: pendingOrders.map((order) => order._id) },
      });

      console.log(`Deleted ${pendingOrders.length} pending orders.`);
    } catch (error) {
      console.error("Error updating transactions:", error);
    }
  },
  null,
  true,
  "UTC"
);

const subscriptionJob = new CronJob(
  "0 0 * * *",
  async function () {
    try {
      const users = await User.find({ isSubscribed: true }, { _id: 1 }).lean();

      if (users.length === 0) {
        return console.log("No users found.");
      }

      for (const user of users) {
        const subscriptions = await Subscription.find({ user: user._id, status: { $in: ["active", "not_started"] } })
          .sort({ createdAt: 1 })
          .lean();

        if (subscriptions.length === 0) continue;

        const oldest = subscriptions[0];
        const now = new Date();

        if (oldest.end_date < now) {
          await Subscription.updateOne({ _id: oldest._id }, { $set: { status: "expired" } });

          if (subscriptions.length > 1) {
            const next = subscriptions[1];
            await Subscription.updateOne({ _id: next._id }, { $set: { status: "active" } });
          } else {
            await User.updateOne({ _id: user._id }, { $set: { isSubscribed: false } });
          }
        }
      }

      console.log("Subscription cron job completed.");
    } catch (error) {
      console.error("Error updating subscriptions:", error);
    }
  },
  null,
  true,
  "UTC"
);
