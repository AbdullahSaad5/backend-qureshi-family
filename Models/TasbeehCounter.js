const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const counterSchema = new Schema({
  count: {
    type: Number,
    required: true,
    default: 0, 
  },
});

const Counter = mongoose.model("Counter", counterSchema);
module.exports = Counter;
