const User = require("../models/User");
const { AppError } = require("../middleware/errorHandler");

// ─── @desc    Get all users (admin)
// ─── @route   GET /api/users
// ─── @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(),
    ]);

    res.status(200).json({ success: true, total, count: users.length, users });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Get single user (admin)
// ─── @route   GET /api/users/:id
// ─── @access  Private/Admin
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found", 404));

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Update user profile (self)
// ─── @route   PUT /api/users/profile
// ─── @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {};
    if (req.body.name !== undefined) fieldsToUpdate.name = req.body.name;
    if (req.body.email !== undefined) fieldsToUpdate.email = req.body.email;
    if (req.body.phone !== undefined) fieldsToUpdate.phone = req.body.phone;
    if (req.body.addresses !== undefined) fieldsToUpdate.addresses = req.body.addresses;

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, message: "Profile updated", user });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Update user role (admin)
// ─── @route   PUT /api/users/:id/role
// ─── @access  Private/Admin
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) return next(new AppError("User not found", 404));

    res.status(200).json({ success: true, message: "User role updated", user });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Delete user (admin)
// ─── @route   DELETE /api/users/:id
// ─── @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return next(new AppError("User not found", 404));

    res.status(200).json({ success: true, message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, getUser, updateProfile, updateUserRole, deleteUser };
