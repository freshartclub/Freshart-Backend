const { CronJob } = require("cron");
const Order = require("../models/orderModel");
const User = require("../models/artistModel");
const Subscription = require("../models/subscriptionModel");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const axios = require("axios");
const { Builder, parseStringPromise } = require("xml2js");

function getTimestamp() {
  const now = new Date();
  return now
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14);
}

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

      const subUpdateOps = [];
      const userUpdateOps = [];
      const now = new Date();

      const subscriptionResults = await Promise.allSettled(
        users.map((user) =>
          Subscription.find({
            user: user._id,
            status: { $in: ["active", "cancelled"] },
          })
            .sort({ createdAt: 1 })
            .lean()
        )
      );

      subscriptionResults.forEach((result, index) => {
        const user = users[index];
        if (result.status !== "fulfilled") {
          console.error(`Error fetching subscriptions for user ${user._id}:`, result.reason);
          return;
        }

        const subscriptions = result.value;
        if (!subscriptions || subscriptions.length === 0) {
          userUpdateOps.push({
            updateOne: {
              filter: { _id: user._id },
              update: { $set: { isSubscribed: false } },
            },
          });
          return;
        }

        const expiredSubs = subscriptions.filter((sub) => sub.status === "cancelled" && sub.end_date && sub.end_date <= now);

        expiredSubs.forEach((sub) => {
          subUpdateOps.push({
            updateOne: {
              filter: { _id: sub._id },
              update: { $set: { status: "expired", isCurrActive: false } },
            },
          });

          if (sub.isCurrActive) {
            const otherActive = subscriptions.find(
              (s) => s._id.toString() !== sub._id.toString() && !expiredSubs.some((ex) => ex._id.toString() === s._id.toString())
            );

            if (otherActive) {
              subUpdateOps.push({
                updateOne: {
                  filter: { _id: otherActive._id },
                  update: { $set: { isCurrActive: true } },
                },
              });
            }
          }
        });

        // Check if any subscriptions remain that are not expired
        const expiredSubIds = new Set(expiredSubs.map((sub) => sub._id.toString()));
        const stillActive = subscriptions.some((sub) => !expiredSubIds.has(sub._id.toString()));

        if (!stillActive) {
          userUpdateOps.push({
            updateOne: {
              filter: { _id: user._id },
              update: { $set: { isSubscribed: false } },
            },
          });
        }
      });

      if (subUpdateOps.length > 0) {
        await Subscription.bulkWrite(subUpdateOps);
      }

      if (userUpdateOps.length > 0) {
        await User.bulkWrite(userUpdateOps);
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

const cardExpiryJob = new CronJob(
  "0 0 * * *",
  async function () {
    try {
      const users = await User.find({ "card.card_stored": true, isCardExpired: false }, { _id: 1, card: 1, email: 1 }).lean();
      if (!users.length) return console.log("No users with stored cards.");

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear() % 100;

      const subUpdateOps = [];
      const userUpdateOps = [];

      for (const user of users) {
        const expiry = user.card?.card_details?.cardExpiry;
        if (!expiry) continue;

        const [expMonthStr, expYearStr] = expiry.split("/");
        const expMonth = parseInt(expMonthStr, 10);
        const expYear = parseInt(expYearStr, 10);

        const diffInMonths = (expYear - currentYear) * 12 + (expMonth - currentMonth);

        if (expYear === currentYear && expMonth === currentMonth) {
          const subscriptions = await Subscription.find({
            user: user._id,
            status: { $in: ["active", "cancelled"] },
          }).lean();

          for (const sub of subscriptions) {
            if (sub.schedule_defined !== -1 && sub.status !== "active") continue;

            const startDate = new Date(sub.start_date);
            const preferredDay = startDate.getDate();
            const expiryMonthIndex = expMonth - 1;
            const expiryFullYear = 2000 + expYear;

            // same day in expiry month or fallback to last day
            let endDate = new Date(expiryFullYear, expiryMonthIndex, preferredDay);
            if (endDate.getMonth() !== expiryMonthIndex) {
              // Adjust to last day of expiry month (e.g., Feb 30)
              endDate = new Date(expiryFullYear, expiryMonthIndex + 1, 0);
            }

            endDate.setHours(0, 0, 0, 0);

            const timestamp = getTimestamp();
            const MERCHANT_ID = process.env.MERCHANT_ID;
            const SECRET = process.env.SECRET;

            const newHashString = `${timestamp}.${MERCHANT_ID}.${sub.sheduleRef}`;
            const newHash1 = crypto.createHash("sha1").update(newHashString).digest("hex");

            const newFinalString = `${newHash1}.${SECRET}`;
            const newSha1Hash = crypto.createHash("sha1").update(newFinalString).digest("hex");

            function generateScheduleXmlRequest() {
              const builder = new Builder({ headless: true });
              const xmlObj = {
                request: {
                  $: { type: "schedule-delete", timestamp: timestamp },
                  merchantid: MERCHANT_ID,
                  scheduleref: sub.sheduleRef,
                  sha1hash: newSha1Hash,
                },
              };

              const xmlBody = builder.buildObject(xmlObj);
              return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
            }

            const newXmlRequest = generateScheduleXmlRequest();
            const newScheduleResponse = await axios.post(`https://remote.sandbox.addonpayments.com/remote`, newXmlRequest, {
              headers: {
                "Content-Type": "text/xml",
              },
            });

            const parseNewScheduleResponse = await parseStringPromise(newScheduleResponse.data);

            subUpdateOps.push({
              updateOne: {
                filter: { _id: sub._id },
                update: {
                  $set: {
                    end_date: endDate,
                    status: "cancelled",
                    no_card: true,
                    ...(parseNewScheduleResponse.response.result[0] !== "00" && {
                      error_log: parseNewScheduleResponse.response.message[0],
                    }),
                  },
                },
              },
            });
          }

          userUpdateOps.push({
            updateOne: {
              filter: { _id: user._id },
              update: { $set: { isCardExpired: true }, $unset: { isCardExpiring: "" } },
            },
          });
        } else if (diffInMonths === 1 || diffInMonths === 2) {
          userUpdateOps.push({
            updateOne: {
              filter: { _id: user._id },
              update: { $set: { isCardExpiring: `soon-${diffInMonths}` } },
            },
          });
        }
      }

      // Now update the user's `isSubscribed` if no active or future cancelled subscriptions
      for (const user of users) {
        const hasActiveOrCancelled = await Subscription.findOne({
          user: user._id,
          status: { $in: ["active", "cancelled"] },
          end_date: { $gte: now }, // Check if there's any future-dated cancelled plan
        }).lean();

        if (!hasActiveOrCancelled) {
          userUpdateOps.push({
            updateOne: {
              filter: { _id: user._id },
              update: { $set: { isSubscribed: false } },
            },
          });
        }
      }

      // Execute bulk writes for subscriptions and users
      if (subUpdateOps.length) await Subscription.bulkWrite(subUpdateOps);
      if (userUpdateOps.length) await User.bulkWrite(userUpdateOps);

      console.log("Card expiry cron job completed.");
    } catch (error) {
      console.error("Error in card expiry job:", error);
    }
  },
  null,
  true,
  "UTC"
);
