const { CronJob } = require("cron");
const Order = require("../models/orderModel");

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
