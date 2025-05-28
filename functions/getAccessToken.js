require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const { createLog } = require("./common");
const APIErrorLog = createLog("API_error_log");

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
  }
}

// ---------------------------- ms oauth -------------------------

async function getToken() {
  try {
    const response = await axios.post(
      `https://login.microsoftonline.com/${process.env.MAIL_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: process.env.MAIL_CLIENT_ID,
        scope: "https://outlook.office365.com/.default offline_access",
        client_secret: process.env.MAIL_CLIENT_SECRET,
        grant_type: "password",
        username: process.env.MAIL_USER,
        password: process.env.MAIL_PASS,
      })
    );

    return response.data.access_token;
  } catch (error) {
    console.error("Error getting access token:", error.response?.data || error.message);
  }
}

// ------------------- shipment token generate -------------------------

async function getShipmentAccessToken(req, res) {
  try {
    const data = {
      grant_type: "password",
      client_id: process.env.SHIPMENT_CLIENT_ID,
      client_secret: process.env.SHIPMENT_CLIENT_SECRET,
      username: process.env.SHIPMENT_USERNAME,
      password: process.env.SHIPMENT_PASSWORD,
    };

    const params = new URLSearchParams();
    for (const key in data) {
      params.append(key, data[key]);
    }

    const response = await axios.post("https://servicios.apipre.seur.io/pic_token", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    console.log(response.data);
    APIErrorLog.error(response.data);

    return response.data.access_token;
  } catch (error) {
    console.error("Error fetching token:", error.response?.data || error.message);
    return res.status(500).send({ messaclearge: "Error fetching token" });
  }
}

module.exports = { getAccessToken, getSingleAccessToken, getToken, getShipmentAccessToken };
