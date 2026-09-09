require("dotenv").config();

const resend = require("./config/resend");

async function testEmail() {
    try {
        const { data, error } = await resend.emails.send({
            from: "Atlas Property Group <onboarding@resend.dev>",
            to: process.env.COMPANY_EMAIL,
            subject: "Atlas Property Test Email",
            html: `
                <h2>🎉 Congratulations!</h2>
                <p>Your Resend integration is working successfully.</p>
                <p>This email was sent from your Atlas backend.</p>
            `
        });

        if (error) {
            console.error("Resend Error:", error);
            return;
        }

        console.log("Email sent successfully!");
        console.log(data);

    } catch (err) {
        console.error("Test failed:", err);
    }
}

testEmail();