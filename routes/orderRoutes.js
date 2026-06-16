const express = require("express");
const { body } = require("express-validator");
const {
  createOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

router.use(protect);

// ─── Validation ────────────────────────────────────────────────────────────
const createOrderRules = [
  body("shippingAddress.fullName").notEmpty().withMessage("Full name is required"),
  body("shippingAddress.phone").notEmpty().withMessage("Phone number is required"),
  body("shippingAddress.address").notEmpty().withMessage("Address is required"),
  body("shippingAddress.city").notEmpty().withMessage("City is required"),
  body("shippingAddress.state").notEmpty().withMessage("State is required"),
  body("shippingAddress.postalCode").notEmpty().withMessage("Postal code is required"),
  body("paymentMethod")
    .isIn(["COD", "UPI", "Card", "NetBanking", "Razorpay"])
    .withMessage("Invalid payment method"),
  body("orderItems")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Order items must be a non-empty array"),
];

const verifyRazorpayRules = [
  ...createOrderRules,
  body("razorpay_order_id").notEmpty().withMessage("Razorpay order id is required"),
  body("razorpay_payment_id").notEmpty().withMessage("Razorpay payment id is required"),
  body("razorpay_signature").notEmpty().withMessage("Razorpay signature is required"),
];

// ─── User Routes ───────────────────────────────────────────────────────────
router.post("/razorpay/create-order", createOrderRules, validate, createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayRules, validate, verifyRazorpayPayment);
router.post("/", createOrderRules, validate, createOrder);
router.get("/my-orders", getMyOrders);
router.get("/:id", getOrder);
router.put("/:id/cancel", cancelOrder);

// ─── Admin Routes ──────────────────────────────────────────────────────────
router.get("/", authorize("admin"), getAllOrders);
router.put(
  "/:id/status",
  authorize("admin"),
  [body("orderStatus")
    .isIn(["Pending", "Processing", "Shipped", "Delivered", "Cancelled"])
    .withMessage("Invalid order status")],
  validate,
  updateOrderStatus
);

module.exports = router;
