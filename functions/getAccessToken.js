require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");

const generateNonce = () => crypto.randomBytes(16).toString("hex");

const generateSecret = (nonce, appKey) => {
  return crypto
    .createHash("sha512")
    .update(nonce + appKey)
    .digest("hex");
};

async function getAccessToken() {
  const url = "https://apis.sandbox.globalpay.com/ucp/accesstoken";

  const nonce = generateNonce();
  const secret = generateSecret(nonce, process.env.APP_KEY);

  const requestData = {
    app_id: process.env.APP_ID,
    nonce: nonce,
    secret: secret,
    grant_type: "client_credentials",
    interval_to_expire: "10_MINUTES",
  };

  try {
    const response = await axios.post(url, requestData, {
      headers: {
        "Content-Type": "application/json",
        "x-gp-version": "2021-03-22",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error getting access token:", error.response?.data || error.message);
    throw error;
  }
}

async function getSingleAccessToken() {
  const url = "https://apis.sandbox.globalpay.com/ucp/accesstoken";

  const nonce = generateNonce();
  const secret = generateSecret(nonce, process.env.APP_KEY);

  const requestData = {
    app_id: process.env.APP_ID,
    nonce: nonce,
    secret: secret,
    grant_type: "client_credentials",
    interval_to_expire: "10_MINUTES",
    restricted_token: "YES",
    permissions: ["PMT_POST_Create_Single"],
  };

  try {
    const response = await axios.post(url, requestData, {
      headers: {
        "Content-Type": "application/json",
        "x-gp-version": "2021-03-22",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error getting access token:", error.response?.data || error.message);
    throw error;
  }
}

// ------------------- shipment token generate -------------------------

async function getShipmentAccessToken() {
  const url = "https://servicios.apipre.seur.io/pic_token";

  const data = qs.stringify({
    grant_type: "password",
    client_id: process.env.SHIPMENT_CLIENT_ID,
    client_secret: process.env.SHIPMENT_CLIENT_SECRET,
    username: process.env.SHIPMENT_USERNAME,
    password: process.env.SHIPMENT_PASSWORD,
  });

  const response = await axios.post(url, data, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return response.data.access_token;
}

module.exports = { getAccessToken, getSingleAccessToken, getShipmentAccessToken };
