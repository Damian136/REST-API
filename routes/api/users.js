const express = require("express");
const router = express.Router();
const Joi = require("joi");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/user");
const checkToken = require("../../middleware/checkToken");
const emailVerificationMiddleware = require("../../middleware/emailVerificationMiddleware");
const gravatar = require("gravatar");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jimp = require("jimp");
const uuid = require("uuid");
const nodemailer = require("nodemailer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../tmp"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, uniqueSuffix + fileExtension);
  },
});

const upload = multer({ storage: storage });

router.post("/signup", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: "Validation error", error });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email in use" });
    }

    const verificationToken = uuid.v4();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const avatarGravatar = `https://www.gravatar.com/avatar/${encodeURIComponent(
      email
    )}?s=250&d=retro`;

    const newUser = new User({
      email,
      password: hashedPassword,
      avatarURL: avatarGravatar,
      verificationToken,
    });

    await newUser.save();

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Email Verification",
      text: `Click the following link to verify your email: ${process.env.BASE_URL}/api/users/verify/${verificationToken}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: "Email sending failed" });
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    const token = jwt.sign({ userId: newUser._id }, process.env.SECRET_KEY, {
      expiresIn: "1h",
    });

    res.status(201).json({
      token,
      user: {
        email: newUser.email,
        subscription: newUser.subscription,
        avatarURL: newUser.avatarURL,
      },
    });
  } catch (error) {
    next(error);
  }
});
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: "Validation error", error });
    }

    const user = await User.findOne({ email }).select("+avatarURL");

    if (!user) {
      return res.status(401).json({ message: "Email or password is wrong" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Email or password is wrong" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, {
      expiresIn: "1h",
    });

    user.token = token;
    await user.save();

    res.status(200).json({
      token,
      user: {
        email: user.email,
        subscription: user.subscription,
        avatarURL: user.avatarURL,
      },
    });
  } catch (error) {
    next(error);
  }
});
router.get("/logout", checkToken, async (req, res, next) => {
  try {
    req.user.token = null;
    await req.user.save();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/current", checkToken, async (req, res, next) => {
  try {
    res.status(200).json({
      email: req.user.email,
      subscription: req.user.subscription,
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/avatars",
  checkToken,
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Unauthorized: User is not authenticated." });
      }

      const user = req.user;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const imagePath = path.join(__dirname, "../../tmp", req.file.filename);
      const image = await jimp.read(imagePath);
      await image.cover(250, 250);
      await image.quality(90);

      const newFileName = `${user._id}${path.extname(req.file.filename)}`;
      const newFilePath = path.join(
        __dirname,
        "../../public/avatars",
        newFileName
      );

      if (user.avatarURL) {
        const previousAvatarPath = path.join(
          __dirname,
          "../../public",
          user.avatarURL
        );
        if (fs.existsSync(previousAvatarPath)) {
          fs.unlinkSync(previousAvatarPath);
        }
      }

      await image.write(newFilePath);

      user.avatarURL = `/avatars/${newFileName}`;
      await user.save();

      res.status(200).json({ avatarURL: user.avatarURL });
    } catch (error) {
      next(error);
    }
  }
);
router.get("/verify/:verificationToken", async (req, res) => {
  const verificationToken = req.params.verificationToken;

  try {
    const user = await User.findOne({ verificationToken });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.verify = true;
    await user.save();
    return res.status(200).json({ message: "Verification successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/verify", emailVerificationMiddleware, async (req, res, next) => {
  try {
    const user = req.user;

    const verificationToken = uuid.v4();

    user.verificationToken = verificationToken;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    const verificationLink = `${process.env.BASE_URL}/api/users/verify/${verificationToken}`;
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: "Email Verification",
      html: `Click the following link to verify your email: <a href="${verificationLink}">${verificationLink}</a>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: "Email sending failed" });
      } else {
        console.log("Email sent: " + info.response);
        res.status(200).json({ message: "Verification email sent" });
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;