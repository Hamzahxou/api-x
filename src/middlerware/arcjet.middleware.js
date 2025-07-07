import { aj } from "../config/arcjet.js";

export const arcjetMiddleware = async (req, res, next) => {
  try {
    const decision = await aj.protect(req, {
      requested: 1,
    });

    if (decision.isDenied) {
      if (decision.reason.isRateLimit()) {
        return res
          .status(429)
          .json({ message: "Too many requests, please try again later" });
      } else if (decision.reason.isBot()) {
        return res
          .status(403)
          .json({ message: "Bots are not allowed to access this resource" });
      } else {
        return res.status(403).json({ message: "Forbidden, Access denied" });
      }
    }

    if (
      decision.results.some(
        (result) => result.reason.isBot() && result.reason.isSpoofed()
      )
    ) {
      return res
        .status(403)
        .json({ message: "Malicious bot activity detected" });
    }
    next();
  } catch (err) {
    console.error("ArcJet error:", err);
    next();
  }
};
