const jwt = require("jsonwebtoken");
const User = require("../models/user");

const emailVerificationMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    const user = await User.findOne({
      _id: decoded.userId,
      verificationToken: token,
    });
    if (!user) {
      throw new Error();
    }

    // Oznacz użytkownika jako zweryfikowanego
    user.verificationToken = null;
    user.verify = true;
    await user.save();

    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized" });
  }
};

module.exports = emailVerificationMiddleware;
