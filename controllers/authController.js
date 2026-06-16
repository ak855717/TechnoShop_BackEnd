const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { AppError } = require("../middleware/errorHandler");
const { sendTokenResponse } = require("../middleware/auth");

const GOOGLE_CLIENT_ID = (
  process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || ""
).trim();

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// ─── @desc    Register user
// ─── @route   POST /api/auth/register
// ─── @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("Email already registered", 400));
    }

    const user = await User.create({ name, email, password });
    sendTokenResponse(user, 201, res, "Account created successfully");
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Login user
// ─── @route   POST /api/auth/login
// ─── @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return next(new AppError("Invalid email or password", 401));
    }

    sendTokenResponse(user, 200, res, "Logged in successfully");
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Authenticate user with Google
// ─── @route   POST /api/auth/google
// ─── @access  Public
const googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return next(new AppError("Google credential is required", 400));
    }

    if (!googleClient) {
      return next(new AppError("Google sign-in is not configured on the server.", 500));
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return next(new AppError("Unable to verify your Google account.", 401));
    }

    const email = String(payload.email).trim().toLowerCase();
    let user = await User.findOne({ email });
    const isNewUser = !user;

    if (!user) {
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        password: crypto.randomUUID(),
        googleId: payload.sub,
        avatar: payload.picture || "",
      });
    } else {
      let shouldSave = false;

      if (payload.sub && user.googleId !== payload.sub) {
        user.googleId = payload.sub;
        shouldSave = true;
      }

      if (payload.picture && user.avatar !== payload.picture) {
        user.avatar = payload.picture;
        shouldSave = true;
      }

      if (!user.name && payload.name) {
        user.name = payload.name;
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save({ validateBeforeSave: false });
      }
    }

    sendTokenResponse(
      user,
      isNewUser ? 201 : 200,
      res,
      isNewUser ? "Google account created successfully" : "Logged in with Google successfully"
    );
  } catch (err) {
    if (err.message?.toLowerCase().includes("token")) {
      return next(new AppError("Invalid Google sign-in token.", 401));
    }

    next(err);
  }
};

// ─── @desc    Logout user (clear cookie)
// ─── @route   POST /api/auth/logout
// ─── @access  Private
const logout = (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

// ─── @desc    Get current logged-in user
// ─── @route   GET /api/auth/me
// ─── @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Update password
// ─── @route   PUT /api/auth/update-password
// ─── @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select("+password");

    if (!(await user.matchPassword(currentPassword))) {
      return next(new AppError("Current password is incorrect", 400));
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, "Password updated successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, googleAuth, logout, getMe, updatePassword };
