const express = require("express");
const router = express.Router();
const { loginData } = require("../validations/validator");
const {
  sendLoginOTP,
  validateOTP,
  testAdmin,
  artistRegister,
  listArtworkStyle,
  listDiscipline,
  createInsignias,
  getRegisterArtist,
  getInsignias,
  activateArtist,
  getAllArtists,
  getArtistPendingList,
  getArtistRequestList,
  resendOTP,
  createNewUser,
  serachUser,
  getAllUsers,
} = require("../controller/adminController");
const validateAdminToken = require("../middleware/adminValidateToken");

router.post("/send-login-otp", loginData, sendLoginOTP);

router.post("/validate-otp", validateOTP);

router.post("/resend-otp", resendOTP);

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

router.post("/activate-artist/:id", validateAdminToken, activateArtist);

router.get("/get-all-artists", validateAdminToken, getAllArtists);

router.get(
  "/get-artist-request-list",
  validateAdminToken,
  getArtistRequestList
);

router.get(
  "/get-artist-pending-list",
  validateAdminToken,
  getArtistPendingList
);

router.post("/create-new-user", validateAdminToken, createNewUser);

router.post("/serach-user", validateAdminToken, serachUser);

router.get("/get-all-users", validateAdminToken, getAllUsers);

module.exports = router;
