const mongoose = require('mongoose');

const authoritySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  points: {type: Number, default: 0},
  issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }]
});

module.exports = mongoose.model('Authority', authoritySchema);
