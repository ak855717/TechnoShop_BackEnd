const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError } = require("./errorHandler");

// ─── Protect Route (must be logged in) ────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header first, then cookie
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new AppError("Not authorized. Please log in.", 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError("User no longer exists.", 401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Authorize Roles ───────────────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Role '${req.user.role}' is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// ─── Send Token Response ───────────────────────────────────────────────────
const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || "",
  addresses: Array.isArray(user.addresses) ? user.addresses : [],
  avatar: user.avatar || "",
});

const sendTokenResponse = (user, statusCode, res, message = "Success") => {
  const token = user.getSignedJwtToken();

  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  // Remove password from output
  user.password = undefined;

  res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      message,
      token,
      user: serializeUser(user),
    });
};

module.exports = { protect, authorize, sendTokenResponse };
