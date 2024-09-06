const express = require('express');
const router = express.Router();
const createUser = require('../Controllers/controller.createUser');

// Add CreateUser
router.post('/createUser/add', async (req, res) => {
    try {
        const createUserForm = req.body;
        const result = await createUser.addCreateUser(createUserForm);
        return res.json({
            message: "User Created Successfully",
            status: true,
            data: result
        });
    } catch (err) {
        console.error(err);
        return res.json({
            message: err.message,
            status: false
        });
    }
});

// Get All CreateUser forms
router.get('/createUser/get_all', async (req, res) => {
    try {
        const result = await createUser.getAllCreateUser();
        if (result.length > 0) {
            return res.json({
                message: "Data Exist",
                status: true,
                data: result
            });
        } else {
            return res.json({
                message: "No User's Data exist",
                status: false,
                data: []
            });
        }
    } catch (err) {
        console.error(err);
        return res.json({
            message: "Error in Connecting to DB",
            status: false
        });
    }
});

// Update CreateUser form
router.patch('/createUser/update/:createUserId', async (req, res) => {
    try {
        const createUserForm = req.body;
        const createUserId = req.params.createUserId;
        const result = await createUser.updateCreateUser(createUserId, createUserForm);
        return res.json({
            message: "User Updated successfully",
            status: true,
            data: result
        });
    } catch (err) {
        console.error(err);
        return res.json({
            message: "Error in Connecting to DB",
            status: false
        });
    }
});

// Remove CreateUser form
router.delete('/createUser/remove/:createUserId', async (req, res) => {
    try {
        const createUserId = req.params.createUserId;
        const result = await createUser.removeById(createUserId);
        if (result.deletedCount > 0) {
            return res.json({
                message: "User's Data removed Successfully",
                status: true
            });
        } else {
            return res.json({
                message: "User  not found",
                status: false
            });
        }
    } catch (err) {
        console.error(err);
        return res.json({
            message: "Error in Connecting to DB",
            status: false
        });
    }
});

// User login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await createUser.loginUser(email, password);
        return res.json({
            message: "Login successfully",
            status: true,
            data: user
        });
    } catch (err) {
        console.error(err);
        return res.json({
            message: err.message,
            status: false
        });
    }
});

// Request password reset
router.post('/forget_password', async (req, res) => {
    try {
        const { email } = req.body;
        const host = req.headers.host; // Pass the host to generateResetToken
        const result = await createUser.generateResetToken(email, host);
        return res.json({
            message: result.message,
            status: true
        });
    } catch (err) {
        console.error(err);
        return res.json({
            message: err.message,
            status: false
        });
    }
});

// Reset password
router.post('/createUser/reset_password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;
        const result = await createUser.resetPassword(token, newPassword);
        return res.json({
            message: result.message,
            status: true
        });
    } catch (err) {
        console.error(err);
        return res.json({
            message: err.message,
            status: false
        });
    }
});

module.exports = router;
