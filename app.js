const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const familyRoutes = require("./Routes/familyRoutes");
const app = express();
const connectDB = require("./Config/db");
const cors = require("cors");
const generateDummyDataa = require("./helpers/generateDummyDataa");
const { addData } = require("./helper");

const startServer = async () => {
  try {
    await connectDB(); // Ensure the connection is established

    addData();

    app.use(bodyParser.json());
    app.use(cors());

    app.use("/api", familyRoutes);

    // Start server
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    // Generate dummy data
    // await generateDummyDataa();
  } catch (error) {
    console.error("Error starting server:", error.message);
  }
};

startServer();
