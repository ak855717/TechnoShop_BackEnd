const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const { AppError } = require("../middleware/errorHandler");

// ─── @desc    Get user's wishlist
// ─── @route   GET /api/wishlist
// ─── @access  Private
const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id }).populate(
      "products",
      "name brand category image price originalPrice discount rating reviews stock isNew color"
    );

    if (!wishlist) {
      return res.status(200).json({ success: true, wishlist: { products: [] } });
    }

    res.status(200).json({ success: true, wishlist });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Toggle product in wishlist (add if not there, remove if exists)
// ─── @route   POST /api/wishlist/toggle
// ─── @access  Private
const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product) return next(new AppError("Product not found", 404));

    let wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user.id, products: [productId] });
      await wishlist.populate("products", "name brand image price originalPrice discount rating reviews stock isNew color");
      return res.status(200).json({ success: true, message: "Added to wishlist", added: true, wishlist });
    }

    const isInWishlist = wishlist.products.some((p) => p.toString() === productId);

    if (isInWishlist) {
      wishlist.products = wishlist.products.filter((p) => p.toString() !== productId);
      await wishlist.save();
      await wishlist.populate("products", "name brand image price originalPrice discount rating reviews stock isNew color");
      return res.status(200).json({ success: true, message: "Removed from wishlist", added: false, wishlist });
    } else {
      wishlist.products.push(productId);
      await wishlist.save();
      await wishlist.populate("products", "name brand image price originalPrice discount rating reviews stock isNew color");
      return res.status(200).json({ success: true, message: "Added to wishlist", added: true, wishlist });
    }
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Clear wishlist
// ─── @route   DELETE /api/wishlist
// ─── @access  Private
const clearWishlist = async (req, res, next) => {
  try {
    await Wishlist.findOneAndUpdate({ user: req.user.id }, { products: [] });
    res.status(200).json({ success: true, message: "Wishlist cleared" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getWishlist, toggleWishlist, clearWishlist };
