import Subscriber from '../models/subscriber.js';
import nodemailer from 'nodemailer';
import { getWelcomeEmailContent } from '../utils/emailUtils.js';

export const subscribe = async (req, res) => {
  const { name, email, phone } = req.body;

  // Validate request body
  if (!name || !email || !phone) {
    return res.status(400).json({ message: 'Name, email, and phone are required.' });
  }

  try {
    // Check if the email is already subscribed
    const existingSubscriber = await Subscriber.findOne({ email });
    if (existingSubscriber) {
      return res.status(400).json({ message: 'This email is already subscribed.' });
    }

    // Create a new subscriber
    const newSubscriber = await Subscriber.create({ name, email, phone });

    // Send welcome email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const unsubscribeLink = `http://localhost:${process.env.PORT || 9000}/unsubscribe/${email}`;
    const htmlContent = getWelcomeEmailContent(name, unsubscribeLink);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Our Newsletter!',
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    // Return success response
    res.status(201).json({ message: 'Thank you for subscribing!' });
  } catch (error) {
    console.error('Error subscribing or sending welcome email:', error);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
};