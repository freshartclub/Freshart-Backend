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
  likePost,
  likeCount,
  sendFollowRequest,
  getFollowRequsetOfCircle,
  approveFollowRequest,
  getAllFollowerOfCircle,
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

router.patch("/like-post/:id", validateToken, likePost);

router.get("/get-likes/:id", likeCount);

router.post("/send-request/:id", validateToken, sendFollowRequest);

router.get("/get-request/:id", validateToken, getFollowRequsetOfCircle);

router.patch("/approve-request/:id", validateToken, approveFollowRequest);

router.get("/get-followers/:id", validateToken, getAllFollowerOfCircle);

module.exports = router;
