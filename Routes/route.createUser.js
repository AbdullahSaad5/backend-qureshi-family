const express = require('express');
const router = express.Router();
const createUser = require('../Controllers/controller.createUser');

// Add CreateUser
router.post('/createUser/add', async (req, res) => {
    try {
        const createUserForm = req.body;
        const result = await createUser.addCreateUser(createUserForm);
        return res.json({
            message: "Form Submitted Successfully, Our Representative Will Get In Touch With You In Few Hours",
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

// Get All CreateUser forms
router.get('/createUser/get_all', async (req, res) => {
    try {
        const result = await createUser.getAllCreateUser();
        if (result.length > 0) {
            return res.json({
                message: "CreateUser forms exist",
                status: true,
                data: result
            });
        } else {
            return res.json({
                message: "No CreateUser forms exist",
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
            message: "CreateUser form updated successfully",
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

router.delete('/createUser/remove/:createUserId', async (req, res) => {
    try {
        const createUserId = req.params.createUserId;
        const result = await createUser.removeById(createUserId); // Correct function name here
        if (result.deletedCount > 0) {
            return res.json({
                message: "CreateUser form data removed",
                status: true
            });
        } else {
            return res.json({
                message: "CreateUser form not found",
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
module.exports = router;
