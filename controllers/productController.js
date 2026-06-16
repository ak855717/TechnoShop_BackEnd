const Product = require("../models/Product");
const { AppError } = require("../middleware/errorHandler");

// ─── @desc    Get all products with filtering, sorting, pagination
// ─── @route   GET /api/products
// ─── @access  Public
const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      isNew,
      isFeatured,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 12,
    } = req.query;

    // Build filter query
    const filter = {};

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Category filter
    if (category && category !== "All") {
      filter.category = category;
    }

    // Brand filter
    if (brand && brand !== "All") {
      filter.brand = brand;
    }

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (isNew !== undefined) filter.isNew = isNew === "true";
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = {};
    const allowedSorts = ["price", "rating", "reviews", "createdAt", "name", "discount"];
    sortOptions[allowedSorts.includes(sortBy) ? sortBy : "createdAt"] = sortOrder;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      products,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Get single product by ID
// ─── @route   GET /api/products/:id
// ─── @access  Public
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    res.status(200).json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Get featured products
// ─── @route   GET /api/products/featured
// ─── @access  Public
const getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isFeatured: true })
      .sort({ rating: -1 })
      .limit(8)
      .lean();

    res.status(200).json({ success: true, count: products.length, products });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Get new arrivals
// ─── @route   GET /api/products/new-arrivals
// ─── @access  Public
const getNewArrivals = async (req, res, next) => {
  try {
    const products = await Product.find({ isNew: true })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    res.status(200).json({ success: true, count: products.length, products });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Get related products (same category, exclude current)
// ─── @route   GET /api/products/:id/related
// ─── @access  Public
const getRelatedProducts = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError("Product not found", 404));

    const related = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
    })
      .limit(4)
      .lean();

    res.status(200).json({ success: true, count: related.length, products: related });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Create product (admin)
// ─── @route   POST /api/products
// ─── @access  Private/Admin
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, message: "Product created", product });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Update product (admin)
// ─── @route   PUT /api/products/:id
// ─── @access  Private/Admin
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) return next(new AppError("Product not found", 404));

    res.status(200).json({ success: true, message: "Product updated", product });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Delete product (admin)
// ─── @route   DELETE /api/products/:id
// ─── @access  Private/Admin
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return next(new AppError("Product not found", 404));

    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Get all unique categories & brands (for filters)
// ─── @route   GET /api/products/filters
// ─── @access  Public
const getFilters = async (req, res, next) => {
  try {
    const [categories, brands] = await Promise.all([
      Product.distinct("category"),
      Product.distinct("brand"),
    ]);

    res.status(200).json({ success: true, categories, brands });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getNewArrivals,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getFilters,
};
