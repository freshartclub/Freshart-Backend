const express = require("express");
const {
  listDiscipline,
  listArtworkStyle,
  listTheme,
  listTechnic,
  listMediaSupport,
} = require("../controller/generalController");

const router = express.Router();

router.get("/list-discipline", listDiscipline);

router.get("/list-style", listArtworkStyle);

router.get("/list-theme", listTheme);

router.get("/list-technic", listTechnic);

router.get("/list-media", listMediaSupport);

module.exports = router;
