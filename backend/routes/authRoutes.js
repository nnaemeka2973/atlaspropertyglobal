const express = require("express");

const router = express.Router();

const {

    signUp,
    login,
    logout,
    resetPassword,
    updatePassword

} = require("../controllers/authController");

router.post("/signup", signUp);

router.post("/login", login);

router.post("/logout", logout);
router.post("/reset-password", resetPassword);
router.post("/update-password", updatePassword);

module.exports = router;