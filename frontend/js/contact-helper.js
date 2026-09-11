function getAgentPlaceholder(agent) {
    return {
        photo: agent.photo || agent.image || 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80',
        fullName: agent.name || agent.agent_name || agent.office_name || 'Listing Agent',
        agency: agent.brokerage || agent.company || 'Atlas Property Group',
        phone: agent.phone || agent.phones?.[0]?.number || '+1 (800) 555-0123',
        email: agent.email || `hello@atlaspropertygroup.com`,
        experience: agent.experience ?? 8,
        languages: Array.isArray(agent.languages) && agent.languages.length ? agent.languages : ['English', 'Spanish'],
        responseTime: agent.response_time || '1-3 hours',
        verified: agent.verified ?? true,
        whatsapp: agent.whatsapp || agent.phone || '+1 (800) 555-0123',
        agentId: agent.id || agent.agent_id || agent.office_id || "atlas-agent-001"
    };
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[character]));
}

function renderContactAgentCard(agent, property, getPropertyIdFn, escFn) {
    const escape = escFn || escapeHtml;
//     console.log("===== AGENT OBJECT =====");
// console.log(agent);
    const safeAgent = getAgentPlaceholder(agent);
    const address = property?.location?.address?.line || property?.address || 'Property address unavailable';
    const propertyId = String(getPropertyIdFn(property));

    return `
        <section class="pd-card pd-agent-card" aria-labelledby="contact-agent-title">
            <div class="pd-agent-card-top">
                <img src="${safeAgent.photo}" alt="${escape(safeAgent.fullName)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80'" />
                <div>
                    <p class="section-label">Contact Listing Agent</p>
                    <h2 id="contact-agent-title">${escape(safeAgent.fullName)}</h2>
                    <p class="pd-muted">${escape(safeAgent.agency)}</p>
                </div>
            </div>
            <div class="pd-agent-meta">
                <div><span>Phone</span><a href="tel:${encodeURIComponent(safeAgent.phone)}">${escape(safeAgent.phone)}</a></div>
                <div><span>Email</span><a href="mailto:${encodeURIComponent(safeAgent.email)}">${escape(safeAgent.email)}</a></div>
                <div><span>Experience</span><strong>${escape(safeAgent.experience)} years</strong></div>
                <div><span>Languages</span><strong>${escape(safeAgent.languages.join(', '))}</strong></div>
                <div><span>Response time</span><strong>${escape(safeAgent.responseTime)}</strong></div>
                <div><span>Status</span><strong>${safeAgent.verified ? 'Verified Agent' : 'Verified soon'}</strong></div>
            </div>
            <div class="pd-agent-actions">
                <a class="pd-button pd-button-secondary" href="tel:${encodeURIComponent(safeAgent.phone)}">Call Agent</a>
                <a class="pd-button pd-button-secondary" href="mailto:${encodeURIComponent(safeAgent.email)}">Email Agent</a>
                <a class="pd-button pd-button-secondary" href="https://wa.me/${encodeURIComponent(safeAgent.whatsapp.replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener noreferrer">WhatsApp Agent</a>
            </div>
            <form id="contact-agent-form" class="pd-form pd-contact-agent-form" aria-label="Contact the listing agent">
                <input type="hidden" name="propertyId" value="${escape(propertyId)}" />
                <input type="hidden" name="propertyAddress" value="${escape(address)}" />
                <input type="hidden" name="agentId" value="${escape(safeAgent.agentId)}" />
                <input type="hidden" name="userId" value="" />
                <label for="contact-name">Full Name<span aria-hidden="true">*</span><input id="contact-name" name="name" type="text" required autocomplete="name" /></label>
                <label for="contact-email">Email<span aria-hidden="true">*</span><input id="contact-email" name="email" type="email" required autocomplete="email" /></label>
                <label for="contact-phone">Phone<span aria-hidden="true">*</span>
                    <span class="phone-input-group">
                        <select name="phoneCountryCode" aria-label="Country calling code">
                            <option value="+1">US/Canada +1</option>
                            <option value="+44">UK +44</option>
                            <option value="+33">France +33</option>
                            <option value="+34">Spain +34</option>
                            <option value="+49">Germany +49</option>
                            <option value="+52">Mexico +52</option>
                            <option value="+55">Brazil +55</option>
                            <option value="+61">Australia +61</option>
                            <option value="+81">Japan +81</option>
                            <option value="+86">China +86</option>
                            <option value="+91">India +91</option>
                            <option value="+971">UAE +971</option>
                        </select>
                        <input id="contact-phone" name="phone" type="tel" required autocomplete="tel" inputmode="tel" placeholder="Phone number" />
                    </span>
                </label>
                <label for="contact-subject">Subject<span aria-hidden="true">*</span><input id="contact-subject" name="subject" type="text" required /></label>
                <label for="contact-message">Message<span aria-hidden="true">*</span><textarea id="contact-message" name="message" rows="5" required>Hi ${escape(safeAgent.fullName)}, I am interested in ${escape(property?.title || property?.address || 'this property')}.</textarea></label>
                <button type="submit" class="pd-primary">Send Message</button>
                <p id="contact-feedback" class="pd-status" aria-live="polite"></p>
            </form>
        </section>
    `;
}

function bindContactAgentForm(property) {
    const form = document.getElementById('contact-agent-form');
    const feedback = document.getElementById('contact-feedback');
    if (!form || !feedback) return;

    const setFeedback = (message, isError = false) => {
        feedback.textContent = message;
        feedback.style.color = isError ? '#c84545' : 'var(--pd-gold)';
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setFeedback('Sending your message...');

        const formData = new FormData(form);
        const payload = {
            propertyId: formData.get('propertyId'),
            propertyAddress: formData.get('propertyAddress'),
            agentId: formData.get('agentId'),
            name: formData.get('name')?.trim(),
            email: formData.get('email')?.trim(),
            phone: `${formData.get('phoneCountryCode') || '+1'} ${formData.get('phone')?.trim() || ''}`.trim(),
            subject: formData.get('subject')?.trim(),
            message: formData.get('message')?.trim()
        };

        console.log("CONTACT PAYLOAD");
console.log(payload);

        if (!payload.name || !payload.email || !payload.phone || !payload.subject || !payload.message) {
            setFeedback('Please complete all required fields.', true);
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
            setFeedback('Please enter a valid email address.', true);
            return;
        }

        if (!/^\+?[0-9\-().\s]{7,25}$/.test(payload.phone)) {
            setFeedback('Please enter a valid phone number.', true);
            return;
        }

        if (payload.message.length < 10) {
            setFeedback('Message must be at least 10 characters long.', true);
            return;
        }

        const user = JSON.parse(localStorage.getItem('atlas_user')) || {};
        payload.userId = user.id || '';

        try {
            await sendContactMessage(payload);
            setFeedback('Your message has been sent. The agent will reply soon.');
            form.reset();
        } catch (error) {
            setFeedback(error.message || 'Unable to send your message. Please try again.', true);
            console.error('Contact agent submit failed:', error);
        }
    });
}
