const CreateUser = require("../Models/model.createUser");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const saltRounds = 10; // Adjust as needed

// Configure Nodemailer for sending emails
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Get All CreateUser
module.exports.getAllCreateUser = async () => {
  try {
    const users = await CreateUser.find({ state: { $ne: "deleted" } }).sort({
      date_time: -1,
    });
    return users;
  } catch (err) {
    throw new Error("Error fetching users: " + err.message);
  }
};

// Check if email exists
module.exports.getUserByEmail = async (email) => {
  try {
    return await CreateUser.findOne({ email: email });
  } catch (err) {
    throw new Error("Error fetching user by email: " + err.message);
  }
};

// Delete CreateUser
module.exports.removeById = async (id) => {
  try {
    const query = { _id: id };
    const result = await CreateUser.deleteOne(query);
    return result;
  } catch (err) {
    throw new Error("Error deleting user: " + err.message);
  }
};

// Generate password reset token
module.exports.generateResetToken = async (email, host) => {
  try {
    const user = await module.exports.getUserByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // Send reset email
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Password Reset Request",
      text:
        `You are receiving this email because you requested a password reset for your account.\n\n` +
        `Please click on the following link, or paste it into your browser, to complete the process:\n\n` +
        `https://qureshi-family.vercel.app/NewPassword/${resetToken}\n\n` +
        `If you did not request this, please ignore this email.\n`,
    };

    await transporter.sendMail(mailOptions);

    return { message: "Reset token generated and email sent" };
  } catch (err) {
    throw new Error("Error generating reset token: " + err.message);
  }
};

module.exports.resetPassword = async (resetToken, newPassword) => {
  try {
    // Find user by the reset token and check if it's not expired
    const user = await CreateUser.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new Error("Password reset token is invalid or has expired");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    user.password = hashedPassword; // Update the password
    user.resetPasswordToken = undefined; // Clear reset token
    user.resetPasswordExpires = undefined; // Clear expiration

    // Save the updated user
    await user.save();
    return { message: "Password has been reset" };
  } catch (err) {
    throw new Error("Error resetting password: " + err.message);
  }
};

// Add CreateUser
module.exports.addCreateUser = async (createUserForm) => {
  try {
    const existingUser = await CreateUser.findOne({
      email: createUserForm.email,
    });
    if (existingUser) {
      const error = new Error("Email already exists");
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(
      createUserForm.password,
      saltRounds
    );
    createUserForm.password = hashedPassword;

    const newUser = await CreateUser.create(createUserForm);

    const { password, ...userWithoutPassword } = newUser.toObject();
    return userWithoutPassword;
  } catch (err) {
    throw new Error("Error creating user: " + err.message);
  }
};

// Update CreateUser
module.exports.updateCreateUser = async (createUserId, createUserForm) => {
  try {
    if (createUserForm.password) {
      const hashedPassword = await bcrypt.hash(
        createUserForm.password,
        saltRounds
      );
      createUserForm.password = hashedPassword;
    }
    const query = { _id: createUserId };
    const updatedUser = await CreateUser.findOneAndUpdate(
      query,
      createUserForm,
      { new: true }
    );
    return updatedUser;
  } catch (err) {
    throw new Error("" + err.message);
  }
};

// Login CreateUser
module.exports.loginUser = async (email, password) => {
  try {
    const user = await CreateUser.findOne({ email });
    if (!user) {
      const error = new Error("Incorrect email");
      error.statusCode = 400;
      throw error;
    }
    console.log(user);

    if (user.isBlocked) {
      const error = new Error("Your profile is blocked");
      error.statusCode = 403;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error("Invalid password");
      error.statusCode = 401;
      throw error;
    }

    const { password: _, ...userWithoutPassword } = user.toObject();

    return userWithoutPassword;
  } catch (err) {
    err.message = "" + err.message;
    throw err;
  }
};

module.exports.updatePassword = async (userId, oldPassword, newPassword) => {
  try {
    // Find the user by ID
    const user = await CreateUser.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    // Compare the old password with the hashed password in the database
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new Error("Old password is incorrect");
    }
    // Hash the new password and update it
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    user.password = hashedPassword;
    await user.save();
    return { message: "Password updated successfully" };
  } catch (err) {
    throw new Error("Error updating password: " + err.message);
  }
};

module.exports.updateProfile = async (userID, updates) => {
  try {
    // Default values for isBlocked based on isActive
    if (updates.isActive === "active") {
      updates.isBlocked = false;
    } else if (updates.isActive === "blocked") {
      updates.isBlocked = true;
    }

    // Use findByIdAndUpdate to update the user document
    const user = await CreateUser.findByIdAndUpdate(userID, updates, {
      new: true, // Return the updated document
      runValidators: true, // Run schema validation
    });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    return { message: "Profile updated successfully", data: user };
  } catch (err) {
    err.message = "" + err.message;
    throw err;
  }
};
