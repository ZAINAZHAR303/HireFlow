const mongoose = require('mongoose');

const JobCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  data: { type: Object },
  fetchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JobCache', JobCacheSchema);
