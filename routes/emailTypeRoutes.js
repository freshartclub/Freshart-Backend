const express = require("express");
const validateAdminToken = require("../middleware/adminValidateToken");
const {
  addEmailType,
  listEmailType,
  getEmailType,
} = require("../controller/emailTypeController");

const router = express.Router();

router.post("/add-email-type/:id?", validateAdminToken, addEmailType);

router.get("/get-email-types", validateAdminToken, listEmailType);

router.get("/get-email-type-by-id/:id", validateAdminToken, getEmailType);

module.exports = router;