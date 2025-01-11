const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Authority', default: null }, 
  status: { type: String, enum: ['pending', 'in-progress', 'resolved'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
});

module.exports = mongoose.model('Issue', issueSchema);
