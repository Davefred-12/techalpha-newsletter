import mongoose from "mongoose";

const recipientSchema = new mongoose.Schema({
  subscriber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscriber',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  error: {
    type: String,
    default: null
  }
});

const newsletterSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  unsubscribeLink: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'processing', 'completed', 'failed'],
    default: 'draft',
  },
  totalSubscribers: {
    type: Number,
    default: 0,
  },
  sentCount: {
    type: Number,
    default: 0,
  },
  deliveredCount: {
    type: Number,
    default: 0,
  },
  openCount: {
    type: Number,
    default: 0,
  },
  error: {
    type: String,
    default: null,
  },
  lastError: {
    type: String,
    default: null,
  },
  batchSize: {
    type: Number,
    default: 50,
  },
  totalBatches: {
    type: Number,
    default: 0,
  },
  currentBatch: {
    type: Number,
    default: 0,
  },
  sentDate: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  recipients: [recipientSchema]
}, {
  timestamps: true,
});

const Newsletter = mongoose.model("Newsletter", newsletterSchema);

export default Newsletter;