const supabase = require("../config/supabase");

async function signUp(email, password, fullName) {

    const { data, error } = await supabase.auth.signUp({

        email,
        password

    });

    if (error) throw error;

    if (data.user) {

        await supabase
            .from("profiles")
            .insert({

                id: data.user.id,
                full_name: fullName

            });

    }

    return data;

}

async function login(email, password) {

    const { data, error } =
        await supabase.auth.signInWithPassword({

            email,
            password

        });

    if (error) throw error;

    return data;

}

async function logout() {

    await supabase.auth.signOut();

}

async function resetPassword(email) {

    if (!email) {
        throw new Error("Email is required.");
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password.html`
    });

    if (error) throw error;

    return data;

}

async function updatePassword(accessToken, newPassword) {

    if (!accessToken || !newPassword) {
        throw new Error("A valid reset token and password are required.");
    }

    const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: ""
    });

    if (error) throw error;

    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (updateError) throw updateError;

    return updateData;

}

module.exports = {

    signUp,
    login,
    logout,
    resetPassword,
    updatePassword

};