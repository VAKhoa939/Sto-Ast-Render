const { auth } = require("../firebase-admin-setup");

module.exports = {
  // Update user information
  updateUser: async (uid, newEmail, newPassword) => {
    if (!newPassword) {
      return await auth.updateUser(uid, {
        email: newEmail,
      });
    } else {
      return await auth.updateUser(uid, {
        email: newEmail,
        password: newPassword,
      });
    }
  },
};
