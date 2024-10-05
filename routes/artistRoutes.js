const express = require("express");
const router = express.Router();
const {
  login,
  becomeArtist,
  resetPassword,
} = require("../controller/artistController");

router.post("/login", login);

router.post("/become-artist", becomeArtist);

router.post("/reset-password", resetPassword);

module.exports = router;
