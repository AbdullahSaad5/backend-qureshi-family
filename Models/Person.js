const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const personSchema = new Schema(
  {
    // key: { type: String, required: true },
    // n: { type: String, required: true },
    // s: { type: String, enum: ["M", "F"], required: true },
    // m: { type: String },
    // f: { type: String },
    // spouse: { type: [String] },
    // t: { type: String },
    name: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    father: {
      type: Schema.Types.ObjectId,
      ref: "DummyPerson",
    },
    mother: {
      type: Schema.Types.ObjectId,
      ref: "DummyPerson",
    },
    spouse: {
      type: [Schema.Types.ObjectId],
      ref: "DummyPerson",
    },
    about: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Person = mongoose.model("DummyPerson", personSchema);

module.exports = Person;
