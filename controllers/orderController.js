const crypto = require("crypto");
const Razorpay = require("razorpay");

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");
const { AppError } = require("../middleware/errorHandler");

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

const isMongoObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || "").trim());
const normalizeLookupValue = (value) => String(value || "").trim().toLowerCase();

const calculatePricing = (itemsPrice) => {
  const shippingPrice = itemsPrice > 99 ? 0 : 9.99;
  const taxPrice = Number((itemsPrice * 0.08).toFixed(2));
  const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

  return { itemsPrice, shippingPrice, taxPrice, totalPrice };
};

const ensureShippingAddress = async (req, providedAddress = {}) => {
  const requiredFields = ["fullName", "phone", "address", "city", "state", "postalCode", "country"];
  const hasCompleteAddress = requiredFields.every((field) => String(providedAddress[field] || "").trim());

  if (hasCompleteAddress) {
    return providedAddress;
  }

  const user = await User.findById(req.user.id).lean();
  const defaultAddress = user?.addresses?.find((address) => address.isDefault) || user?.addresses?.[0];

  if (!user?.phone || !defaultAddress?.street || !defaultAddress?.city || !defaultAddress?.country) {
    throw new AppError("Please add your phone number and a complete address in your profile before checkout", 400);
  }

  return {
    fullName: providedAddress.fullName || user.name,
    phone: providedAddress.phone || user.phone,
    address: providedAddress.address || defaultAddress.street,
    city: providedAddress.city || defaultAddress.city,
    state: providedAddress.state || defaultAddress.state || "NA",
    postalCode: providedAddress.postalCode || defaultAddress.postalCode || "000000",
    country: providedAddress.country || defaultAddress.country || "India",
  };
};

const buildOrderItemsFromCart = async (req) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    throw new AppError("Cart is empty", 400);
  }

  for (const item of cart.items) {
    if (!item.product) {
      throw new AppError("A product in your cart no longer exists", 400);
    }

    if (item.product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${item.product.name}`, 400);
    }
  }

  const orderItems = cart.items.map((item) => ({
    product: item.product._id,
    name: item.product.name,
    image: item.product.image,
    brand: item.product.brand,
    selectedColor: item.selectedColor,
    quantity: item.quantity,
    price: item.price,
  }));

  return { orderItems, itemsPrice: cart.subtotal };
};

const buildOrderItemsFromRequest = async (submittedItems = []) => {
  if (!Array.isArray(submittedItems) || submittedItems.length === 0) {
    throw new AppError("Order items are required", 400);
  }

  const validProductIds = [...new Set(
    submittedItems
      .map((item) => item.product || item.id || item._id)
      .filter((value) => isMongoObjectId(value))
      .map((value) => String(value))
  )];

  const submittedNames = [...new Set(
    submittedItems
      .map((item) => String(item.name || "").trim())
      .filter(Boolean)
  )];

  const productFilters = [];
  if (validProductIds.length > 0) {
    productFilters.push({ _id: { $in: validProductIds } });
  }
  if (submittedNames.length > 0) {
    productFilters.push({ name: { $in: submittedNames } });
  }

  const products = productFilters.length > 0
    ? await Product.find({ $or: productFilters }).lean()
    : [];

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  let itemsPrice = 0;

  const orderItems = submittedItems.map((item) => {
    const productId = item.product || item.id || item._id;
    let product = isMongoObjectId(productId) ? productMap.get(String(productId)) : null;

    if (!product && item.name) {
      product = products.find(
        (candidate) =>
          normalizeLookupValue(candidate.name) === normalizeLookupValue(item.name) &&
          (!item.brand || normalizeLookupValue(candidate.brand) === normalizeLookupValue(item.brand)) &&
          (!item.category || normalizeLookupValue(candidate.category) === normalizeLookupValue(item.category))
      );
    }

    if (!product) {
      throw new AppError(`Product "${item.name || productId}" could not be found. Please remove it from the cart and add it again.`, 404);
    }

    const quantity = Number(item.quantity || 1);
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new AppError(`Invalid quantity for ${product.name}`, 400);
    }

    if (product.stock < quantity) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }

    itemsPrice += product.price * quantity;

    return {
      product: product._id,
      name: product.name,
      image: product.image,
      brand: product.brand,
      selectedColor: item.selectedColor || product.color?.[0] || "",
      quantity,
      price: product.price,
    };
  });

  return { orderItems, itemsPrice: Number(itemsPrice.toFixed(2)) };
};

const resolveOrderInput = async (req) => {
  const payload = Array.isArray(req.body.orderItems) && req.body.orderItems.length > 0
    ? await buildOrderItemsFromRequest(req.body.orderItems)
    : await buildOrderItemsFromCart(req);

  const shippingAddress = await ensureShippingAddress(req, req.body.shippingAddress || {});
  const pricing = calculatePricing(payload.itemsPrice);

  return {
    orderItems: payload.orderItems,
    shippingAddress,
    ...pricing,
  };
};

const reduceStock = async (orderItems) => {
  await Promise.all(
    orderItems.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      })
    )
  );
};

const clearUserCart = async (req) => {
  await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });
};

const persistOrder = async ({
  req,
  orderItems,
  shippingAddress,
  paymentMethod,
  itemsPrice,
  shippingPrice,
  taxPrice,
  totalPrice,
  isPaid = false,
  paymentResult = {},
}) => {
  const order = await Order.create({
    user: req.user.id,
    orderItems,
    shippingAddress,
    paymentMethod,
    paymentResult,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    isPaid,
    paidAt: isPaid ? new Date() : undefined,
  });

  await reduceStock(orderItems);
  await clearUserCart(req);

  return order;
};

// ─── @desc    Create new order (COD/manual)
// ─── @route   POST /api/orders
// ─── @access  Private
const createOrder = async (req, res, next) => {
  try {
    const paymentMethod = req.body.paymentMethod || "COD";
    const { orderItems, shippingAddress, itemsPrice, shippingPrice, taxPrice, totalPrice } = await resolveOrderInput(req);

    const order = await persistOrder({
      req,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      isPaid: paymentMethod !== "COD",
    });

    res.status(201).json({ success: true, message: "Order placed successfully", order });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Create Razorpay order
// ─── @route   POST /api/orders/razorpay/create-order
// ─── @access  Private
const createRazorpayOrder = async (req, res, next) => {
  try {
    if (!razorpay) {
      return next(new AppError("Razorpay is not configured on the server", 500));
    }

    const { orderItems, itemsPrice, shippingPrice, taxPrice, totalPrice } = await resolveOrderInput(req);
    const currency = process.env.RAZORPAY_CURRENCY || "INR";

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalPrice * 100),
      currency,
      receipt: `technoshop_${Date.now()}`,
      notes: {
        userId: req.user.id,
        itemCount: String(orderItems.length),
      },
    });

    res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      razorpayOrder,
      pricing: { itemsPrice, shippingPrice, taxPrice, totalPrice },
    });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Verify Razorpay payment and create order
// ─── @route   POST /api/orders/razorpay/verify
// ─── @access  Private
const verifyRazorpayPayment = async (req, res, next) => {
  try {
    if (!razorpay) {
      return next(new AppError("Razorpay is not configured on the server", 500));
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return next(new AppError("Missing Razorpay payment details", 400));
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return next(new AppError("Payment verification failed", 400));
    }

    const existingOrder = await Order.findOne({ "paymentResult.id": razorpay_payment_id });
    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        order: existingOrder,
      });
    }

    const { orderItems, shippingAddress, itemsPrice, shippingPrice, taxPrice, totalPrice } = await resolveOrderInput(req);

    const order = await persistOrder({
      req,
      orderItems,
      shippingAddress,
      paymentMethod: "Razorpay",
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      isPaid: true,
      paymentResult: {
        id: razorpay_payment_id,
        orderId: razorpay_order_id,
        signature: razorpay_signature,
        status: "paid",
        updateTime: new Date().toISOString(),
      },
    });

    res.status(201).json({ success: true, message: "Payment verified successfully", order });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Get logged-in user's orders
// ─── @route   GET /api/orders/my-orders
// ─── @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Get single order by ID
// ─── @route   GET /api/orders/:id
// ─── @access  Private
const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order) return next(new AppError("Order not found", 404));

    if (order.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return next(new AppError("Not authorized to view this order", 403));
    }

    res.status(200).json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Cancel order
// ─── @route   PUT /api/orders/:id/cancel
// ─── @access  Private
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError("Order not found", 404));

    if (order.user.toString() !== req.user.id) {
      return next(new AppError("Not authorized", 403));
    }

    if (["Shipped", "Delivered"].includes(order.orderStatus)) {
      return next(new AppError(`Cannot cancel a ${order.orderStatus} order`, 400));
    }

    order.orderStatus = "Cancelled";
    await order.save();

    const stockRestores = order.orderItems.map((item) =>
      Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
    );
    await Promise.all(stockRestores);

    res.status(200).json({ success: true, message: "Order cancelled", order });
  } catch (err) {
    next(err);
  }
};

// ─── Admin Routes ──────────────────────────────────────────────────────────

// ─── @desc    Get all orders (admin)
// ─── @route   GET /api/orders
// ─── @access  Private/Admin
const getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.orderStatus = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, total, count: orders.length, orders });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Update order status (admin)
// ─── @route   PUT /api/orders/:id/status
// ─── @access  Private/Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return next(new AppError("Order not found", 404));

    order.orderStatus = orderStatus;
    if (orderStatus === "Delivered") {
      order.deliveredAt = new Date();
      order.isPaid = true;
      order.paidAt = new Date();
    }

    await order.save();
    res.status(200).json({ success: true, message: "Order status updated", order });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
