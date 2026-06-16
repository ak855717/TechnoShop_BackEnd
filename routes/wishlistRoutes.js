const express = require("express");
const { body } = require("express-validator");
const {
  getWishlist,
  toggleWishlist,
  clearWishlist,
} = require("../controllers/wishlistController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// All wishlist routes require authentication
router.use(protect);

router.get("/", getWishlist);
router.post(
  "/toggle",
  [body("productId").notEmpty().withMessage("Product ID is required")],
  validate,
  toggleWishlist
);
router.delete("/", clearWishlist);

module.exports = router;
