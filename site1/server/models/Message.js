const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    type: { type: String, required: true }, 
    channel: { type: String, required: true },
    username: { type: String, required: true },
    content: { type: String, required: true },
    fileType: { type: String }, 
    isPreFormatted: { type: Boolean, default: false } 
});

module.exports = mongoose.model('Message', messageSchema);