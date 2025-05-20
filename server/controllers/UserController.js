const { updateUser } = require("../DAOs/UserDAO");

module.exports = {
  updateUser: async (req, res) => {
    const { newEmail, newPassword } = req.body;
    const { decodedToken } = req;

    try {
      const uid = decodedToken.uid;

      await updateUser(uid, newEmail, newPassword);

      res.status(200).json({ message: "User updated" });
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ error: "Failed to update user" });
    }
  },
};
