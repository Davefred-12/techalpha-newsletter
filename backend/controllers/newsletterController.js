import { renderTemplate } from "../utils/emailUtils.js";
import nodemailer from "nodemailer";
import Subscriber from "../models/subscriber.js";
import Newsletter from "../models/newsletter.js";
import mongoose from "mongoose";

export const sendNewsletter = async (req, res) => {
  const { subject, message, unsubscribeLink, subscriberIds, batchSize = 50 } = req.body;

  if (!subject || !message || !unsubscribeLink) {
    return res.status(400).json({
      success: false,
      error: "Subject, message, and unsubscribeLink are required",
    });
  }

  try {
    // Build query based on whether specific subscribers were selected
    const query = subscriberIds && subscriberIds.length > 0 
      ? { _id: { $in: subscriberIds } }
      : {};

    // Count selected subscribers
    const totalSubscribers = await Subscriber.countDocuments(query);

    if (totalSubscribers === 0) {
      return res.status(404).json({
        success: false,
        error: "No subscribers found",
      });
    }

    // Get all subscribers for this newsletter
    const subscribers = await Subscriber.find(query).select('_id');
    
    // Create a new newsletter record with recipients array
    const newsletter = new Newsletter({
      subject,
      message,
      unsubscribeLink,
      totalSubscribers,
      sentCount: 0,
      deliveredCount: 0,
      openCount: 0,
      status: 'processing',
      batchSize: batchSize || 50,
      totalBatches: Math.ceil(totalSubscribers / (batchSize || 50)),
      currentBatch: 0,
      recipients: subscribers.map(sub => ({
        subscriber: sub._id,
        status: 'pending'
      }))
    });

    await newsletter.save();
    console.log(`Newsletter created with ID: ${newsletter._id}`);

    // Start the batch sending process
    processBatchSending(subject, message, unsubscribeLink, newsletter._id, query, batchSize || 50);

    res.status(200).json({
      success: true,
      message: "Newsletter sending has started",
      recipientCount: totalSubscribers,
      newsletterId: newsletter._id,
    });
  } catch (error) {
    console.error("Newsletter sending error:", error);
    res.status(500).json({
      success: false,
      error: "Error sending newsletter: " + error.message,
    });
  }
};

// Function to process batch sending of newsletters
const processBatchSending = async (subject, message, unsubscribeLink, newsletterId, query = {}, batchSize = 50) => {
  console.log(`Starting batch process for newsletter ${newsletterId} with query:`, JSON.stringify(query));
  
  try {
    let page = 0;
    let totalSent = 0;
    let totalDelivered = 0;
    let hasMoreSubscribers = true;

    // Create transporter with better error handling
    let transporter;
    try {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      
      // Verify connection configuration
      await transporter.verify();
      console.log("SMTP connection verified successfully");
    } catch (smtpError) {
      console.error("SMTP configuration error:", smtpError);
      await Newsletter.findByIdAndUpdate(newsletterId, {
        status: 'failed',
        error: `SMTP configuration error: ${smtpError.message}`
      });
      return;
    }

    // Process subscribers in batches
    while (hasMoreSubscribers) {
      // Update current batch in database
      await Newsletter.findByIdAndUpdate(newsletterId, {
        currentBatch: page
      });
      
      // Get subscribers for the current batch
      const subscribers = await Subscriber.find(query)
        .skip(page * batchSize)
        .limit(batchSize);

      console.log(`Found ${subscribers.length} subscribers in batch ${page + 1}`);

      if (subscribers.length === 0) {
        hasMoreSubscribers = false;
        break;
      }

      // Send emails to the current batch
      for (const subscriber of subscribers) {
        try {
          console.log(`Attempting to send email to: ${subscriber.email}`);
          
          // Create tracking pixel URL with both newsletter and subscriber IDs
          const trackingPixel = `<img src="${process.env.API_URL || 'http://localhost:9000'}/api/newsletter/track/${newsletterId}/${subscriber._id}" width="1" height="1" alt="" />`;
          
          // Add tracking pixel to message
          const personalizedMessage = renderTemplate(message, {
            name: subscriber.name,
            email: subscriber.email,
            unsubscribeLink: `${unsubscribeLink}?email=${encodeURIComponent(subscriber.email)}&id=${newsletterId}`,
          }) + trackingPixel;

          const info = await transporter.sendMail({
            from: `"Newsletter" <${process.env.EMAIL_USER}>`,
            to: subscriber.email,
            subject: subject,
            html: personalizedMessage,
          });

          console.log(`Email sent to ${subscriber.email}, messageId: ${info.messageId}`);
          
          totalSent++;
          
          // Update individual recipient status in the newsletter
          if (info && info.accepted && info.accepted.length > 0) {
            totalDelivered++;
            
            // Update recipient status to delivered
            await Newsletter.updateOne(
              { 
                _id: newsletterId, 
                "recipients.subscriber": subscriber._id 
              },
              { 
                $set: { 
                  "recipients.$.status": "delivered",
                  "recipients.$.deliveredAt": new Date()
                } 
              }
            );
          } else {
            // Update recipient status to failed
            await Newsletter.updateOne(
              { 
                _id: newsletterId, 
                "recipients.subscriber": subscriber._id 
              },
              { 
                $set: { 
                  "recipients.$.status": "failed",
                  "recipients.$.error": info?.response || "Unknown error"
                } 
              }
            );
          }
          
          // Update newsletter sent and delivered counts after each email
          await Newsletter.findByIdAndUpdate(newsletterId, {
            sentCount: totalSent,
            deliveredCount: totalDelivered
          });

          // Add a small delay between individual emails to avoid rate limiting
          await delay(300);
        } catch (emailError) {
          console.error(`Error sending to ${subscriber.email}:`, emailError);
          
          // Update recipient status to failed
          await Newsletter.updateOne(
            { 
              _id: newsletterId, 
              "recipients.subscriber": subscriber._id 
            },
            { 
              $set: { 
                "recipients.$.status": "failed",
                "recipients.$.error": emailError.message
              } 
            }
          );
          
          // Update the newsletter with the latest error
          await Newsletter.findByIdAndUpdate(newsletterId, {
            lastError: `Error sending to ${subscriber.email}: ${emailError.message}`
          });
        }
      }

      // Add a delay between batches to reduce server load
      await delay(2000);
      
      // Move to the next page/batch
      page++;
    }

    // Update newsletter status to completed
    await Newsletter.findByIdAndUpdate(newsletterId, {
      status: 'completed',
      completedAt: new Date(),
      sentDate: new Date() // Add this for analytics dashboard
    });

    console.log(`Newsletter sending completed. Total sent: ${totalSent}, Total delivered: ${totalDelivered}`);
  } catch (error) {
    console.error("Batch sending error:", error);
    
    // Update newsletter status to failed
    await Newsletter.findByIdAndUpdate(newsletterId, {
      status: 'failed',
      error: error.message
    });
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Get newsletter status
export const getNewsletterStatus = async (req, res) => {
  const { newsletterId } = req.params;

  try {
    const newsletter = await Newsletter.findById(newsletterId);
    
    if (!newsletter) {
      return res.status(404).json({
        success: false,
        error: "Newsletter not found",
      });
    }

    res.status(200).json({
      success: true,
      newsletter: {
        id: newsletter._id,
        subject: newsletter.subject,
        totalSubscribers: newsletter.totalSubscribers,
        sentCount: newsletter.sentCount,
        deliveredCount: newsletter.deliveredCount,
        openCount: newsletter.openCount,
        status: newsletter.status,
        error: newsletter.error || null,
        lastError: newsletter.lastError || null,
        createdAt: newsletter.createdAt,
        completedAt: newsletter.completedAt,
        currentBatch: newsletter.currentBatch || 0,
        totalBatches: newsletter.totalBatches || 0
      },
    });
  } catch (error) {
    console.error("Error fetching newsletter status:", error);
    res.status(500).json({
      success: false,
      error: "Error fetching newsletter status",
    });
  }
};

// Improved email tracking endpoint with subscriber tracking
export const trackEmailOpen = async (req, res) => {
  const { newsletterId, subscriberId } = req.params;
  
  try {
    console.log(`Email opened for newsletter ID: ${newsletterId}, subscriber ID: ${subscriberId}`);
    
    // Don't send error response for invalid IDs to ensure tracking pixel still loads
    if (mongoose.Types.ObjectId.isValid(newsletterId) && 
        mongoose.Types.ObjectId.isValid(subscriberId)) {
      
      // Update recipient status to read if not already
      await Newsletter.updateOne(
        { 
          _id: newsletterId, 
          "recipients.subscriber": subscriberId,
          "recipients.status": { $ne: "read" } // Only update if not already read
        },
        { 
          $set: { 
            "recipients.$.status": "read",
            "recipients.$.readAt": new Date()
          } 
        }
      );
      
      // Increment open count only if it's the first time this subscriber opens
      await Newsletter.findByIdAndUpdate(newsletterId, {
        $inc: { openCount: 1 }
      });
      
      console.log(`Updated read status for newsletter ${newsletterId}, subscriber ${subscriberId}`);
    }
    
    // Return a 1x1 transparent pixel
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (error) {
    console.error("Error tracking email open:", error);
    // Still return the tracking pixel even on error
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  }
};

// Get all newsletters with pagination
export const getNewsletters = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const newsletters = await Newsletter.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Newsletter.countDocuments({});
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      newsletters,
      total,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching newsletters:", error);
    res.status(500).json({
      success: false,
      error: "Error fetching newsletters",
    });
  }
};

// NEW ENDPOINTS FOR ANALYTICS DASHBOARD

// Get newsletter analytics data
export const getNewsletterAnalytics = async (req, res) => {
  try {
    // Get all newsletters sent within the last 30 days (or all if requested)
    const timeFrame = req.query.timeFrame || '30days';
    
    let dateFilter = {};
    if (timeFrame === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter = { sentDate: { $gte: thirtyDaysAgo } };
    }
    
    // Get newsletters with analytics data
    const newsletters = await Newsletter.find(dateFilter)
      .sort({ sentDate: -1 })
      .select('_id subject sentDate sentCount deliveredCount openCount recipients')
      .lean();
    
    // Format the history records
    const history = newsletters.map(newsletter => {
      // Calculate expiration date (30 days from sent date)
      const sentDate = new Date(newsletter.sentDate || newsletter.createdAt);
      const expiresAt = new Date(sentDate);
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      return {
        id: newsletter._id,
        subject: newsletter.subject,
        sentDate: newsletter.sentDate || newsletter.createdAt,
        sentCount: newsletter.sentCount || newsletter.recipients?.length || 0,
        deliveredCount: newsletter.deliveredCount || 
                        newsletter.recipients?.filter(r => r.status === 'delivered' || r.status === 'read').length || 0,
        readCount: newsletter.openCount || 
                   newsletter.recipients?.filter(r => r.status === 'read').length || 0,
        expiresAt: expiresAt.toISOString()
      };
    });
    
    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error fetching newsletter analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch newsletter analytics' });
  }
};

// Get recipient details for a specific newsletter
export const getNewsletterRecipients = async (req, res) => {
  const { newsletterId } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(newsletterId)) {
    return res.status(400).json({ error: 'Invalid newsletter ID' });
  }
  
  try {
    const newsletter = await Newsletter.findById(newsletterId)
      .populate('recipients.subscriber', 'name email')
      .lean();
    
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }
    
    // Format recipient data for frontend
    const recipients = newsletter.recipients?.map(recipient => {
      return {
        name: recipient.subscriber?.name || 'Unknown User',
        email: recipient.subscriber?.email || 'unknown@email.com',
        status: recipient.status || 'unknown',
        deliveredAt: recipient.deliveredAt || null,
        readAt: recipient.readAt || null
      };
    }) || [];
    
    return res.status(200).json({
      success: true,
      newsletterId,
      subject: newsletter.subject,
      sentDate: newsletter.sentDate || newsletter.createdAt,
      recipients
    });
  } catch (error) {
    console.error('Error fetching newsletter recipients:', error);
    return res.status(500).json({ error: 'Failed to fetch recipients' });
  }
};
// Backend controller function (to add to your newsletterController.js)
export const deleteNewsletter = async (req, res) => {
  const { newsletterId } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(newsletterId)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid newsletter ID format' 
    });
  }
  
  try {
    // Find the newsletter first to make sure it exists
    const newsletter = await Newsletter.findById(newsletterId);
    
    if (!newsletter) {
      return res.status(404).json({ 
        success: false,
        error: 'Newsletter not found' 
      });
    }
    
    // Delete the newsletter
    await Newsletter.findByIdAndDelete(newsletterId);
    
    return res.status(200).json({
      success: true,
      message: 'Newsletter deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting newsletter:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error deleting newsletter' 
    });
  }
};

// Resend newsletter to selected recipients
export const resendNewsletter = async (req, res) => {
  const { newsletterId, recipientType } = req.body;
  
  if (!newsletterId || !recipientType) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  try {
    const newsletter = await Newsletter.findById(newsletterId)
      .populate('recipients.subscriber')
      .lean();
    
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }
    
    // Filter recipients based on recipientType
    let recipientsToResend = [];
    
    if (recipientType === 'all') {
      recipientsToResend = newsletter.recipients || [];
    } else if (recipientType === 'unread') {
      recipientsToResend = (newsletter.recipients || []).filter(
        r => r.status === 'delivered' && !r.readAt
      );
    } else if (recipientType === 'read') {
      recipientsToResend = (newsletter.recipients || []).filter(
        r => r.status === 'read'
      );
    } else if (recipientType === 'failed') {
      recipientsToResend = (newsletter.recipients || []).filter(
        r => r.status === 'failed'
      );
    }
    
    // Only continue if we have subscribers to send to
    if (recipientsToResend.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No recipients matched the criteria',
        recipientCount: 0
      });
    }
    
    // Create a new newsletter record based on the original one
    const resendNewsletter = new Newsletter({
      subject: `[Resend] ${newsletter.subject}`,
      message: newsletter.message,
      unsubscribeLink: newsletter.unsubscribeLink,
      sentDate: new Date(),
      status: 'processing',
      totalSubscribers: recipientsToResend.length,
      sentCount: 0,
      deliveredCount: 0,
      openCount: 0,
      recipients: recipientsToResend.map(r => ({
        subscriber: r.subscriber._id,
        status: 'pending'
      }))
    });
    
    await resendNewsletter.save();
    
    // Start the batch sending process
    processBatchSending(
      resendNewsletter.subject,
      newsletter.message,
      newsletter.unsubscribeLink,
      resendNewsletter._id,
      { _id: { $in: recipientsToResend.map(r => r.subscriber._id) } },
      50 // Default batch size
    );
    
    return res.status(200).json({
      success: true,
      message: 'Newsletter queued for resending',
      recipientCount: recipientsToResend.length,
      newsletterId: resendNewsletter._id
    });
  } catch (error) {
    console.error('Error resending newsletter:', error);
    return res.status(500).json({ error: 'Failed to resend newsletter' });
  }
};

// Send test email
export const sendTestEmail = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: "Email address is required"
    });
  }
  
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    // Verify connection
    await transporter.verify();
    
    // Send test email
    const info = await transporter.sendMail({
      from: `"Newsletter Test" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Test Email",
      html: `
        <h1>This is a test email</h1>
        <p>If you're receiving this, your email configuration is working correctly.</p>
        <p>Email User: ${process.env.EMAIL_USER?.substring(0, 3)}...${process.env.EMAIL_USER?.substring(process.env.EMAIL_USER.indexOf('@'))}</p>
        <img src="${process.env.API_URL || 'http://localhost:9000'}/api/newsletter/track/test" width="1" height="1" alt="" />
      `
    });
    
    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      messageId: info.messageId
    });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      error: `Error sending test email: ${error.message}`
    });
  }
};
