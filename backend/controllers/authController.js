const authService = require("../services/authService");

async function signUp(req, res) {

    try {

        const {
            email,
            password,
            fullName
        } = req.body;

        const data = await authService.signUp(
            email,
            password,
            fullName
        );

        res.status(201).json({
            success: true,
            data
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

}

async function login(req, res) {

    try {

        const {
            email,
            password
        } = req.body;

        const data = await authService.login(
            email,
            password
        );

        res.json({
            success: true,
            data
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

}

async function logout(req, res) {

    try {

        await authService.logout();

        res.json({

            success: true,
            data: null,
            message: "Logged out"

        });

    } catch (err) {

        res.status(400).json({

            success: false,
            message: err.message

        });

    }

}

async function resetPassword(req, res) {

    try {

        const { email } = req.body || {};

        const data = await authService.resetPassword(email);

        res.json({
            success: true,
            data,
            message: "If that email exists, a reset link has been sent."
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

}

async function updatePassword(req, res) {

    try {

        const { accessToken, newPassword } = req.body || {};

        const data = await authService.updatePassword(accessToken, newPassword);

        res.json({
            success: true,
            data,
            message: "Password updated successfully."
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

}

module.exports = {

    signUp,
    login,
    logout,
    resetPassword,
    updatePassword

};