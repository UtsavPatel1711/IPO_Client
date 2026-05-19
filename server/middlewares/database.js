export function requireDatabase(req, res, next) {
  if (req.app.locals.dbReady) {
    return next();
  }

  return res.status(503).json({
    message: "Database is not connected. Check MONGODB_URI in server/.env and restart the backend.",
  });
}
