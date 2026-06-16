const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { AppError } = require("../middleware/errorHandler");

// ─── @desc    Get user's cart
// ─── @route   GET /api/cart
// ─── @access  Private
const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
      "name brand image price stock color"
    );

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: { items: [], totalItems: 0, subtotal: 0 },
      });
    }

    res.status(200).json({ success: true, cart });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Add item to cart
// ─── @route   POST /api/cart
// ─── @access  Private
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, selectedColor } = req.body;

    // Validate product exists and has stock
    const product = await Product.findById(productId);
    if (!product) return next(new AppError("Product not found", 404));

    if (product.stock < quantity) {
      return next(new AppError(`Only ${product.stock} items in stock`, 400));
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      // Create new cart
      cart = await Cart.create({
        user: req.user.id,
        items: [{ product: productId, quantity, selectedColor: selectedColor || product.color[0] || "", price: product.price }],
      });
    } else {
      // Check if same product+color combo already exists
      const existingIndex = cart.items.findIndex(
        (item) =>
          item.product.toString() === productId &&
          item.selectedColor === (selectedColor || product.color[0] || "")
      );

      if (existingIndex > -1) {
        // Update quantity
        const newQty = cart.items[existingIndex].quantity + quantity;
        if (newQty > product.stock) {
          return next(new AppError(`Cannot add more than ${product.stock} items`, 400));
        }
        cart.items[existingIndex].quantity = newQty;
      } else {
        // Add new item
        cart.items.push({
          product: productId,
          quantity,
          selectedColor: selectedColor || product.color[0] || "",
          price: product.price,
        });
      }

      await cart.save();
    }

    await cart.populate("items.product", "name brand image price stock color");

    res.status(200).json({ success: true, message: "Item added to cart", cart });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Update item quantity in cart
// ─── @route   PUT /api/cart/:itemId
// ─── @access  Private
const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (quantity < 1) return next(new AppError("Quantity must be at least 1", 400));

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return next(new AppError("Cart not found", 404));

    const item = cart.items.id(itemId);
    if (!item) return next(new AppError("Cart item not found", 404));

    // Validate stock
    const product = await Product.findById(item.product);
    if (product && quantity > product.stock) {
      return next(new AppError(`Only ${product.stock} items in stock`, 400));
    }

    item.quantity = quantity;
    await cart.save();
    await cart.populate("items.product", "name brand image price stock color");

    res.status(200).json({ success: true, message: "Cart updated", cart });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Remove item from cart
// ─── @route   DELETE /api/cart/:itemId
// ─── @access  Private
const removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return next(new AppError("Cart not found", 404));

    const item = cart.items.id(req.params.itemId);
    if (!item) return next(new AppError("Cart item not found", 404));

    item.deleteOne();
    await cart.save();
    await cart.populate("items.product", "name brand image price stock color");

    res.status(200).json({ success: true, message: "Item removed from cart", cart });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Clear entire cart
// ─── @route   DELETE /api/cart
// ─── @access  Private
const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user.id },
      { items: [] },
      { new: true }
    );

    res.status(200).json({ success: true, message: "Cart cleared", cart });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
