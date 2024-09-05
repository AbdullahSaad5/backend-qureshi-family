// const dbURI = "mongodb://localhost:27017/shajra";

const mongoose = require("mongoose");

const connectDB = async () => {
  const dbURI = process.env.DB_URL;

  try {
    await mongoose.connect(dbURI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
