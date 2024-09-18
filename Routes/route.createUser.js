const express = require("express");
const router = express.Router();
const createUser = require("../Controllers/controller.createUser");
const User = require("../Models/model.createUser");

// Add CreateUser
router.post("/createUser/add", async (req, res) => {
  try {
    const createUserForm = req.body;
    const result = await createUser.addCreateUser(createUserForm);
    return res.json({
      message: "User Created Successfully",
      status: true,
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.json({
      message: err.message,
      status: false,
    });
  }
});

// Get All CreateUser forms
router.get("/createUser/get_all", async (req, res) => {
  try {
    const result = await createUser.getAllCreateUser();
    if (result.length > 0) {
      return res.json({
        message: "Data Exist",
        status: true,
        data: result,
      });
    } else {
      return res.json({
        message: "No User's Data exist",
        status: false,
        data: [],
      });
    }
  } catch (err) {
    console.error(err);
    return res.json({
      message: "Error in Connecting to DB",
      status: false,
    });
  }
});

// Update CreateUser form
router.patch("/createUser/update/:createUserId", async (req, res) => {
  try {
    const createUserForm = req.body;
    const createUserId = req.params.createUserId;
    const result = await createUser.updateCreateUser(
      createUserId,
      createUserForm
    );
    return res.json({
      message: "User Updated successfully",
      status: true,
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.json({
      message: "Error in Connecting to DB",
      status: false,
    });
  }
});

// Remove CreateUser form
router.delete("/createUser/remove/:createUserId", async (req, res) => {
  try {
    const createUserId = req.params.createUserId;
    const result = await createUser.removeById(createUserId);
    if (result.deletedCount > 0) {
      return res.json({
        message: "User's Data removed Successfully",
        status: true,
      });
    } else {
      return res.json({
        message: "User  not found",
        status: false,
      });
    }
  } catch (err) {
    console.error(err);
    return res.json({
      message: "Error in Connecting to DB",
      status: false,
    });
  }
});

// User login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await createUser.loginUser(email, password);

    return res.status(200).json({
      message: "Login successfully",
      status: true,
      data: user,
    });
  } catch (err) {
    console.error(err);

    return res.status(err.statusCode || 500).json({
      message: err.message,
      status: false,
    });
  }
});

// Request password reset
router.post("/forget_password", async (req, res) => {
  try {
    const { email } = req.body;
    const host = req.headers.host; // Pass the host to generateResetToken
    const result = await createUser.generateResetToken(email, host);
    return res.json({
      message: result.message,
      status: true,
    });
  } catch (err) {
    console.error(err);
    return res.json({
      message: err.message,
      status: false,
    });
  }
});

// Reset password
router.post("/createUser/reset_password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    const result = await createUser.resetPassword(token, newPassword);
    return res.json({
      message: result.message,
      status: true,
    });
  } catch (err) {
    console.error(err);
    return res.json({
      message: err.message,
      status: false,
    });
  }
});

router.post("/update_password", async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    // Validate input
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({
        message: "User ID, old password, and new password are required",
        status: false,
      });
    }
    // Check if the old password is correct and update password
    const result = await createUser.updatePassword(
      userId,
      oldPassword,
      newPassword
    );
    return res.json({
      message: result.message,
      status: true,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: err.message,
      status: false,
    });
  }
});

router.post("/update_profile", async (req, res) => {
  try {
    const { userID, contact, fullName, status, isAdmin } = req.body;

    // Validate required fields
    if (!userID) {
      return res.status(400).json({
        message: "userID is required.",
        status: false,
      });
    }

    // Fetch user from the database
    const user = await User.findById(userID);
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        status: false,
      });
    }

    // Determine the value for isBlocked based on the status
    const isBlocked = status === "blocked";

    // Update user fields
    user.contact = contact || user.contact;
    user.fullName = fullName || user.fullName;
    user.status = status || user.status;
    user.isAdmin = isAdmin !== undefined ? isAdmin : user.isAdmin;
    user.isBlocked = isBlocked;

    // Save the updated user
    await user.save();

    res.status(200).json({
      message: "User profile updated successfully.",
      status: true,
      user,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: err.message,
      status: false,
    });
  }
});

router.put("/updatestatus", async (req, res) => {
  try {
    const { userID, status } = req.body;

    if (!userID || !status) {
      return res
        .status(400)
        .json({ message: "User ID and status are required" });
    }

    console.log(userID);

    const user = await User.findById(userID);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = status;

    if (status === "active") {
      user.isBlocked = false;
    } else {
      user.isBlocked = true;
    }

    await user.save();

    return res
      .status(200)
      .json({ message: "User status updated successfully", user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});

module.exports = router;
