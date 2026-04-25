const jwt = require("jsonwebtoken");

/**
 * Signs a JWT token and returns it
 * @param {string} id - User ID
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

/**
 * Attaches the JWT to a cookie
 * @param {object} res - Express response object
 * @param {string} token - JWT token
 */
const sendTokenResponse = (res, statusCode, token) => {
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: true, // Required for SameSite: 'none'
    sameSite: "none",
    path: "/",
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token, // Optional: usually you just use the cookie
  });
};

module.exports = {
  generateToken,
  sendTokenResponse,
};
