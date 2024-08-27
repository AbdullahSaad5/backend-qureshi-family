const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const familyRoutes = require("./Routes/familyRoutes");
const app = express();
const connectDB  =  require("./Config/db");
const cors = require("cors");

// Connect to the database
connectDB();

// Middleware
app.use(bodyParser.json());
app.use(cors()); 

// Routes
app.use("/api", familyRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
