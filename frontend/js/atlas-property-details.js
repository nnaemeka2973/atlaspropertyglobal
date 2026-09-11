(() => {

    const root = document.getElementById("detailsPage");

    const property = getPropertyByQuery();

    if (!property) {
        root.innerHTML = `
            <section class="container not-found">
                <h1>Property not found</h1>
                <p>The requested property is not in the supplied property data.</p>
                <a class="details-btn" href="properties.html">Back to properties</a>
            </section>
        `;
        return;
    }

    const d = property.details || {};

    const countryCallingCodes = [
        ['Afghanistan', '+93'], ['Albania', '+355'], ['Algeria', '+213'], ['Andorra', '+376'], ['Angola', '+244'],
        ['Antigua and Barbuda', '+1-268'], ['Argentina', '+54'], ['Armenia', '+374'], ['Australia', '+61'], ['Austria', '+43'],
        ['Azerbaijan', '+994'], ['Bahamas', '+1-242'], ['Bahrain', '+973'], ['Bangladesh', '+880'], ['Barbados', '+1-246'],
        ['Belarus', '+375'], ['Belgium', '+32'], ['Belize', '+501'], ['Benin', '+229'], ['Bhutan', '+975'],
        ['Bolivia', '+591'], ['Bosnia and Herzegovina', '+387'], ['Botswana', '+267'], ['Brazil', '+55'], ['Brunei', '+673'],
        ['Bulgaria', '+359'], ['Burkina Faso', '+226'], ['Burundi', '+257'], ['Cabo Verde', '+238'], ['Cambodia', '+855'],
        ['Cameroon', '+237'], ['Canada', '+1'], ['Central African Republic', '+236'], ['Chad', '+235'], ['Chile', '+56'],
        ['China', '+86'], ['Colombia', '+57'], ['Comoros', '+269'], ['Congo', '+242'], ['Costa Rica', '+506'],
        ['Croatia', '+385'], ['Cuba', '+53'], ['Cyprus', '+357'], ['Czechia', '+420'], ['Denmark', '+45'],
        ['Djibouti', '+253'], ['Dominica', '+1-767'], ['Dominican Republic', '+1-809'], ['Ecuador', '+593'], ['Egypt', '+20'],
        ['El Salvador', '+503'], ['Equatorial Guinea', '+240'], ['Eritrea', '+291'], ['Estonia', '+372'], ['Eswatini', '+268'],
        ['Ethiopia', '+251'], ['Fiji', '+679'], ['Finland', '+358'], ['France', '+33'], ['Gabon', '+241'],
        ['Gambia', '+220'], ['Georgia', '+995'], ['Germany', '+49'], ['Ghana', '+233'], ['Greece', '+30'],
        ['Grenada', '+1-473'], ['Guatemala', '+502'], ['Guinea', '+224'], ['Guinea-Bissau', '+245'], ['Guyana', '+592'],
        ['Haiti', '+509'], ['Honduras', '+504'], ['Hungary', '+36'], ['Iceland', '+354'], ['India', '+91'],
        ['Indonesia', '+62'], ['Iran', '+98'], ['Iraq', '+964'], ['Ireland', '+353'], ['Israel', '+972'],
        ['Italy', '+39'], ['Jamaica', '+1-876'], ['Japan', '+81'], ['Jordan', '+962'], ['Kazakhstan', '+7'],
        ['Kenya', '+254'], ['Kiribati', '+686'], ['Kuwait', '+965'], ['Kyrgyzstan', '+996'], ['Laos', '+856'],
        ['Latvia', '+371'], ['Lebanon', '+961'], ['Lesotho', '+266'], ['Liberia', '+231'], ['Libya', '+218'],
        ['Liechtenstein', '+423'], ['Lithuania', '+370'], ['Luxembourg', '+352'], ['Madagascar', '+261'], ['Malawi', '+265'],
        ['Malaysia', '+60'], ['Maldives', '+960'], ['Mali', '+223'], ['Malta', '+356'], ['Marshall Islands', '+692'],
        ['Mauritania', '+222'], ['Mauritius', '+230'], ['Mexico', '+52'], ['Micronesia', '+691'], ['Moldova', '+373'],
        ['Monaco', '+377'], ['Mongolia', '+976'], ['Montenegro', '+382'], ['Morocco', '+212'], ['Mozambique', '+258'],
        ['Myanmar', '+95'], ['Namibia', '+264'], ['Nauru', '+674'], ['Nepal', '+977'], ['Netherlands', '+31'],
        ['New Zealand', '+64'], ['Nicaragua', '+505'], ['Niger', '+227'], ['Nigeria', '+234'], ['North Korea', '+850'],
        ['North Macedonia', '+389'], ['Norway', '+47'], ['Oman', '+968'], ['Pakistan', '+92'], ['Palau', '+680'],
        ['Palestine', '+970'], ['Panama', '+507'], ['Papua New Guinea', '+675'], ['Paraguay', '+595'], ['Peru', '+51'],
        ['Philippines', '+63'], ['Poland', '+48'], ['Portugal', '+351'], ['Qatar', '+974'], ['Romania', '+40'],
        ['Russia', '+7'], ['Rwanda', '+250'], ['Saint Kitts and Nevis', '+1-869'], ['Saint Lucia', '+1-758'], ['Samoa', '+685'],
        ['San Marino', '+378'], ['Sao Tome and Principe', '+239'], ['Saudi Arabia', '+966'], ['Senegal', '+221'], ['Serbia', '+381'],
        ['Seychelles', '+248'], ['Sierra Leone', '+232'], ['Singapore', '+65'], ['Slovakia', '+421'], ['Slovenia', '+386'],
        ['Solomon Islands', '+677'], ['Somalia', '+252'], ['South Africa', '+27'], ['South Korea', '+82'], ['South Sudan', '+211'],
        ['Spain', '+34'], ['Sri Lanka', '+94'], ['Sudan', '+249'], ['Suriname', '+597'], ['Sweden', '+46'],
        ['Switzerland', '+41'], ['Syria', '+963'], ['Taiwan', '+886'], ['Tajikistan', '+992'], ['Tanzania', '+255'],
        ['Thailand', '+66'], ['Timor-Leste', '+670'], ['Togo', '+228'], ['Tonga', '+676'], ['Trinidad and Tobago', '+1-868'],
        ['Tunisia', '+216'], ['Turkey', '+90'], ['Turkmenistan', '+993'], ['Tuvalu', '+688'], ['Uganda', '+256'],
        ['Ukraine', '+380'], ['United Arab Emirates', '+971'], ['United Kingdom', '+44'], ['United States', '+1'], ['Uruguay', '+598'],
        ['Uzbekistan', '+998'], ['Vanuatu', '+678'], ['Vatican City', '+39'], ['Venezuela', '+58'], ['Vietnam', '+84'],
        ['Yemen', '+967'], ['Zambia', '+260'], ['Zimbabwe', '+263']
    ];

    const countryCallingCodeOptions = countryCallingCodes
        .map(([country, code]) => `<option value="${code}">${country} ${code}</option>`)
        .join('');

    const photos = Array.isArray(property.photos)
        ? [
            ...new Set(
                property.photos
                    .filter(Boolean)
                    .map(src =>
                        String(src)
                            .replace(/^http:\/\/\//i, "https://")
                            .replace(/\.jpg$/i, "o.jpg")
                    )
            )
        ]
        : [];

    const escape = value =>
        escapeHtml(String(value ?? ""));

    const propertyLabel =
        property.title ||
        property.address ||
        "this property";

    const addressText = [
        property.address,
        property.city,
        property.state,
        property.zipCode
    ]
        .filter(Boolean)
        .join(", ");

    const section = (title, values) =>
        Array.isArray(values) && values.length
            ? `
                <section class="detail-section">
                    <h2>${escape(title)}</h2>

                    <ul class="feature-list">
                        ${values
                            .map(v => `
                                <li>${escape(v)}</li>
                            `)
                            .join("")}
                    </ul>
                </section>
            `
            : "";

    const unavailable = title =>
        section(title, [
            "Property-specific details are presented in the listing profile and Atlas Property Group can confirm final measurements and terms during the showing process."
        ]);

    // --------------------------------------------------
    // FIND ADVERTISER / AGENT
    // --------------------------------------------------

    const findAdvertiser = value => {

        if (!value || typeof value !== "object") {
            return null;
        }

        if (Array.isArray(value)) {

            for (const item of value) {

                const found = findAdvertiser(item);

                if (found) {
                    return found;
                }
            }

            return null;
        }

        if (
            Array.isArray(value.advertisers) &&
            value.advertisers.length
        ) {

            const preferred =
                value.advertisers.find(
                    a => a?.type === "seller"
                ) ||
                value.advertisers[0];

            if (preferred) {
                return preferred;
            }
        }

        for (const key of Object.keys(value)) {

            if (key === "photos") {
                continue;
            }

            const found = findAdvertiser(value[key]);

            if (found) {
                return found;
            }
        }

        return null;
    };

    const suppliedAdvertiser =
        property.agent?.name ||
        property.agent?.email
            ? property.agent
            : findAdvertiser(property.providerData);

    const agentPool = [
        "Jordan Mitchell",
        "Taylor Morgan",
        "Avery Brooks",
        "Cameron Reed",
        "Riley Bennett",
        "Morgan Hayes",
        "Dylan Carter",
        "Alex Parker",
        "Casey Sullivan",
        "Jamie Ellis",
        "Peyton Davis",
        "Reese Anderson",
        "Logan Foster",
        "Harper Collins",
        "Quinn Bailey",
        "Blake Thompson",
        "Emery Wilson",
        "Sydney Cooper",
        "Rowan Clark",
        "Kendall Moore"
    ];

    const seed = String(
        property.id ||
        property.address ||
        "atlas"
    )
        .split("")
        .reduce(
            (n, c) =>
                (n * 31 + c.charCodeAt(0)) >>> 0,
            7
        );

    const fallbackAgentName =
        agentPool[
            seed % agentPool.length
        ];

    const agentName =
        suppliedAdvertiser?.name ||
        fallbackAgentName;

    const agentEmail =
        suppliedAdvertiser?.email ||
        property.agent?.email ||
        "";

    const agentOffice =
        suppliedAdvertiser?.office ||
        property.agent?.office ||
        "Atlas Property Group";

    const isFormulatedAgent =
        !suppliedAdvertiser?.name &&
        !property.agent?.name;

    // --------------------------------------------------
    // COORDINATES / MAP
    // --------------------------------------------------

    const getCoordinate = value => {

        if (!value || typeof value !== "object") {
            return null;
        }

        if (
            Number.isFinite(Number(value.lat)) &&
            Number.isFinite(Number(value.lon))
        ) {

            return {
                lat: Number(value.lat),
                lon: Number(value.lon)
            };
        }

        if (
            Number.isFinite(Number(value.latitude)) &&
            Number.isFinite(Number(value.longitude))
        ) {

            return {
                lat: Number(value.latitude),
                lon: Number(value.longitude)
            };
        }

        for (const key of Object.keys(value)) {

            if (key === "photos") {
                continue;
            }

            const found = getCoordinate(value[key]);

            if (found) {
                return found;
            }
        }

        return null;
    };

    const coordinates =
        getCoordinate(property) ||
        getCoordinate(property.providerData);

    const mapHtml = coordinates
        ? `
            <div class="map-wrap">
                <iframe
                    title="Map showing ${escape(addressText)}"
                    loading="lazy"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                        `${coordinates.lon - 0.008},${coordinates.lat - 0.006},${coordinates.lon + 0.008},${coordinates.lat + 0.006}`
                    )}&layer=mapnik&marker=${encodeURIComponent(
                        `${coordinates.lat},${coordinates.lon}`
                    )}">
                </iframe>
            </div>

            <a
                class="map-link"
                href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${coordinates.lat},${coordinates.lon}`
                )}"
                target="_blank"
                rel="noopener"
            >
                Open location in Google Maps ↗
            </a>
        `
        : `
            <div class="unavailable">
                Property location is shown using the listing location associated with this residence.
            </div>
        `;

    // --------------------------------------------------
    // PROPERTY HISTORY
    // --------------------------------------------------

    const history = [];

    if (property.listingDate) {

        history.push([
            "Listing date",
            property.listingDate
        ]);
    }

    if (property.lastSoldDate) {

        history.push([
            "Last sold date",
            property.lastSoldDate
        ]);
    }

    if (property.lastSoldPrice != null) {

        history.push([
            "Last sold price",
            formatPropertyPrice(
                property.lastSoldPrice
            )
        ]);
    }

    if (property.priceReducedDate) {

        history.push([
            "Price reduced date",
            property.priceReducedDate
        ]);
    }

    if (property.priceReducedAmount != null) {

        history.push([
            "Price reduction",
            formatPropertyPrice(
                property.priceReducedAmount
            )
        ]);
    }

    // --------------------------------------------------
    // GALLERY
    // --------------------------------------------------

    const hero =
        property.primaryPhoto ||
        photos[0] ||
        "";

    const initialIndex = Math.max(
        0,
        photos.findIndex(p => p === hero)
    );

    const emailTarget = agentEmail || "";

    const whatsappNumber =
        "13346971225";

    const whatsappText =
        `Hello ${agentName}, I'm interested in ${propertyLabel}` +
        `${addressText ? ` at ${addressText}` : ""}. ` +
        `Please send me more information.`;

    const whatsappUrl =
        `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(
            whatsappText
        )}`;

    const mailUrl = emailTarget
        ? `mailto:${encodeURIComponent(
            emailTarget
        )}?subject=${encodeURIComponent(
            `Property enquiry: ${propertyLabel}`
        )}&body=${encodeURIComponent(
            `Hello ${agentName},

I'm interested in ${propertyLabel}${
                addressText
                    ? ` at ${addressText}`
                    : ""
            }. Please send me more information.

Thank you.`
        )}`
        : "#contact";

    // --------------------------------------------------
    // FINANCIALS
    // --------------------------------------------------

    const numericMoney = value => {

        if (value == null) {
            return 0;
        }

        const match = String(value)
            .replace(/,/g, "")
            .match(/-?\d+(?:\.\d+)?/);

        return match
            ? Number(match[0])
            : 0;
    };

    const listingPrice =
        Number(
            property.price ??
            property.list_price ??
            0
        ) || 0;

    const taxAnnual =
        numericMoney(property.taxes) ||
        numericMoney(d.propertyInfo?.taxes) ||
        0;

    const hoaMonthly =
        numericMoney(property.hoa) ||
        numericMoney(d.propertyInfo?.hoa) ||
        0;

    const insuranceMonthly =
        Math.round(
            (listingPrice * 0.004) / 12
        );

    const formatMoney = value =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0
        }).format(
            Number(value) || 0
        );

    const monthlyMortgage = (
        principal,
        annualRate,
        years
    ) => {

        const r =
            annualRate / 100 / 12;

        const n =
            years * 12;

        if (!principal || !n) {
            return 0;
        }

        if (!r) {
            return principal / n;
        }

        return (
            principal *
            r *
            Math.pow(1 + r, n)
        ) /
            (
                Math.pow(1 + r, n) - 1
            );
    };

    // --------------------------------------------------
    // PROPERTY AI
    // --------------------------------------------------

    const aiAnswer = question => {

        const q =
            String(question || "")
                .toLowerCase();

        const beds =
            property.bedrooms ?? 1;

        const baths =
            property.bathrooms ?? 1;

        const sqft =
            property.sqft
                ? `${Number(
                    property.sqft
                ).toLocaleString()} sq ft`
                : "approximately 800 sq ft";

        const priceText =
            formatPropertyPrice(
                property.price ??
                property.list_price
            );

        if (
            /price|cost|how much/.test(q)
        ) {

            return `The listed price is ${priceText}.`;
        }

        if (
            /bed|room/.test(q)
        ) {

            return `This property has ${beds} bedroom${
                Number(beds) === 1
                    ? ""
                    : "s"
            }.`;
        }

        if (
            /bath/.test(q)
        ) {

            return `This property has ${baths} bathroom${
                Number(baths) === 1
                    ? ""
                    : "s"
            }.`;
        }

        if (
            /size|square|sqft|feet/.test(q)
        ) {

            return `The supplied property size is ${sqft}.`;
        }

        if (/tax/.test(q)) {

            return taxAnnual
                ? `The supplied annual tax figure is ${formatMoney(
                    taxAnnual
                )}.`
                : `Annual property taxes are estimated from the property's market value for planning purposes.`;
        }

        if (
            /hoa|fee/.test(q)
        ) {

            return hoaMonthly
                ? `The supplied HOA figure is ${formatMoney(
                    hoaMonthly
                )} per month.`
                : `Association costs are estimated from comparable residences where applicable.`;
        }

        if (
            /mortgage|payment|monthly/.test(q)
        ) {

            return `Using the calculator, you can adjust the down payment, rate and term to estimate your monthly payment. The default estimate starts from the listing price of ${priceText}.`;
        }

        if (/school/.test(q)) {

            return d.schools?.length
                ? `The supplied school information includes ${d.schools
                    .slice(0, 3)
                    .join(", ")}.`
                : `The property is served by schools and education options in the surrounding ${property.city || "local"} area.`;
        }

        if (
            /location|where|address/.test(q)
        ) {

            return addressText
                ? `The property is listed at ${addressText}.`
                : `The residence is located in the ${property.city || "local"} area.`;
        }

        if (
            /feature|amenit|inside|interior|outside|exterior/.test(q)
        ) {

            const items = [
                ...(d.homeFeatures || []),
                ...(d.interiorFeatures || []),
                ...(d.exteriorFeatures || []),
                ...(d.communityAmenities || [])
            ].slice(0, 6);

            return items.length
                ? `Some supplied features include ${items.join(
                    ", "
                )}.`
                : `The listing includes a practical set of interior, building and community features suitable for everyday living.`;
        }

        return `I can help with this property's price, payment estimate, bedrooms, bathrooms, size, taxes, HOA, schools, location and supplied features. Try one of the quick questions below.`;
    };

    // --------------------------------------------------
    // PAGE HTML
    // --------------------------------------------------

    root.innerHTML = `

        <section class="container details-top">

            <a
                class="back-link"
                href="properties.html"
            >
                ← Back to properties
            </a>

            <div class="hero-gallery">

                <div
                    class="main-photo"
                    data-photo-index="${initialIndex}"
                >

                    ${
                        hero
                            ? `
                                <img
                                    id="mainPhoto"
                                    src="${escape(hero)}"
                                    alt="${escape(propertyLabel)}"
                                    decoding="async"
                                    fetchpriority="high"
                                >
                            `
                            : `
                                <div class="no-photo">
                                    No photo supplied
                                </div>
                            `
                    }

                    ${
                        photos.length > 1
                            ? `
                                <button
                                    class="gallery-arrow gallery-prev"
                                    id="galleryPrev"
                                    aria-label="Previous property photo"
                                >
                                    ‹
                                </button>

                                <button
                                    class="gallery-arrow gallery-next"
                                    id="galleryNext"
                                    aria-label="Next property photo"
                                >
                                    ›
                                </button>

                                <div
                                    class="gallery-counter"
                                    id="galleryCounter"
                                >
                                    ${initialIndex + 1} / ${photos.length}
                                </div>
                            `
                            : ""
                    }

                </div>

                <div
                    class="thumbs"
                    id="thumbs"
                >

                    ${photos
                        .map(
                            (src, i) => `
                                <button
                                    class="thumb ${
                                        i === initialIndex
                                            ? "active"
                                            : ""
                                    }"
                                    data-index="${i}"
                                    aria-label="Photo ${i + 1}"
                                >
                                    <img
                                        src="${escape(src)}"
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                    >
                                </button>
                            `
                        )
                        .join("")}

                </div>

            </div>

            <div class="property-header">

                <div>

                    <span class="status-badge static-badge">
                        ${escape(
                            property.status ||
                            "Status unavailable"
                        )}
                    </span>

                    <h1>
                        ${escape(propertyLabel)}
                    </h1>

                    <p class="large-location">
                        ${escape(
                            [
                                property.city,
                                property.state,
                                property.zipCode
                            ]
                                .filter(Boolean)
                                .join(", ")
                        )}
                    </p>

                </div>

                <div class="big-price">
                    ${escape(
                        formatPropertyPrice(
                            property.price ??
                            property.list_price
                        )
                    )}
                </div>

            </div>

            <div class="summary-stats">

                <div>
                    <strong>
                        ${property.bedrooms ?? "—"}
                    </strong>
                    <span>Beds</span>
                </div>

                <div>
                    <strong>
                        ${property.bathrooms ?? "—"}
                    </strong>
                    <span>Baths</span>
                </div>

                <div>
                    <strong>
                        ${
                            property.sqft
                                ? Number(
                                    property.sqft
                                ).toLocaleString()
                                : "—"
                        }
                    </strong>
                    <span>Sq Ft</span>
                </div>

                <div>
                    <strong>
                        ${escape(
                            property.propertyType ||
                            property.type ||
                            "—"
                        )}
                    </strong>
                    <span>Type</span>
                </div>

            </div>

        </section>

        <section class="container detail-layout">

            <div class="content-column">

                <aside class="left-rail">

                    <div class="finance-box finance-sticky">

                        <span class="section-kicker">
                            FINANCIALS
                        </span>

                        <h2>
                            Financial Information
                        </h2>

                        <p>
                            <span>List price</span>

                            <strong>
                                ${escape(
                                    formatPropertyPrice(
                                        property.list_price ??
                                        property.price
                                    )
                                )}
                            </strong>
                        </p>

                        ${
                            property.estimate != null
                                ? `
                                    <p>
                                        <span>Estimate</span>

                                        <strong>
                                            ${escape(
                                                formatPropertyPrice(
                                                    property.estimate
                                                )
                                            )}
                                        </strong>
                                    </p>
                                `
                                : ""
                        }

                        ${
                            property.lastSoldPrice != null
                                ? `
                                    <p>
                                        <span>Last sold</span>

                                        <strong>
                                            ${escape(
                                                formatPropertyPrice(
                                                    property.lastSoldPrice
                                                )
                                            )}
                                        </strong>
                                    </p>
                                `
                                : ""
                        }

                        ${
                            property.taxes
                                ? `
                                    <p>
                                        <span>Taxes</span>

                                        <strong>
                                            ${escape(
                                                property.taxes
                                            )}
                                        </strong>
                                    </p>
                                `
                                : ""
                        }

                        ${
                            property.hoa
                                ? `
                                    <p>
                                        <span>HOA</span>

                                        <strong>
                                            ${escape(
                                                property.hoa
                                            )}
                                        </strong>
                                    </p>
                                `
                                : ""
                        }

                    </div>

                    <div
                        class="finance-box mortgage-box"
                        id="mortgageCalculator"
                    >

                        <span class="section-kicker">
                            PAYMENT ESTIMATE
                        </span>

                        <h2>
                            Mortgage Calculator
                        </h2>

                        <p class="calculator-note">
                            Adjust the figures to estimate principal,
                            interest, taxes, insurance and HOA.
                        </p>

                        <label>
                            Home price

                            <input
                                id="mortgagePrice"
                                type="number"
                                min="0"
                                step="1000"
                                value="${Math.round(
                                    listingPrice
                                )}"
                            >
                        </label>

                        <label>
                            Down payment %

                            <input
                                id="mortgageDown"
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value="20"
                            >
                        </label>

                        <label>
                            Interest rate %

                            <input
                                id="mortgageRate"
                                type="number"
                                min="0"
                                max="30"
                                step="0.05"
                                value="6.5"
                            >
                        </label>

                        <label>
                            Loan term

                            <select id="mortgageTerm">

                                <option value="30">
                                    30 years
                                </option>

                                <option value="20">
                                    20 years
                                </option>

                                <option value="15">
                                    15 years
                                </option>

                                <option value="10">
                                    10 years
                                </option>

                            </select>
                        </label>

                        <label>
                            Annual taxes

                            <input
                                id="mortgageTaxes"
                                type="number"
                                min="0"
                                step="100"
                                value="${Math.round(
                                    taxAnnual
                                )}"
                            >
                        </label>

                        <label>
                            Monthly HOA

                            <input
                                id="mortgageHoa"
                                type="number"
                                min="0"
                                step="25"
                                value="${Math.round(
                                    hoaMonthly
                                )}"
                            >
                        </label>

                        <label>
                            Monthly insurance

                            <input
                                id="mortgageInsurance"
                                type="number"
                                min="0"
                                step="25"
                                value="${insuranceMonthly}"
                            >
                        </label>

                        <div class="mortgage-result">

                            <span>
                                Estimated monthly payment
                            </span>

                            <strong id="mortgageTotal">
                                $0
                            </strong>

                            <small id="mortgageBreakdown">
                                Principal & interest $0 · Taxes $0 ·
                                Insurance $0 · HOA $0
                            </small>

                        </div>

                    </div>

                    <div
                        class="finance-box ai-box"
                        id="propertyAi"
                    >

                        <div class="ai-heading">

                            <span class="ai-spark">
                                ✦
                            </span>

                            <div>

                                <span class="section-kicker">
                                    SMART ASSISTANCE
                                </span>

                                <h2>
                                    Property AI Assistant
                                </h2>

                            </div>

                        </div>

                        <p class="calculator-note">
                            Ask about this listing using the
                            information supplied with the property.
                        </p>

                        <div class="ai-quick">

                            <button
                                type="button"
                                data-ai-question="What is the price and size?"
                            >
                                Price & size
                            </button>

                            <button
                                type="button"
                                data-ai-question="How many beds and baths?"
                            >
                                Beds & baths
                            </button>

                            <button
                                type="button"
                                data-ai-question="What are the taxes and HOA?"
                            >
                                Taxes & HOA
                            </button>

                            <button
                                type="button"
                                data-ai-question="What features are supplied?"
                            >
                                Features
                            </button>

                        </div>

                        <div
                            class="ai-response"
                            id="aiResponse"
                        >
                            Hi — I can help you explore this
                            property's supplied information.
                        </div>

                        <div class="ai-input-row">

                            <input
                                id="aiInput"
                                type="text"
                                placeholder="Ask about this property…"
                            >

                            <button
                                id="aiSend"
                                type="button"
                            >
                                Ask
                            </button>

                        </div>

                    </div>

                </aside>

                <div class="main-column">

                    ${
                        property.description &&
                        property.description !==
                            "[object Object]"
                            ? `
                                <section class="detail-section">

                                    <h2>
                                        Property Description
                                    </h2>

                                    <p class="property-description">
                                        ${escape(
                                            property.description
                                        )}
                                    </p>

                                </section>
                            `
                            : ""
                    }

                    ${section(
                        "Interior Features",
                        d.interiorFeatures
                    )}

                    ${section(
                        "Appliances",
                        d.appliances
                    )}

                    ${section(
                        "Heating & Cooling",
                        d.heatingCooling
                    )}

                    ${section(
                        "Exterior Features",
                        d.exteriorFeatures
                    )}

                    ${section(
                        "Waterfront & Water Access",
                        d.waterfront
                    )}

                    ${section(
                        "Parking",
                        d.parking
                    )}

                    ${section(
                        "Home Features",
                        d.homeFeatures
                    )}

                    ${section(
                        "Community Amenities",
                        d.communityAmenities
                    )}

                    ${section(
                        "Pool & Spa",
                        d.poolSpa
                    )}

                    ${section(
                        "Nearby Schools",
                        d.schools
                    )}

                    ${section(
                        "Condo Information",
                        d.condoInfo
                    )}

                    ${section(
                        "Rental Information",
                        d.rentalInfo
                    )}

                    ${section(
                        "Property Information & Taxes",
                        d.propertyInfo
                    )}

                    ${section(
                        "Private Data",
                        d.privateData
                    )}

                    ${section(
                        "Agent Only Data",
                        d.agentOnlyData
                    )}

                    ${section(
                        "Building & Construction",
                        d.buildingConstruction
                    )}

                    ${
                        history.length
                            ? `
                                <section class="detail-section">

                                    <h2>
                                        Property History & Price History
                                    </h2>

                                    <div class="history-table">

                                        ${history
                                            .map(
                                                r => `
                                                    <div>

                                                        <span>
                                                            ${escape(r[0])}
                                                        </span>

                                                        <strong>
                                                            ${escape(r[1])}
                                                        </strong>

                                                    </div>
                                                `
                                            )
                                            .join("")}

                                    </div>

                                </section>
                            `
                            : ""
                    }

                    ${
                        property.virtualTour
                            ? `
                                <section class="detail-section">

                                    <h2>
                                        Video Tour
                                    </h2>

                                    <a
                                        class="external-btn"
                                        href="${escape(
                                            property.virtualTour
                                        )}"
                                        target="_blank"
                                        rel="noopener"
                                    >
                                        Open supplied virtual tour
                                    </a>

                                </section>
                            `
                            : ""
                    }

                    ${
                        property.matterport
                            ? `
                                <section class="detail-section">

                                    <h2>
                                        3D Virtual Tour
                                    </h2>

                                    <div class="available">
                                        Matterport 3D tour is available
                                        in the supplied data.
                                    </div>

                                </section>
                            `
                            : ""
                    }

                    ${section(
                        "Property Highlights",
                        d.propertyHighlights
                    )}

                    ${
                        Array.isArray(d.propertyFeatures) &&
                        d.propertyFeatures.length
                            ? section(
                                "Property Features",
                                d.propertyFeatures
                            )
                            : unavailable(
                                "Property Features"
                            )
                    }

                    ${section(
                        "Location Information",
                        d.location
                    )}

                    ${section(
                        "Financial Information",
                        d.financialInformation
                    )}

                    ${
                        Array.isArray(d.nearbyPlaces) &&
                        d.nearbyPlaces.length
                            ? section(
                                "Nearby Places",
                                d.nearbyPlaces
                            )
                            : unavailable(
                                "Nearby Places"
                            )
                    }

                    ${
                        Array.isArray(d.commuteInformation) &&
                        d.commuteInformation.length
                            ? section(
                                "Commute Information",
                                d.commuteInformation
                            )
                            : unavailable(
                                "Commute Information"
                            )
                    }

                    ${
                        Array.isArray(d.floorPlans) &&
                        d.floorPlans.length
                            ? section(
                                "Floor Plans",
                                d.floorPlans
                            )
                            : unavailable(
                                "Floor Plans"
                            )
                    }

                    ${
                        Array.isArray(d.documents) &&
                        d.documents.length
                            ? section(
                                "Documents",
                                d.documents
                            )
                            : unavailable(
                                "Documents"
                            )
                    }

                    ${
                        Array.isArray(d.sustainability) &&
                        d.sustainability.length
                            ? section(
                                "Sustainability",
                                d.sustainability
                            )
                            : unavailable(
                                "Sustainability"
                            )
                    }

                    <section
                        class="detail-section location-section"
                    >

                        <div class="section-heading-row">

                            <div>

                                <span class="section-kicker">
                                    LOCATION
                                </span>

                                <h2>
                                    Property location
                                </h2>

                                <p>
                                    ${escape(
                                        addressText ||
                                        "Property location"
                                    )}
                                </p>

                            </div>

                        </div>

                        ${mapHtml}

                    </section>

                    <section
                        class="detail-section similar-section"
                    >

                        <div class="section-heading-row">

                            <div>

                                <span class="section-kicker">
                                    YOU MAY ALSO LIKE
                                </span>

                                <h2>
                                    Similar Properties
                                </h2>

                            </div>

                        </div>

                        <div
                            id="similarGrid"
                            class="similar-grid"
                        ></div>

                    </section>

                </div>

            </div>

            <aside class="side-column">

                <div
                    class="agent-box agent-sticky"
                    id="agentCard"
                >

                    <div class="agent-topline">

                        <span class="section-kicker">
                            CONTACT
                        </span>

                        <span
                            class="verified-dot"
                            title="Atlas contact"
                        >
                            ✓
                        </span>

                    </div>

                    <div class="agent-avatar">

                        <i
                            class="fas fa-user"
                            aria-hidden="true"
                        ></i>

                    </div>

                    <h2 class="agent-name">
                        ${escape(agentName)}
                    </h2>

                    <p class="agent-role">
                        ${
                            isFormulatedAgent
                                ? "Atlas Property Group listing specialist"
                                : "Listing agent"
                        }
                    </p>

                    <p class="agent-office">
                        ${escape(agentOffice)}
                    </p>

                    <div class="agent-actions">

                        ${
                            emailTarget
                                ? `
                                    <a
                                        class="agent-icon-btn"
                                        href="${escape(mailUrl)}"
                                        aria-label="Email ${escape(
                                            agentName
                                        )}"
                                    >
                                        <span>✉</span>
                                        <small>Email</small>
                                    </a>
                                `
                                : `
                                    <button
                                        class="agent-icon-btn"
                                        id="emailAgentBtn"
                                        type="button"
                                        aria-label="Email ${escape(
                                            agentName
                                        )}"
                                    >
                                        <span>✉</span>
                                        <small>Email</small>
                                    </button>
                                `
                        }

                        <a
                            class="agent-icon-btn whatsapp-btn"
                            href="${escape(whatsappUrl)}"
                            target="_blank"
                            rel="noopener"
                            aria-label="Message on WhatsApp"
                        >

                            <span>
                                <i
                                    class="fab fa-whatsapp"
                                    aria-hidden="true"
                                ></i>
                            </span>

                            <small>
                                WhatsApp
                            </small>

                        </a>

                    </div>

                    <button
                        class="contact-agent-btn"
                        id="contactAgentBtn"
                        type="button"
                    >

                        <i
                            class="fas fa-user agent-contact-icon"
                            aria-hidden="true"
                        ></i>

                        Contact agent

                    </button>

                    <p class="agent-disclaimer">
                        Questions about this property?
                        Send an enquiry and our team will
                        follow up.
                    </p>

                </div>

                <div class="actions-box">

                    <button
                        id="saveBtn"
                        class="action-btn"
                    >
                        ♡ Save Property
                    </button>

                    <button
                        id="shareBtn"
                        class="action-btn"
                    >
                        ↗ Share Property
                    </button>

                </div>

            </aside>

        </section>

        <!-- CONTACT MODAL -->

        <div
            class="contact-modal"
            id="contactModal"
            aria-hidden="true"
        >

            <div
                class="modal-backdrop"
                data-close-contact
            ></div>

            <div
                class="contact-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="contactTitle"
            >

                <button
                    class="modal-close"
                    id="closeContact"
                    type="button"
                    aria-label="Close"
                >
                    ×
                </button>

                <span class="section-kicker">
                    PROPERTY ENQUIRY
                </span>

                <h2 id="contactTitle">
                    Contact ${escape(agentName)}
                </h2>

                <p>
                    Ask a question or request a viewing for
                    <strong>
                        ${escape(propertyLabel)}
                    </strong>.
                </p>

                <form id="contactForm">

                    <input
                        type="hidden"
                        name="propertyId"
                        value="${escape(property.id)}"
                    >

                    <input
                        type="hidden"
                        name="propertyTitle"
                        value="${escape(propertyLabel)}"
                    >

                    <input
                        type="hidden"
                        name="propertyAddress"
                        value="${escape(addressText)}"
                    >

                    <input
                        type="hidden"
                        name="agentName"
                        value="${escape(agentName)}"
                    >

                    <input
                        type="hidden"
                        name="agentEmail"
                        value="${escape(agentEmail)}"
                    >

                    <label>
                        Full name

                        <input
                            required
                            name="name"
                            autocomplete="name"
                        >
                    </label>

                    <label>
                        Email

                        <input
                            required
                            type="email"
                            name="email"
                            autocomplete="email"
                        >
                    </label>

                    <label>
                        Phone

                        <input
                            id="contact-phone"
                            name="phone"
                            type="tel"
                            required
                            autocomplete="tel"
                            inputmode="tel"
                            placeholder="Enter your mobile number"
                        >
                    </label>

                    <label>
                        Message

                        <textarea
                            required
                            name="message"
                            rows="5"
                        >I'm interested in this property and would like more information.</textarea>
                    </label>

                    <button
                        class="contact-submit"
                        type="submit"
                    >
                        Send enquiry
                    </button>

                    <p
                        class="form-status"
                        id="formStatus"
                        role="status"
                    ></p>

                </form>

            </div>

        </div>

        <div
            class="mobile-contact-bar"
            aria-label="Contact ${escape(agentName)}"
        >

            <div class="mobile-contact-left">

                <span
                    class="mobile-contact-avatar"
                    aria-hidden="true"
                >
                    <i class="fas fa-user"></i>
                </span>

                <span class="mobile-contact-copy">

                    <strong class="mobile-contact-name">
                        ${escape(agentName)}
                    </strong>

                    <span class="mobile-contact-role">
                        ${
                            isFormulatedAgent
                                ? "Atlas Property Group listing specialist"
                                : "Listing agent"
                        }
                    </span>

                </span>

            </div>

            <button
                class="mobile-contact-btn"
                id="mobileContactAgentBtn"
                type="button"
            >

                <i
                    class="fas fa-envelope"
                    aria-hidden="true"
                ></i>

                Contact agent

            </button>

        </div>

    `;

    // --------------------------------------------------
    // REBUILD DETAILS FLOW
    // --------------------------------------------------

    const contentColumn =
        root.querySelector(".main-column");

    const leftRail =
        root.querySelector(".left-rail");

    const financialBox =
        root.querySelector(
            ".left-rail .finance-sticky"
        );

    const mortgageBox =
        root.querySelector(
            ".left-rail .mortgage-box"
        );

    const aiBox =
        root.querySelector(
            ".left-rail .ai-box"
        );

    if (
        contentColumn &&
        leftRail
    ) {

        const toolsSection =
            document.createElement("section");

        toolsSection.className =
            "detail-section tools-section";

        toolsSection.innerHTML = `
            <div class="section-heading">

                <span class="section-kicker">
                    FINANCIAL & TOOLS
                </span>

                <h2>
                    Financial information, mortgage & AI
                </h2>

            </div>

            <div class="tools-grid"></div>
        `;

        const toolsGrid =
            toolsSection.querySelector(
                ".tools-grid"
            );

        if (financialBox) {

            toolsGrid.appendChild(
                financialBox
            );
        }

        if (mortgageBox) {

            toolsGrid.appendChild(
                mortgageBox
            );
        }

        if (aiBox) {

            toolsGrid.appendChild(
                aiBox
            );
        }

        const historySection =
            contentColumn
                .querySelector(".history-table")
                ?.closest(".detail-section");

        if (historySection) {

            contentColumn.insertBefore(
                toolsSection,
                historySection
            );

        } else {

            contentColumn.appendChild(
                toolsSection
            );
        }

        leftRail.remove();
    }

    // --------------------------------------------------
    // SECTION ORDER
    // --------------------------------------------------

    if (contentColumn) {

        const sections = [
            ...contentColumn.querySelectorAll(
                ":scope > .detail-section"
            )
        ];

        const findSection = text =>
            sections.find(
                s =>
                    s.querySelector("h2")
                        ?.textContent
                        .trim()
                        .toLowerCase() === text
            );

        const order = [
            "property description",
            "interior features",
            "appliances",
            "heating & cooling",
            "exterior features",
            "waterfront & water access",
            "parking",
            "home features",
            "community amenities",
            "pool & spa",
            "condo information",
            "rental information",
            "property information & taxes",
            "building & construction",
            "nearby schools",
            "property history & price history",
            "video tour",
            "3d virtual tour",
            "property location",
            "similar properties"
        ];

        const anchor =
            sections[0];

        order.forEach(title => {

            const section =
                findSection(title);

            if (
                section &&
                section !== anchor
            ) {

                contentColumn.appendChild(
                    section
                );
            }
        });
    }

    // --------------------------------------------------
    // GALLERY
    // --------------------------------------------------

    let currentIndex =
        initialIndex;

    const mainPhoto =
        document.getElementById(
            "mainPhoto"
        );

    const counter =
        document.getElementById(
            "galleryCounter"
        );

    const setPhoto = index => {

        if (
            !photos.length ||
            !mainPhoto
        ) {
            return;
        }

        currentIndex =
            (index + photos.length) %
            photos.length;

        mainPhoto.src =
            photos[currentIndex];

        mainPhoto.alt =
            `${propertyLabel} — photo ${
                currentIndex + 1
            }`;

        document
            .querySelectorAll(".thumb")
            .forEach(btn =>
                btn.classList.toggle(
                    "active",
                    Number(
                        btn.dataset.index
                    ) === currentIndex
                )
            );

        document
            .querySelectorAll(
                ".full-gallery-item"
            )
            .forEach(btn =>
                btn.classList.toggle(
                    "selected",
                    Number(
                        btn.dataset.index
                    ) === currentIndex
                )
            );

        if (counter) {

            counter.textContent =
                `${currentIndex + 1} / ${photos.length}`;
        }
    };

    document
        .getElementById("galleryPrev")
        ?.addEventListener(
            "click",
            () =>
                setPhoto(
                    currentIndex - 1
                )
        );

    document
        .getElementById("galleryNext")
        ?.addEventListener(
            "click",
            () =>
                setPhoto(
                    currentIndex + 1
                )
        );

    document
        .querySelectorAll(
            ".thumb, .full-gallery-item"
        )
        .forEach(btn =>
            btn.addEventListener(
                "click",
                () =>
                    setPhoto(
                        Number(
                            btn.dataset.index
                        )
                    )
            )
        );

    document.addEventListener(
        "keydown",
        e => {

            if (e.key === "ArrowLeft") {

                setPhoto(
                    currentIndex - 1
                );
            }

            if (e.key === "ArrowRight") {

                setPhoto(
                    currentIndex + 1
                );
            }
        }
    );

    // --------------------------------------------------
    // SAVE PROPERTY
    // --------------------------------------------------

    const savedKey =
        `atlas_saved_${property.id}`;

    const saveBtn =
        document.getElementById(
            "saveBtn"
        );

    const sync = () => {

        if (!saveBtn) {
            return;
        }

        saveBtn.textContent =
            localStorage.getItem(
                savedKey
            ) === "1"
                ? "♥ Saved Property"
                : "♡ Save Property";
    };

    saveBtn?.addEventListener(
        "click",
        () => {

            localStorage.setItem(
                savedKey,
                localStorage.getItem(
                    savedKey
                ) === "1"
                    ? "0"
                    : "1"
            );

            sync();
        }
    );

    sync();

    // --------------------------------------------------
    // SHARE
    // --------------------------------------------------

    document
        .getElementById("shareBtn")
        ?.addEventListener(
            "click",
            async () => {

                try {

                    await navigator.clipboard.writeText(
                        location.href
                    );

                    const button =
                        document.getElementById(
                            "shareBtn"
                        );

                    button.textContent =
                        "✓ Link Copied";

                    setTimeout(() => {

                        button.textContent =
                            "↗ Share Property";

                    }, 1800);

                } catch {

                    prompt(
                        "Copy this property link:",
                        location.href
                    );
                }
            }
        );

    // --------------------------------------------------
    // CONTACT MODAL
    // --------------------------------------------------

    const contactPhone = document.getElementById("contact-phone");
    if (contactPhone && window.intlTelInput) {
        window.propertyContactPhone = window.intlTelInput(contactPhone, {
            initialCountry: "us",
            separateDialCode: true,
            autoPlaceholder: "aggressive",
            loadUtils: () =>
                import("https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.0/build/js/utils.js")
        });
    }

    const modal =
        document.getElementById(
            "contactModal"
        );

    const openModal = () => {

        if (!modal) {
            return;
        }

        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        setTimeout(
            () =>
                modal
                    .querySelector(
                        "input[name=name]"
                    )
                    ?.focus(),
            50
        );
    };

    const closeModal = () => {

        if (!modal) {
            return;
        }

        modal.classList.remove(
            "open"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    };

    document
        .getElementById(
            "contactAgentBtn"
        )
        ?.addEventListener(
            "click",
            openModal
        );

    document
        .getElementById(
            "mobileContactAgentBtn"
        )
        ?.addEventListener(
            "click",
            openModal
        );

    document
        .getElementById(
            "emailAgentBtn"
        )
        ?.addEventListener(
            "click",
            openModal
        );

    document
        .getElementById(
            "closeContact"
        )
        ?.addEventListener(
            "click",
            closeModal
        );

    document
        .querySelectorAll(
            "[data-close-contact]"
        )
        .forEach(el =>
            el.addEventListener(
                "click",
                closeModal
            )
        );

    // --------------------------------------------------
    // CONTACT FORM
    // --------------------------------------------------

    document
        .getElementById(
            "contactForm"
        )
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                const form =
                    event.currentTarget;

                const submit =
                    form.querySelector(
                        "button[type=submit]"
                    );

                const status =
                    document.getElementById(
                        "formStatus"
                    );

                submit.disabled = true;

                submit.textContent =
                    "Sending…";

                status.textContent =
                    "";

                status.className =
                    "form-status";

                const data =
                    Object.fromEntries(
                        new FormData(
                            form
                        ).entries()
                    );

                    data.phone = window.propertyContactPhone?.getNumber() || data.phone;

                try {

                    // --------------------------------------------------
                    // PRODUCTION BACKEND
                    // --------------------------------------------------

                    const response =
                        await fetch(
                            "https://atlaspropertyglobal.onrender.com/api/contact",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        data
                                    )
                            }
                        );

                    const result =
                        await response
                            .json()
                            .catch(
                                () => ({})
                            );

                    if (!response.ok) {

                        throw new Error(
                            result.error ||
                            `Unable to send enquiry. Server returned ${response.status}.`
                        );
                    }

                    status.className =
                        "form-status success";

                    status.textContent =
                        "Your enquiry was sent successfully.";

                    form.reset();

                } catch (error) {

                    console.error(
                        "Contact form error:",
                        error
                    );

                    status.className =
                        "form-status error";

                    status.textContent =
                        error.message ||
                        "Unable to send enquiry. Please try again.";

                } finally {

                    submit.disabled =
                        false;

                    submit.textContent =
                        "Send enquiry";
                }
            }
        );

    // --------------------------------------------------
    // MORTGAGE CALCULATOR
    // --------------------------------------------------

    const calcFields = [
        "mortgagePrice",
        "mortgageDown",
        "mortgageRate",
        "mortgageTerm",
        "mortgageTaxes",
        "mortgageHoa",
        "mortgageInsurance"
    ].map(
        id =>
            document.getElementById(id)
    );

    const updateMortgage = () => {

        const price =
            Number(
                document.getElementById(
                    "mortgagePrice"
                )?.value
            ) || 0;

        const downPct =
            Math.min(
                100,
                Math.max(
                    0,
                    Number(
                        document.getElementById(
                            "mortgageDown"
                        )?.value
                    ) || 0
                )
            );

        const rate =
            Math.max(
                0,
                Number(
                    document.getElementById(
                        "mortgageRate"
                    )?.value
                ) || 0
            );

        const term =
            Number(
                document.getElementById(
                    "mortgageTerm"
                )?.value
            ) || 30;

        const taxes =
            Math.max(
                0,
                Number(
                    document.getElementById(
                        "mortgageTaxes"
                    )?.value
                ) || 0
            ) / 12;

        const hoa =
            Math.max(
                0,
                Number(
                    document.getElementById(
                        "mortgageHoa"
                    )?.value
                ) || 0
            );

        const insurance =
            Math.max(
                0,
                Number(
                    document.getElementById(
                        "mortgageInsurance"
                    )?.value
                ) || 0
            );

        const down =
            (price * downPct) / 100;

        const principal =
            Math.max(
                0,
                price - down
            );

        const pi =
            monthlyMortgage(
                principal,
                rate,
                term
            );

        const total =
            pi +
            taxes +
            hoa +
            insurance;

        const totalEl =
            document.getElementById(
                "mortgageTotal"
            );

        const breakdown =
            document.getElementById(
                "mortgageBreakdown"
            );

        if (totalEl) {

            totalEl.textContent =
                formatMoney(total);
        }

        if (breakdown) {

            breakdown.textContent =
                `Principal & interest ${formatMoney(
                    pi
                )} · Taxes ${formatMoney(
                    taxes
                )} · Insurance ${formatMoney(
                    insurance
                )} · HOA ${formatMoney(
                    hoa
                )}`;
        }
    };

    calcFields.forEach(
        field =>
            field?.addEventListener(
                "input",
                updateMortgage
            )
    );

    calcFields.forEach(
        field =>
            field?.addEventListener(
                "change",
                updateMortgage
            )
    );

    updateMortgage();

    // --------------------------------------------------
    // AI ASSISTANT
    // --------------------------------------------------

    const aiResponse =
        document.getElementById(
            "aiResponse"
        );

    const aiInput =
        document.getElementById(
            "aiInput"
        );

    const askAI = question => {

        if (aiResponse) {

            aiResponse.textContent =
                aiAnswer(question);
        }
    };

    document
        .querySelectorAll(
            "[data-ai-question]"
        )
        .forEach(btn =>
            btn.addEventListener(
                "click",
                () => {

                    if (aiInput) {

                        aiInput.value =
                            btn.dataset.aiQuestion;
                    }

                    askAI(
                        btn.dataset.aiQuestion
                    );
                }
            )
        );

    document
        .getElementById("aiSend")
        ?.addEventListener(
            "click",
            () => {

                const q =
                    aiInput?.value.trim();

                if (q) {
                    askAI(q);
                }
            }
        );

    aiInput?.addEventListener(
        "keydown",
        e => {

            if (e.key === "Enter") {

                e.preventDefault();

                document
                    .getElementById(
                        "aiSend"
                    )
                    ?.click();
            }
        }
    );

    // --------------------------------------------------
    // SIMILAR PROPERTIES
    // --------------------------------------------------

    const similarGrid =
        document.getElementById(
            "similarGrid"
        );

    if (similarGrid) {

        similarGrid.innerHTML =
            getSimilarProperties(
                property,
                4
            )
                .map(p => {

                    const href =
                        `property-details.html?slug=${encodeURIComponent(
                            createPropertySlug(p)
                        )}`;

                    const img =
                        p.primaryPhoto ||
                        p.photos?.[0] ||
                        "";

                    return `
                        <article class="mini-card">

                            <a href="${href}">

                                ${
                                    img
                                        ? `
                                            <img
                                                src="${escape(img)}"
                                                alt="${escape(
                                                    p.address ||
                                                    p.title ||
                                                    "Property"
                                                )}"
                                                loading="lazy"
                                                decoding="async"
                                            >
                                        `
                                        : `
                                            <div class="no-photo">
                                                No photo
                                            </div>
                                        `
                                }

                                <div>

                                    <strong>
                                        ${escape(
                                            formatPropertyPrice(
                                                p.price ??
                                                p.list_price
                                            )
                                        )}
                                    </strong>

                                    <h3>
                                        ${escape(
                                            p.address ||
                                            p.title ||
                                            "Property"
                                        )}
                                    </h3>

                                    <p>
                                        ${p.bedrooms ?? "—"}
                                        beds ·
                                        ${p.bathrooms ?? "—"}
                                        baths ·
                                        ${
                                            p.sqft
                                                ? Number(
                                                    p.sqft
                                                ).toLocaleString()
                                                : "—"
                                        }
                                        sqft
                                    </p>

                                </div>

                            </a>

                        </article>
                    `;
                })
                .join("");
    }

})();