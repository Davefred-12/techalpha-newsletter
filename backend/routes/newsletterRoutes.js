import express from "express";
import { 
  sendNewsletter,
  getNewsletterStatus,
  trackEmailOpen,
  getNewsletters,
  sendTestEmail,
  getNewsletterAnalytics,
  getNewsletterRecipients,
  resendNewsletter,
  deleteNewsletter
} from "../controllers/newsletterController.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

// Protected routes (require admin authentication)
router.post("/newsletter/send", authenticateAdmin, sendNewsletter);
router.post("/newsletter/test", authenticateAdmin, sendTestEmail);
router.get("/newsletter/status/:newsletterId", authenticateAdmin, getNewsletterStatus);
router.get("/newsletters", authenticateAdmin, getNewsletters);

// Analytics dashboard endpoints
router.get("/newsletter/analytics", authenticateAdmin, getNewsletterAnalytics);
router.get("/newsletter/:newsletterId/recipients", authenticateAdmin, getNewsletterRecipients);
router.post("/newsletter/resend", authenticateAdmin, resendNewsletter);
// Delete newsletter route
router.delete('/newsletter/:newsletterId', authenticateAdmin, deleteNewsletter);

// Public tracking endpoint (no authentication required)
router.get("/newsletter/track/:newsletterId/:subscriberId", trackEmailOpen);
router.get("/newsletter/track/:newsletterId", trackEmailOpen); // Backward compatibility

export default router;