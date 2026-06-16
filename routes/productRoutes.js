const express = require("express");
const { body } = require("express-validator");
const {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getNewArrivals,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getFilters,
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// ─── Validation Rules ──────────────────────────────────────────────────────
const productRules = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("brand").trim().notEmpty().withMessage("Brand is required"),
  body("category").notEmpty().withMessage("Category is required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  body("image").notEmpty().withMessage("Product image URL is required"),
  body("description").notEmpty().withMessage("Description is required"),
];

// ─── Public Routes ─────────────────────────────────────────────────────────
router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/new-arrivals", getNewArrivals);
router.get("/filters", getFilters);
router.get("/:id", getProduct);
router.get("/:id/related", getRelatedProducts);

// ─── Admin Routes ──────────────────────────────────────────────────────────
router.post("/", protect, authorize("admin"), productRules, validate, createProduct);
router.put("/:id", protect, authorize("admin"), updateProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

module.exports = router;
