import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/userModel.js";

const normalizeEmail = (email = "") => email.trim().toLowerCase();
const normalizeUserId = (userId = "") => userId.trim().toLowerCase();

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function publicUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    userId: user.userId,
    isEmailVerified: user.isEmailVerified,
  };
}

async function sendOtpEmail(email, otp) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `IPO Light <${smtpUser}>`,
    to: email,
    subject: "Your IPO Light verification OTP",
    text: `Your IPO Light OTP is ${otp}. It expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
  });

  return true;
}

export async function requestEmailOtp(req, res) {
  try {
    const mode = req.body.mode || "signup";
    const email = normalizeEmail(req.body.email);
    const userId = normalizeUserId(req.body.userId);
    const fullName = String(req.body.fullName || "").trim();
    const password = String(req.body.password || "");

    if (!email || !userId || password.length < 6) {
      return res.status(400).json({ message: "Email, User ID, and a 6 character password are required" });
    }

    if (mode === "signup" && !fullName) {
      return res.status(400).json({ message: "Full name is required" });
    }

    const existingByEmail = await User.findOne({ email });
    const existingByUserId = await User.findOne({ userId });

    if (mode === "signup") {
      if (existingByEmail?.isEmailVerified) {
        return res.status(409).json({ message: "Email is already registered" });
      }
      if (existingByUserId && existingByUserId.email !== email) {
        return res.status(409).json({ message: "User ID is already taken" });
      }
    }

    const otp = createOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const passwordHash = await bcrypt.hash(password, 12);
    const otpExpiresAt = new Date(Date.now() + Number(process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);

    const user = existingByEmail || new User({ email, userId, passwordHash });
    user.fullName = fullName || user.fullName;
    user.userId = userId;
    user.passwordHash = passwordHash;
    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    const sent = await sendOtpEmail(email, otp);

    res.json({
      message: sent ? "OTP sent to your email" : "OTP generated for development",
      ...(sent || process.env.NODE_ENV === "production" ? {} : { demoOtp: otp }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to request OTP" });
  }
}

export async function verifyEmailOtp(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "");

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user || !user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({ message: "Request a new OTP first" });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired. Request a new OTP" });
    }

    const matches = await bcrypt.compare(otp, user.otpHash);
    if (!matches) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isEmailVerified = true;
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to verify OTP" });
  }
}

export async function loginUser(req, res) {
  try {
    const userId = normalizeUserId(req.body.userId);
    const password = String(req.body.password || "");

    if (!userId || !password) {
      return res.status(400).json({ message: "User ID and password are required" });
    }

    const user = await User.findOne({ userId });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid User ID or password" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Verify your email before logging in" });
    }

    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to login" });
  }
}
