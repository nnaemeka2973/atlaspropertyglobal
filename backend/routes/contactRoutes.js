const express = require("express");

const router = express.Router();

const requireAuth = require("../middleware/.auth");

const {
    sendMessage,
    sendGeneralInquiry,
    getMessages
} = require("../controllers/contactController");


// ============================================================
// PROPERTY DETAILS → CONTACT AGENT
// POST /api/contact
// ============================================================
// Requires:
// propertyId
// agentId
// name
// email
// subject
// message
//
router.post("/", sendMessage);


// ============================================================
// CONTACT ADVISORS → GENERAL INQUIRY
// POST /api/contact/inquiry
// ============================================================
// Does NOT require:
// propertyId
// agentId
//
router.post("/inquiry", sendGeneralInquiry);


// ============================================================
// GET USER'S CONTACT MESSAGES
// GET /api/contact
// ============================================================
// Only logged-in users can view their own messages.
//
router.get("/", requireAuth, getMessages);


module.exports = router;