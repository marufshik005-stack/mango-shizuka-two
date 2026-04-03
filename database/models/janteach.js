const mongoose = require('mongoose');

const janTeachSchema = new mongoose.Schema({
  trigger: { type: String, required: true },
  responses: [{ type: String, required: true }],
  threadID: { type: String, required: true },
  lastUsed: { type: Date, default: Date.now }
});

// Create indexes for better search performance
janTeachSchema.index({ trigger: 'text' });
janTeachSchema.index({ threadID: 1 });

module.exports = mongoose.model('JanTeach', janTeachSchema);