const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const {
  register,
  login,
  googleAuth,
  logout,
  getMe,
  updatePassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");

// ─── Validation Rules ──────────────────────────────────────────────────────
const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please enter a valid email").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const loginRules = [
  body("email").isEmail().withMessage("Please enter a valid email").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const googleAuthRules = [
  body("credential").trim().notEmpty().withMessage("Google credential is required"),
];

const updatePasswordRules = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

// ─── Routes ────────────────────────────────────────────────────────────────
router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);
router.post("/google", googleAuthRules, validate, googleAuth);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/update-password", protect, updatePasswordRules, validate, updatePassword);

module.exports = router;
