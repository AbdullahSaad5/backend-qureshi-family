const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const personSchema = new Schema(
  {
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
