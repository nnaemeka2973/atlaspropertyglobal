(function () {
    'use strict';

    const SCRIPT_ID = 'atlas-ai-assistant-script';
    const STORAGE_KEY = 'atlas_ai_assistant_open';
    const HISTORY_KEY = 'atlas_ai_assistant_history';
    const POSITION_KEY = 'atlas_ai_assistant_position';

    let assistantRoot = null;
    let isOpen = false;

    /* =========================================================
       API ENDPOINT
       ========================================================= */

    function getAssistantEndpoint() {
        /*
         * Production / Hostinger:
         *      https://yourdomain.com/api/ai/chat
         *
         * Because this file runs on the same domain as the PHP API,
         * using /api/ai/chat is the safest option.
         */

        if (window.__atlasAssistantEndpoint) {
            return window.__atlasAssistantEndpoint;
        }

        const currentOrigin = window.location?.origin || '';

        if (
            currentOrigin === 'null' ||
            (currentOrigin.includes('localhost') && !currentOrigin.includes(':5000')) ||
            (currentOrigin.includes('127.0.0.1') && !currentOrigin.includes(':5000'))
        ) {
            return 'http://localhost:5000/api/ai/chat';
        }

        return '/api/ai/chat';
    }

    /* =========================================================
       PROPERTY CONTEXT
       ========================================================= */

    function getPropertyContext() {
        const params = new URLSearchParams(window.location.search);

        const propertyId =
            params.get('id') ||
            params.get('propertyId');

        const titleEl =
            document.getElementById('property-title');

        const priceEl =
            document.getElementById('property-price');

        const summaryEl =
            document.getElementById('property-summary');

        const locationEl =
            document.getElementById('property-location');

        const descriptionEl =
            document.getElementById('property-description');

        const propertyContext = {
            propertyId: propertyId || null,

            title:
                titleEl?.textContent?.trim() ||
                document.title ||
                null,

            price:
                priceEl?.textContent?.trim() ||
                null,

            summary:
                summaryEl?.textContent?.trim() ||
                null,

            address:
                locationEl?.textContent?.trim() ||
                null,

            description:
                descriptionEl?.textContent?.trim() ||
                null
        };

        const hasContext = Object.values(propertyContext)
            .some(value => value);

        return hasContext
            ? propertyContext
            : {};
    }

    /* =========================================================
       FIREBASE USER CONTEXT
       ========================================================= */

    function getUserContext() {
        try {
            /*
             * Your Firebase frontend authentication can expose
             * the current user through window.currentUser or
             * your existing atlas_user localStorage object.
             */

            const firebaseUser =
                window.currentUser ||
                window.atlasCurrentUser ||
                null;

            const storedUser =
                JSON.parse(
                    localStorage.getItem('atlas_user') || 'null'
                );

            const user =
                firebaseUser ||
                storedUser ||
                null;

            return {
                userId:
                    user?.uid ||
                    user?.id ||
                    null,

                isAuthenticated:
                    Boolean(user),

                /*
                 * Favorites remain frontend-only for now.
                 */
                favoriteCount: 0,

                recentSearches: []
            };

        } catch (error) {

            console.warn(
                'Unable to read Atlas user:',
                error
            );

            return {
                userId: null,
                isAuthenticated: false,
                favoriteCount: 0,
                recentSearches: []
            };
        }
    }

    /* =========================================================
       CONVERSATION HISTORY
       ========================================================= */

    function getConversationHistory() {
        try {

            const history =
                JSON.parse(
                    localStorage.getItem(HISTORY_KEY) || '[]'
                );

            return Array.isArray(history)
                ? history
                : [];

        } catch (error) {

            return [];
        }
    }

    function saveConversationHistory(history) {
        try {

            localStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(history)
            );

        } catch (error) {

            console.warn(
                'Unable to save AI conversation:',
                error
            );
        }
    }

    /* =========================================================
       CREATE ASSISTANT
       ========================================================= */

    function createAssistant() {

        if (assistantRoot) {
            return assistantRoot;
        }

        const style =
            document.createElement('style');

        style.id =
            'atlas-ai-assistant-styles';

        style.textContent = `

            .atlas-ai-assistant {
                position: fixed;
                right: 22px;
                bottom: 22px;
                z-index: 4000;
                font-family: 'Poppins', sans-serif;
            }

            .atlas-ai-assistant-toggle {
                width: 60px;
                height: 60px;
                border: none;
                border-radius: 999px;

                background:
                    linear-gradient(
                        135deg,
                        #0B3D91 0%,
                        #29B6F6 100%
                    );

                color: #fff;

                box-shadow:
                    0 16px 36px
                    rgba(11, 61, 145, 0.25);

                cursor: pointer;
                touch-action: none;
                cursor: grab;

                display: inline-flex;
                align-items: center;
                justify-content: center;

                font-size: 24px;

                transition:
                    transform 0.2s ease,
                    box-shadow 0.2s ease;
            }

            .atlas-ai-assistant-toggle:hover {
                transform: translateY(-2px);

                box-shadow:
                    0 20px 42px
                    rgba(11, 61, 145, 0.32);
            }

            .atlas-ai-assistant-toggle:active {
                cursor: grabbing;
            }

            .atlas-ai-assistant-toggle.is-active {
                background:
                    linear-gradient(
                        135deg,
                        #0e4fb7 0%,
                        #1f74d8 100%
                    );
            }

            .atlas-ai-assistant-panel {
                position: absolute;
                right: 0;
                bottom: 78px;

                width:
                    min(
                        360px,
                        calc(100vw - 28px)
                    );

                border-radius: 22px;

                background:
                    rgba(255,255,255,0.98);

                border:
                    1px solid
                    rgba(11,61,145,0.12);

                box-shadow:
                    0 24px 64px
                    rgba(11, 61, 145, 0.18);

                overflow: hidden;

                display: none;

                backdrop-filter: blur(16px);
            }

            .atlas-ai-assistant-panel.is-open {
                display: block;
            }

            .atlas-ai-assistant-header {
                background:
                    linear-gradient(
                        135deg,
                        #0B3D91 0%,
                        #29B6F6 100%
                    );

                color: #fff;

                padding: 16px 18px;

                display: flex;
                align-items: center;
                justify-content: space-between;

                cursor: grab;
                touch-action: none;
            }

            .atlas-ai-assistant-header.is-dragging {
                cursor: grabbing;
            }

            .atlas-ai-assistant-header h3 {
                margin: 0;
                font-size: 1rem;
                color: #fff;
                font-family: 'Montserrat', sans-serif;
            }

            .atlas-ai-assistant-header p {
                margin: 4px 0 0;
                font-size: 0.8rem;
                opacity: 0.9;
            }

            .atlas-ai-assistant-close {
                border: none;
                background: transparent;
                color: #fff;
                cursor: pointer;
                font-size: 20px;
            }

            .atlas-ai-assistant-body {
                padding: 16px;

                display: flex;
                flex-direction: column;

                gap: 12px;
            }

            .atlas-ai-assistant-messages {
                min-height: 200px;
                max-height: 280px;

                overflow: auto;

                display: flex;
                flex-direction: column;

                gap: 10px;

                padding-right: 4px;
            }

            .atlas-ai-assistant-message {
                max-width: 92%;

                padding: 10px 12px;

                border-radius: 14px;

                font-size: 0.9rem;
                line-height: 1.45;

                box-shadow:
                    0 8px 20px
                    rgba(17,17,17,0.05);

                white-space: pre-wrap;
            }

            .atlas-ai-assistant-message.user {
                align-self: flex-end;

                background: #0B3D91;
                color: #fff;
            }

            .atlas-ai-assistant-message.bot {
                align-self: flex-start;

                background: #f5f7fa;
                color: #222;
            }

            .atlas-ai-assistant-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .atlas-ai-assistant-actions button,
            .atlas-ai-assistant-form button {
                border:
                    1px solid
                    rgba(11,61,145,0.14);

                background: #fff;
                color: #0B3D91;

                border-radius: 999px;

                padding: 8px 12px;

                font-size: 0.8rem;

                cursor: pointer;
            }

            .atlas-ai-assistant-form {
                display: flex;
                gap: 8px;
            }

            .atlas-ai-assistant-form input {
                flex: 1;

                border:
                    1px solid
                    rgba(11,61,145,0.18);

                border-radius: 999px;

                padding: 10px 12px;

                outline: none;

                font-size: 0.9rem;
            }

            .atlas-ai-assistant-form button {
                background:
                    linear-gradient(
                        135deg,
                        #0B3D91 0%,
                        #29B6F6 100%
                    );

                color: #fff;

                border: none;
            }

            @media (max-width: 768px) {

                .atlas-ai-assistant {
                    right: 14px;
                    bottom: 14px;
                }

                .atlas-ai-assistant-panel {
                    width:
                        min(
                            320px,
                            calc(100vw - 22px)
                        );
                }
            }
        `;

        document.head.appendChild(style);

        const root =
            document.createElement('div');

        root.className =
            'atlas-ai-assistant';

        root.innerHTML = `

            <button
                class="atlas-ai-assistant-toggle"
                type="button"
                aria-expanded="false"
                aria-controls="atlas-ai-assistant-panel"
                title="AI Assistant"
            >
                <i class="fas fa-comments"></i>
            </button>

            <div
                id="atlas-ai-assistant-panel"
                class="atlas-ai-assistant-panel"
                role="dialog"
                aria-label="AI assistant"
            >

                <div class="atlas-ai-assistant-header">

                    <div>

                        <h3>
                            Atlas AI Assistant
                        </h3>

                        <p>
                            Help with listings,
                            finance, tours and more
                        </p>

                    </div>

                    <button
                        class="atlas-ai-assistant-close"
                        type="button"
                        aria-label="Close assistant"
                    >
                        ×
                    </button>

                </div>

                <div class="atlas-ai-assistant-body">

                    <div
                        class="atlas-ai-assistant-messages"
                        id="atlas-ai-assistant-messages"
                    ></div>

                    <div class="atlas-ai-assistant-actions">

                        <button
                            type="button"
                            data-action="search"
                        >
                            Property search
                        </button>

                        <button
                            type="button"
                            data-action="mortgage"
                        >
                            Mortgage
                        </button>

                        <button
                            type="button"
                            data-action="schedule"
                        >
                            Schedule tour
                        </button>

                        <button
                            type="button"
                            data-action="contact"
                        >
                            Contact team
                        </button>

                    </div>

                    <form class="atlas-ai-assistant-form">

                        <input
                            type="text"
                            placeholder="Ask about homes, financing, or tours"
                            aria-label="Ask the assistant"
                            autocomplete="off"
                        />

                        <button type="submit">
                            Send
                        </button>

                    </form>

                </div>

            </div>
        `;

        document.body.appendChild(root);

        assistantRoot = root;

        bindEvents(root);

        enableDragging(root);

        restoreState();

        renderHistory();

        return root;
    }

    /* =========================================================
       EVENTS
       ========================================================= */

    function enableDragging(root) {

        const header = root.querySelector('.atlas-ai-assistant-header');
        const toggle = root.querySelector('.atlas-ai-assistant-toggle');

        const handles = [header, toggle].filter(Boolean);

        if (!handles.length) {
            return;
        }

        try {
            const savedPosition = JSON.parse(
                localStorage.getItem(POSITION_KEY) || 'null'
            );

            if (Number.isFinite(savedPosition?.left) && Number.isFinite(savedPosition?.top)) {
                applyPosition(root, savedPosition.left, savedPosition.top);
            }
        } catch (error) {}

        let dragState = null;

        const startDragging = (event) => {
            if (event.target.closest('button') && event.currentTarget !== toggle) {
                return;
            }

            const bounds = root.getBoundingClientRect();

            dragState = {
                pointerId: event.pointerId,
                handle: event.currentTarget,
                offsetX: event.clientX - bounds.left,
                offsetY: event.clientY - bounds.top,
                startX: event.clientX,
                startY: event.clientY,
                moved: false
            };

            header?.classList.add('is-dragging');
            event.currentTarget.setPointerCapture(event.pointerId);
        };

        handles.forEach(handle => {
            handle.addEventListener('pointerdown', startDragging);
        });

        const moveDragging = (event) => {
            if (!dragState || dragState.pointerId !== event.pointerId) {
                return;
            }

            if (
                Math.abs(event.clientX - dragState.startX) > 4 ||
                Math.abs(event.clientY - dragState.startY) > 4
            ) {
                dragState.moved = true;
            }

            if (!dragState.moved) {
                return;
            }

            const left = event.clientX - dragState.offsetX;
            const top = event.clientY - dragState.offsetY;

            applyPosition(root, left, top);
            event.preventDefault();
        };

        handles.forEach(handle => {
            handle.addEventListener('pointermove', moveDragging);
        });

        const stopDragging = (event) => {
            if (!dragState || dragState.pointerId !== event.pointerId) {
                return;
            }

            const bounds = root.getBoundingClientRect();

            try {
                localStorage.setItem(
                    POSITION_KEY,
                    JSON.stringify({ left: bounds.left, top: bounds.top })
                );
            } catch (error) {}

            if (dragState.moved && dragState.handle === toggle) {
                root.dataset.dragged = 'true';
            }

            dragState = null;
            header?.classList.remove('is-dragging');
        };

        handles.forEach(handle => {
            handle.addEventListener('pointerup', stopDragging);
            handle.addEventListener('pointercancel', stopDragging);
        });
    }

    function applyPosition(root, left, top) {
        const panel = root.querySelector('.atlas-ai-assistant-panel');
        const width = panel?.classList.contains('is-open')
            ? panel.offsetWidth
            : root.offsetWidth;
        const height = panel?.classList.contains('is-open')
            ? panel.offsetHeight + 86
            : root.offsetHeight;
        const margin = 8;
        const maxLeft = Math.max(margin, window.innerWidth - width - margin);
        const maxTop = Math.max(margin, window.innerHeight - height - margin);
        const minTop = panel?.classList.contains('is-open')
            ? panel.offsetHeight + 86
            : margin;

        root.style.left = `${Math.min(Math.max(left, margin), maxLeft)}px`;
        root.style.top = `${Math.min(Math.max(top, minTop), maxTop)}px`;
        root.style.right = 'auto';
        root.style.bottom = 'auto';
    }

    function bindEvents(root) {

        const toggle =
            root.querySelector(
                '.atlas-ai-assistant-toggle'
            );

        const close =
            root.querySelector(
                '.atlas-ai-assistant-close'
            );

        const form =
            root.querySelector(
                '.atlas-ai-assistant-form'
            );

        const input =
            form?.querySelector('input');

        const actionButtons =
            root.querySelectorAll(
                '.atlas-ai-assistant-actions button'
            );

        toggle?.addEventListener(
            'click',
            () => {

                if (root.dataset.dragged === 'true') {
                    delete root.dataset.dragged;
                    return;
                }

                isOpen = !isOpen;

                updateUi();

                if (isOpen) {
                    input?.focus();
                }
            }
        );

        close?.addEventListener(
            'click',
            () => {

                isOpen = false;

                updateUi();
            }
        );

        form?.addEventListener(
            'submit',
            async (event) => {

                event.preventDefault();

                const value =
                    input?.value?.trim();

                if (!value) {
                    return;
                }

                appendMessage(
                    value,
                    'user'
                );

                input.value = '';

                await sendToAssistant(value);
            }
        );

        actionButtons.forEach(
            (button) => {

                button.addEventListener(
                    'click',
                    async () => {

                        const action =
                            button.getAttribute(
                                'data-action'
                            );

                        const label =
                            button.textContent.trim();

                        appendMessage(
                            label,
                            'user'
                        );

                        await sendToAssistant(
                            action
                        );
                    }
                );
            }
        );
    }

    /* =========================================================
       SEND MESSAGE TO PHP AI API
       ========================================================= */

    async function sendToAssistant(message) {

        const userContext =
            getUserContext();

        const propertyContext =
            getPropertyContext();

        const history =
            getConversationHistory();

        const typing =
            appendMessage(
                'Thinking…',
                'bot',
                true
            );

        try {

            const response =
                await fetch(
                    getAssistantEndpoint(),
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({

                            message,

                            propertyContext,

                            conversationHistory:
                                history,

                            userId:
                                userContext.userId,

                            isAuthenticated:
                                userContext.isAuthenticated
                        })
                    }
                );

            let result = null;

            try {

                result =
                    await response.json();

            } catch (jsonError) {

                result = null;
            }

            typing?.remove();

            if (
                !response.ok ||
                !result?.success
            ) {

                appendMessage(
                    result?.message ||
                    result?.error ||
                    'The assistant is unavailable right now.',
                    'bot'
                );

                return;
            }

            const reply =
                result?.data?.reply ||
                'I can help with that.';

            appendMessage(
                reply,
                'bot'
            );

            const nextHistory = [

                ...history,

                {
                    role: 'user',
                    content: message
                },

                {
                    role: 'assistant',
                    content: reply
                }
            ];

            saveConversationHistory(
                nextHistory.slice(-20)
            );

        } catch (error) {

            console.error(
                'Atlas AI request failed:',
                error
            );

            typing?.remove();

            appendMessage(
                'The assistant is unavailable right now. Please try again in a moment.',
                'bot'
            );
        }
    }

    /* =========================================================
       UI
       ========================================================= */

    function updateUi() {

        if (!assistantRoot) {
            return;
        }

        const toggle =
            assistantRoot.querySelector(
                '.atlas-ai-assistant-toggle'
            );

        const panel =
            assistantRoot.querySelector(
                '.atlas-ai-assistant-panel'
            );

        toggle?.classList.toggle(
            'is-active',
            isOpen
        );

        toggle?.setAttribute(
            'aria-expanded',
            String(isOpen)
        );

        panel?.classList.toggle(
            'is-open',
            isOpen
        );

        try {

            localStorage.setItem(
                STORAGE_KEY,
                isOpen ? '1' : '0'
            );

        } catch (error) {}
    }

    function restoreState() {

        try {

            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (saved === '1') {

                isOpen = true;

                updateUi();
            }

        } catch (error) {}
    }

    /* =========================================================
       HISTORY RENDERING
       ========================================================= */

    function renderHistory() {

        const history =
            getConversationHistory();

        const messages =
            assistantRoot?.querySelector(
                '.atlas-ai-assistant-messages'
            );

        if (!messages) {
            return;
        }

        messages.innerHTML = '';

        history.forEach(
            (item) => {

                if (!item?.content) {
                    return;
                }

                appendMessage(
                    item.content,
                    item.role === 'user'
                        ? 'user'
                        : 'bot'
                );
            }
        );
    }

    function appendMessage(
        text,
        sender,
        isTyping = false
    ) {

        if (!assistantRoot) {
            return null;
        }

        const messages =
            assistantRoot.querySelector(
                '.atlas-ai-assistant-messages'
            );

        if (!messages) {
            return null;
        }

        const bubble =
            document.createElement('div');

        bubble.className =
            `atlas-ai-assistant-message ${
                sender === 'user'
                    ? 'user'
                    : 'bot'
            }`;

        /*
         * textContent prevents HTML injection
         * from AI/user messages.
         */
        bubble.textContent =
            String(text || '');

        if (isTyping) {

            bubble.setAttribute(
                'data-typing',
                'true'
            );
        }

        messages.appendChild(
            bubble
        );

        messages.scrollTop =
            messages.scrollHeight;

        return bubble;
    }

    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function init() {

        if (
            document.getElementById(
                SCRIPT_ID
            )
        ) {
            return;
        }

        if (
            document.querySelector(
                '.atlas-ai-assistant'
            )
        ) {
            return;
        }

        const scriptTag =
            document.createElement(
                'script'
            );

        scriptTag.id =
            SCRIPT_ID;

        scriptTag.setAttribute(
            'data-loaded',
            'true'
        );

        scriptTag.textContent =
            'window.__atlasAssistantReady = true;';

        document.head.appendChild(
            scriptTag
        );

        createAssistant();

        const history =
            getConversationHistory();

        if (!history.length) {

            const welcome =
                'Hello! I can guide you through listings, mortgage help, tours, and contact options.';

            appendMessage(
                welcome,
                'bot'
            );

            saveConversationHistory([
                {
                    role: 'assistant',
                    content: welcome
                }
            ]);
        }
    }

    /* =========================================================
       START
       ========================================================= */

    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            init,
            { once: true }
        );

    } else {

        init();
    }

    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.AIAssistant = {

        open: function () {

            isOpen = true;

            updateUi();
        },

        close: function () {

            isOpen = false;

            updateUi();
        },

        clearHistory: function () {

            saveConversationHistory([]);

            renderHistory();
        }
    };

})();