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
    interval_to_expire: "1_HOUR",
    restricted_token: "NO",
    permissions: ["TRN_POST_Authorize", "TRN_GET_Single"],
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

module.exports = { getAccessToken };
