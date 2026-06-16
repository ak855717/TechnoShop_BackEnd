const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    selectedColor: {
      type: String,
      default: "",
    },
    // Snapshot price at time of adding (in case product price changes)
    price: {
      type: Number,
      required: true,
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one cart per user
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ──────────────────────────────────────────────────────────────
cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

cartSchema.virtual("subtotal").get(function () {
  return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

module.exports = mongoose.model("Cart", cartSchema);
