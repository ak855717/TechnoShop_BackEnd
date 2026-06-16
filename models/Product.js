const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Accessories",
        "Camera Accessories",
        "Cameras",
        "Desktops",
        "Drones",
        "Gaming",
        "Headphones",
        "Laptops",
        "Monitors",
        "Smartphones",
        "TVs",
        "Tablets",
        "Wearables",
      ],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      default: function () {
        return this.price;
      },
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    image: {
      type: String,
      required: [true, "Product image is required"],
    },
    images: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    features: {
      type: [String],
      default: [],
    },
    specs: {
      type: Map,
      of: String,
      default: {},
    },
    tags: {
      type: [String],
      default: [],
    },
    color: {
      type: [String],
      default: [],
    },
    isNew: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    suppressReservedKeysWarning: true,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ name: "text", brand: "text", description: "text" });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isNew: 1 });

module.exports = mongoose.model("Product", productSchema);
