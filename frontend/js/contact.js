/**
 * Atlas Property Group - Contact Engine
 * General Contact Advisors Form
 */

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("main-contact-form");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        const status = document.getElementById("form-status");
        const btn = form.querySelector('button[type="submit"]');

        const fname =
            document.getElementById("fname")?.value.trim();

        const lname =
            document.getElementById("lname")?.value.trim();

        const email =
            document.getElementById("email")?.value.trim();

        // NEW PHONE FIELD
        const phone = window.iti
    ? window.iti.getNumber()
    : document.getElementById("phone")?.value.trim();

        const subject =
            document.getElementById("subject")?.value.trim();

        const message =
            document.getElementById("message")?.value.trim();

        const name = `${fname} ${lname}`.trim();

        // ============================================
        // VALIDATION
        // ============================================

        if (
            !fname ||
            !lname ||
            !email ||
            !phone ||
            !subject ||
            !message ||
            message.length < 10
        ) {
            status.style.display = "block";
            status.style.color = "#dc2626";
            status.textContent =
                message && message.length < 10
                    ? "Message must be at least 10 characters long."
                    : "Please complete all required fields.";

            return;
        }

        // ============================================
        // SUBMITTING STATE
        // ============================================

        btn.innerText = "Transmitting...";
        btn.disabled = true;

        status.style.display = "none";

        try {

            const response = await fetch(
                "http://localhost:5000/api/contact/inquiry",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        name,
                        email,
                        phone,     // Added phone
                        subject,
                        message
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "Failed to send inquiry."
                );
            }

            // ========================================
            // SUCCESS
            // ========================================

            status.style.display = "block";
            status.style.color = "#0B3D91";

            status.innerHTML =
                '<i class="fas fa-check-circle"></i> Inquiry received. An advisor will contact you within 12 business hours.';

            form.reset();

        } catch (error) {

            console.error(
                "Contact form error:",
                error
            );

            // ========================================
            // ERROR
            // ========================================

            status.style.display = "block";
            status.style.color = "#dc2626";

            status.textContent =
                error.message ||
                "Unable to send your inquiry. Please try again.";

        } finally {

            btn.innerText = "Submit Inquiry";
            btn.disabled = false;

        }

    });

});