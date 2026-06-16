const express = require("express");
const { body } = require("express-validator");
const {
  getAllUsers,
  getUser,
  updateProfile,
  updateUserRole,
  deleteUser,
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

router.use(protect);

// ─── Self (logged-in user) ─────────────────────────────────────────────────
router.put(
  "/profile",
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("email").optional().isEmail().withMessage("Enter a valid email").normalizeEmail(),
    body("phone")
      .optional()
      .trim()
      .matches(/^\+?[0-9\s\-]{7,20}$/)
      .withMessage("Enter a valid phone number"),
    body("addresses")
      .optional()
      .isArray()
      .withMessage("Addresses must be an array"),
    body("addresses.*.street").optional().trim().notEmpty().withMessage("Street is required"),
    body("addresses.*.city").optional().trim().notEmpty().withMessage("City is required"),
    body("addresses.*.country").optional().trim().notEmpty().withMessage("Country is required"),
  ],
  validate,
  updateProfile
);

// ─── Admin only ────────────────────────────────────────────────────────────
router.get("/", authorize("admin"), getAllUsers);
router.get("/:id", authorize("admin"), getUser);
router.put(
  "/:id/role",
  authorize("admin"),
  [body("role").isIn(["user", "admin"]).withMessage("Role must be 'user' or 'admin'")],
  validate,
  updateUserRole
);
router.delete("/:id", authorize("admin"), deleteUser);

module.exports = router;
