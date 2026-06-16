const express = require("express");
const { body } = require("express-validator");
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// All cart routes require authentication
router.use(protect);

const addToCartRules = [
  body("productId").notEmpty().withMessage("Product ID is required"),
  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

const updateCartRules = [
  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

router.get("/", getCart);
router.post("/", addToCartRules, validate, addToCart);
router.put("/:itemId", updateCartRules, validate, updateCartItem);
router.delete("/clear", clearCart);      // DELETE /api/cart/clear — must come before /:itemId
router.delete("/:itemId", removeFromCart);

module.exports = router;
