const supabase = require("../config/supabase");
const resend = require("../config/resend");

// ============================================================
// SAVE CONTACT MESSAGE
// ============================================================

async function saveContactMessage({
    userId,
    propertyId,
    propertyAddress,
    agentId,
    name,
    email,
    phone,
    subject,
    message
}) {
    const { data, error } = await supabase
        .from("contact_messages")
        .insert({
            user_id: userId || null,
            property_id: propertyId || null,
            property_address: propertyAddress || null,
            agent_id: agentId || null,
            name,
            email,
            phone: phone || null,
            subject: subject || null,
            message,
            status: "Pending"
        })
        .select()
        .single();

    if (error) {
        console.error("Supabase saveContactMessage error:", error);
        throw error;
    }

    return data;
}

// ============================================================
// GET USER'S CONTACT MESSAGES
// ============================================================

async function getUserMessages(userId) {

    if (!userId) return [];

    const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Supabase getUserMessages error:", error);
        throw error;
    }

    return data.map(row => ({
        id: row.id,
        propertyId: row.property_id,
        propertyAddress: row.property_address,
        agentId: row.agent_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        subject: row.subject,
        message: row.message,
        status: row.status,
        createdAt: row.created_at
    }));
}

// ============================================================
// NOTIFICATIONS
// ============================================================

async function createNotification() {
    return null;
}

// ============================================================
// SEND EMAIL (UPDATED)
// ============================================================

async function sendEmail({
    to,
    subject,
    text,
    html
}) {

    if (!to) {
        throw new Error("Email recipient is not configured.");
    }

    try {

        const { data, error } = await resend.emails.send({

            // YOUR VERIFIED DOMAIN
            from: "Atlas Property Group <contact@atlaspropertyglobal.com>",

            to,

            subject,

            text,

            html,

            // Replies go to your business inbox
            replyTo: "contact@atlaspropertyglobal.com"

        });

        if (error) {
            console.error("Resend Error:", error);
            throw new Error(error.message || "Resend failed to send email.");
        }

        return data;

    } catch (err) {

        console.error("Email sending failed:", err);
        throw err;

    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    saveContactMessage,
    getUserMessages,
    createNotification,
    sendEmail
};