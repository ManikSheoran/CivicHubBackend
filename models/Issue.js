const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  location: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  resolved: { type: Number, default: 0 },
  upvotes: { type: Number, default: 0 },
  points: { type: Number, default: 0 }
});

module.exports = mongoose.model('Issue', issueSchema);
