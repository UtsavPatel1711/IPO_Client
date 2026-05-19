import User from "../models/userModel.js";

const normalizeEmail = (email = "") => email.trim().toLowerCase();

export async function saveWorkspace(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const workspace = {
      ipos: Array.isArray(req.body.ipos) ? req.body.ipos : [],
      clients: Array.isArray(req.body.clients) ? req.body.clients : [],
      upis: Array.isArray(req.body.upis) ? req.body.upis : [],
      applications: Array.isArray(req.body.applications) ? req.body.applications : [],
    };

    const user = await User.findOneAndUpdate(
      { email },
      { $set: { workspace } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Workspace saved", ...user.workspace.toObject() });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to save workspace" });
  }
}

export async function loadWorkspace(req, res) {
  try {
    const email = normalizeEmail(req.params.email);
    const user = await User.findOne({ email }).select("workspace");

    if (!user) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    res.json(user.workspace || { ipos: [], clients: [], upis: [], applications: [] });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to load workspace" });
  }
}
