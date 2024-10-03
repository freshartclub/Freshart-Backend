const express = require("express");
const router = express.Router();
const { loginData } = require("../validations/validator");
const {
  login,
  testAdmin,
  artistRegister,
  listArtworkStyle,
  listDiscipline,
  createInsignias,
  getRegisterArtist,
  getInsignias,
} = require("../controller/adminController");
const validateAdminToken = require("../middleware/adminValidateToken");

router.post("/login", loginData, login);

router.get("/dashboard", validateAdminToken, testAdmin);

router.get("/get-register-artist/:id", validateAdminToken, getRegisterArtist);

router.post("/artist-register/:id?", validateAdminToken, artistRegister);

router.get(
  "/list-artwork-style/:response",
  validateAdminToken,
  listArtworkStyle
);

router.get("/list-discipline", validateAdminToken, listDiscipline);

router.post("/create-insignias", validateAdminToken, createInsignias);

router.get("/get-insignias", validateAdminToken, getInsignias);

module.exports = router;
