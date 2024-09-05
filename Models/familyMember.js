const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const personSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  ID: {
    type: String,
  },
  address: {
    type: String,
  },
  tribe: {
    type: String,
  },
  veriCount: {
    type: Number,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  gender: {
    type: String,
    enum: ["male", "female"],
    required: true,
  },
  dateOfBirth: {
    type: Date,
  },
  dateOfDeath: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },

  // Replacing the `parents` field with `father` and `mother`
  father: {
    type: Schema.Types.ObjectId,
    ref: "Person",
  },
  mother: {
    type: Schema.Types.ObjectId,
    ref: "Person",
  },

  children: [
    {
      type: Schema.Types.ObjectId,
      ref: "Person",
    },
  ],

  spouseIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "Person",
    },
  ],

  siblings: [
    {
      type: Schema.Types.ObjectId,
      ref: "Person",
    },
  ],

  biography: {
    type: String,
  },
  isProminentFigure: {
    type: Boolean,
    default: false,
  },
});

const Person = mongoose.model("Person", personSchema);
module.exports = Person;
