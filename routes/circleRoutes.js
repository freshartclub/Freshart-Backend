const express = require("express");
const validateAdminToken = require("../middleware/adminValidateToken");
const {
  addCircle,
  getCircle,
  getCircleList,
  getArtistCircleList,
  getCircleById,
  getUserCircleList,
  createPostInCircle,
  getAllPostOfCircle,
  postCommentInCircle,
  getAllComments,
} = require("../controller/circleController");
const validateToken = require("../middleware/validateTokenHandler");

const router = express.Router();

router.post("/add-circle/:id?", validateAdminToken, addCircle);

router.get("/get-circle/:id", validateAdminToken, getCircle);

router.get("/get-all-circles", validateAdminToken, getCircleList);

router.get("/get-artist-circle-list", validateToken, getArtistCircleList);

router.get("/get-circle-by-id/:id", validateToken, getCircleById);

router.get("/get-circles", validateToken, getUserCircleList);

router.patch("/create-post/:id", validateToken, createPostInCircle);

router.get("/get-all-circle-post/:id", validateToken, getAllPostOfCircle);

router.post("/post-comment/:id", validateToken, postCommentInCircle);

router.get("/get-all-comments/:id", validateToken, getAllComments);

module.exports = router;
