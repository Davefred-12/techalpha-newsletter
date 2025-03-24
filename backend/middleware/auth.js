import jwt from "jsonwebtoken";

// Protect middleware for any authenticated user
export const protect = async (req, res, next) => {
  // Skip authentication for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      
      if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ success: false, message: "Invalid token format" });
      }

      // Verify the token
      const token_decode = jwt.verify(token, process.env.JWT_SECRET);

      // Check if this is an admin token
      if (token_decode.role === "admin") {
        // You could optionally set an admin flag or other properties
        req.body.isAdmin = true;
        // Proceed to the next middleware
        return next();
      }
      
      // If you still need userId for non-admin tokens:
      if (token_decode.id) {
        req.body.userId = token_decode.id;
      } else {
        return res.status(401).json({ success: false, message: "Invalid token structure" });
      }

      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({ success: false, message: "Not Authorized Login Again" });
    }
  } else {
    return res.status(401).json({ success: false, message: "Authorization header required" });
  }
};

// Admin-only middleware
export const authenticateAdmin = async (req, res, next) => {
  // Skip authentication for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      
      if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ success: false, message: "Invalid token format" });
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check specifically for admin role
      if (decoded.role !== "admin") {
        return res.status(403).json({ 
          success: false, 
          message: "Not authorized as admin" 
        });
      }

      // Store admin info in request for use in controllers
      req.admin = {
        id: decoded.id,
        role: decoded.role
      };
      
      next();
    } catch (error) {
      console.error("Admin authentication error:", error);
      return res.status(401).json({ 
        success: false, 
        message: "Admin authentication failed" 
      });
    }
  } else {
    return res.status(401).json({ 
      success: false, 
      message: "Authorization header required" 
    });
  }
};