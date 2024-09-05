const CreateUser = require('../Models/model.createUser');

// Get All CreateUser
module.exports.getAllCreateUser = async () => {
    try {
        const users = await CreateUser.find({ state: { $ne: 'deleted' } }).sort({ date_time: -1 });
        return users; // Return the results
    } catch (err) {
        throw new Error('Error fetching users: ' + err.message); // Handle the error appropriately
    }
}

// Add CreateUser
module.exports.addCreateUser = async (createUserForm) => {
    try {
        const newUser = await CreateUser.create(createUserForm);
        return newUser; // Return the created user
    } catch (err) {
        throw new Error('Error creating user: ' + err.message); // Handle the error appropriately
    }
}

// Update CreateUser
module.exports.updateCreateUser = async (createUserId, createUserForm) => {
    try {
        const query = { _id: createUserId };
        const updatedUser = await CreateUser.findOneAndUpdate(query, createUserForm, { new: true });
        return updatedUser; // Return the updated user
    } catch (err) {
        throw new Error('Error updating user: ' + err.message); // Handle the error appropriately
    }
}

// Delete CreateUser
module.exports.removeById = async (id) => {
    try {
        const query = { _id: id };
        const result = await CreateUser.deleteOne(query); // Use deleteOne instead of remove
        return result; // Return the result of the deletion
    } catch (err) {
        throw new Error('Error deleting user: ' + err.message); // Handle the error appropriately
    }
}