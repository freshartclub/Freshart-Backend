const express = require("express");
const validateAdminToken = require("../middleware/adminValidateToken");
const {
  addPickList,
  getPickList,
  getPickListById,
  updatePicklist,
} = require("../controller/pickListController");

const router = express.Router();

router.post("/add-picklist", validateAdminToken, addPickList);

router.get("/get-picklist", getPickList);

router.get("/get-picklist-by-id/:id", validateAdminToken, getPickListById);

router.patch("/update-picklist/:id", validateAdminToken, updatePicklist);

module.exports = router;
