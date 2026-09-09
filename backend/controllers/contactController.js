const contactService = require("../services/contactService");


async function sendMessage(req, res) {
    try {
        const userId = req.user?.id || null;

        const {
            propertyId,
            propertyTitle,
            propertyAddress,
            agentId,
            agentName,
            agentEmail,
            name,
            email,
            phone,
            subject,
            message
        } = req.body;

        console.log("==========================================");
        console.log("PROPERTY CONTACT REQUEST");
        console.log("==========================================");
        console.log({
            propertyId,
            propertyTitle,
            propertyAddress,
            agentId,
            agentName,
            agentEmail,
            name,
            email,
            phone,
            subject,
            message
        });

        if (!propertyId) {
            return res.status(400).json({
                success: false,
                error: "Property ID is required."
            });
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                error: "Name is required."
            });
        }

        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Email is required."
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Message is required."
            });
        }

        const sanitizedName = String(name).trim();
        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedPhone = String(phone || "").trim();

        const sanitizedPropertyId = String(propertyId).trim();
        const sanitizedPropertyTitle = String(propertyTitle || "").trim();
        const sanitizedPropertyAddress = String(propertyAddress || "").trim();

        const sanitizedAgentId = String(agentId || "").trim();
        const sanitizedAgentName = String(agentName || "Atlas Property Group").trim();
        const sanitizedAgentEmail = String(agentEmail || "").trim().toLowerCase();

        const sanitizedSubject = String(
            subject ||
            `Property enquiry - ${
                sanitizedPropertyTitle ||
                sanitizedPropertyAddress ||
                sanitizedPropertyId
            }`
        ).trim();

        const sanitizedMessage = String(message).trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                error: "Invalid email address."
            });
        }

        if (
            normalizedPhone &&
            !/^\+?[0-9\-().\s]{7,25}$/.test(normalizedPhone)
        ) {
            return res.status(400).json({
                success: false,
                error: "Invalid phone number."
            });
        }

        if (sanitizedMessage.length < 10) {
            return res.status(400).json({
                success: false,
                error: "Message must be at least 10 characters long."
            });
        }

        let savedData = null;

        try {
            savedData = await contactService.saveContactMessage({
                userId,
                propertyId: sanitizedPropertyId,
                propertyAddress: sanitizedPropertyAddress,
                agentId: sanitizedAgentId || null,
                name: sanitizedName,
                email: normalizedEmail,
                phone: normalizedPhone,
                subject: sanitizedSubject,
                message: sanitizedMessage
            });
        } catch (dbError) {
            console.error("Supabase contact save failed:", dbError.message);
        }

        try {
            await contactService.sendEmail({
                to: process.env.COMPANY_EMAIL,
                subject: `New Property Inquiry - ${
                    sanitizedPropertyTitle ||
                    sanitizedPropertyAddress ||
                    sanitizedPropertyId
                }`,
                html: `
                <h2>New Property Inquiry</h2>
                <p><strong>Property:</strong> ${sanitizedPropertyTitle}</p>
                <p><strong>Address:</strong> ${sanitizedPropertyAddress}</p>
                <hr>
                <p><strong>Name:</strong> ${sanitizedName}</p>
                <p><strong>Email:</strong> ${normalizedEmail}</p>
                <p><strong>Phone:</strong> ${normalizedPhone || "Not provided"}</p>
                <p><strong>Subject:</strong> ${sanitizedSubject}</p>
                <p>${sanitizedMessage}</p>
                `,
                text: `
New Property Inquiry

Name: ${sanitizedName}
Email: ${normalizedEmail}
Phone: ${normalizedPhone}

Subject: ${sanitizedSubject}

${sanitizedMessage}
                `
            });
        } catch (emailError) {
            console.error("Atlas email failed:", emailError.message);
        }

        try {
            await contactService.sendEmail({
                to: normalizedEmail,
                subject: "Your property enquiry has been received - Atlas Property Group",
                text: `Hi ${sanitizedName},

Thank you for contacting Atlas Property Group.

Our team has received your enquiry and will contact you shortly.

Thank you,
Atlas Property Group`
            });
        } catch (emailError) {
            console.error("Customer confirmation email failed:", emailError.message);
        }

        return res.status(201).json({
            success: true,
            data: savedData || {
                propertyId: sanitizedPropertyId,
                propertyTitle: sanitizedPropertyTitle,
                propertyAddress: sanitizedPropertyAddress,
                name: sanitizedName,
                email: normalizedEmail
            },
            message: "Your enquiry was sent successfully."
        });

    } catch (err) {

        console.error("CONTACT SEND FAILED", err);

        return res.status(500).json({
            success: false,
            error: err.message || "Unable to send enquiry."
        });
    }
}


/**
 * GENERAL CONTACT / ADVISORS INQUIRY
 * POST /api/contact/inquiry
 */
async function sendGeneralInquiry(req, res) {

    try {

        const {
            name,
            email,
            phone,      // NEW
            subject,
            message
        } = req.body;

        console.log("===== GENERAL CONTACT INQUIRY =====");
        console.log(req.body);

        if (!name) {
            return res.status(400).json({
                success: false,
                error: "Name is required."
            });
        }

        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Email is required."
            });
        }

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: "Phone number is required."
            });
        }

        if (!subject) {
            return res.status(400).json({
                success: false,
                error: "Subject is required."
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Message is required."
            });
        }

        const sanitizedName = String(name).trim();
        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedPhone = String(phone).trim();
        const sanitizedSubject = String(subject).trim();
        const sanitizedMessage = String(message).trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                error: "Invalid email address."
            });
        }

        if (!/^\+?[0-9\-().\s]{7,25}$/.test(normalizedPhone)) {
            return res.status(400).json({
                success: false,
                error: "Invalid phone number."
            });
        }

        if (sanitizedMessage.length < 10) {
            return res.status(400).json({
                success: false,
                error: "Message must be at least 10 characters long."
            });
        }

        try {
            await contactService.saveContactMessage({
                userId: req.user?.id || null,
                propertyId: null,
                propertyAddress: null,
                agentId: null,
                name: sanitizedName,
                email: normalizedEmail,
                phone: normalizedPhone,      // NEW
                subject: sanitizedSubject,
                message: sanitizedMessage
            });
        } catch (dbError) {
            console.error("Supabase inquiry save failed:", dbError.message);
        }

        let companyEmailSent = false;

        try {
            await contactService.sendEmail({
                to: process.env.COMPANY_EMAIL,
                subject: `New Atlas Inquiry - ${sanitizedSubject}`,
                html: `
                <div style="font-family:Arial,sans-serif;max-width:700px;padding:24px;">
                    <h2>New Atlas Property Group Inquiry</h2>

                    <p><strong>Name:</strong> ${sanitizedName}</p>
                    <p><strong>Email:</strong> ${normalizedEmail}</p>
                    <p><strong>Phone:</strong> ${normalizedPhone}</p>
                    <p><strong>Subject:</strong> ${sanitizedSubject}</p>

                    <hr>

                    <h3>Message</h3>

                    <p style="white-space:pre-line;line-height:1.6;">
                        ${sanitizedMessage}
                    </p>
                </div>
                `,
                text: `
New Atlas Property Group Inquiry

Name: ${sanitizedName}
Email: ${normalizedEmail}
Phone: ${normalizedPhone}
Subject: ${sanitizedSubject}

Message:
${sanitizedMessage}
                `
            });

            companyEmailSent = true;

        } catch (emailError) {
            console.error("Company notification email failed:", emailError.message);
        }

        try {
            await contactService.sendEmail({
                to: normalizedEmail,
                subject: "We received your inquiry - Atlas Property Group",
                text: `Hi ${sanitizedName},

Thank you for contacting Atlas Property Group.

Phone: ${normalizedPhone}

We have received your inquiry regarding:

${sanitizedSubject}

One of our advisors will contact you shortly.

Thank you,
Atlas Property Group`
            });
        } catch (emailError) {
            console.error("Customer confirmation email failed:", emailError.message);
        }

        return res.status(201).json({
            success: true,
            message: companyEmailSent
                ? "Inquiry sent successfully."
                : "Inquiry received successfully."
        });

    } catch (err) {

        console.error("General contact inquiry failed:", err);

        return res.status(500).json({
            success: false,
            error: err.message || "Unable to send inquiry."
        });
    }
}


async function getMessages(req, res) {

    try {

        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        const messages =
            await contactService.getUserMessages(userId);

        return res.json({
            success: true,
            data: messages
        });

    } catch (err) {

        console.error("Get messages failed:", err);

        return res.status(500).json({
            success: false,
            message: err.message || "Unable to retrieve messages."
        });
    }
}


module.exports = {
    sendMessage,
    sendGeneralInquiry,
    getMessages
};