const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const personSchema = new Schema({
  name: {
    type: String,
    required: true,
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

  parents: [
    {
      type: Schema.Types.ObjectId,
      ref: "Person",
    },
  ],

  children: [
    {
      type: Schema.Types.ObjectId,
      ref: "Person",
    },
  ],

  spouse: {
    type: Schema.Types.ObjectId,
    ref: "Person",
  },

  siblings: [
    {
      type: Schema.Types.ObjectId,
      ref: "Person",
    },
  ],

  stepParents: [
    {
      type: Schema.Types.ObjectId,
      ref: "Person",
    },
  ],
  stepChildren: [
    {
      type: Schema.Types.ObjectId,
      ref: "Person",
    },
  ],
  halfSiblings: [
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

  biography: {
    type: String,
  },

  late: {
    type: Boolean,
    default: false,
  },
});

const Person = mongoose.model("Person", personSchema);
module.exports = Person;
