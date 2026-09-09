require("dotenv").config();

const RAPID_API_KEY = (process.env.RAPID_API_KEY || "").trim();
const RAPID_API_HOST = (process.env.RAPID_API_HOST || "").trim();

function unwrapResponse(payload) {
    if (payload && Object.prototype.hasOwnProperty.call(payload, "data")) {
        return payload.data;
    }

    return payload;
}

async function getProperties(filters = {}) {

    const requestedLimit = Number(filters.limit);
    const listLimit = Number.isFinite(requestedLimit)
        ? Math.min(requestedLimit, 200)
        : 200;

    const body = {
        limit: listLimit,
        offset: Number(filters.offset) || 0,
        postal_code: filters.postal_code || "90004",
        status: ["for_sale", "ready_to_build"],
        sort: {
            direction: "desc",
            field: "list_date"
        }
    };

    if (filters.city) {
        body.city = filters.city;
        delete body.postal_code;
    }

    if (filters.state) {
        body.state_code = filters.state;
        delete body.postal_code;
    }

    console.log("REQUEST BODY");
    console.log(JSON.stringify(body, null, 2));

    const response = await fetch(
        "https://realty-in-us.p.rapidapi.com/properties/v3/list",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-rapidapi-key": RAPID_API_KEY,
                "x-rapidapi-host": RAPID_API_HOST
            },
            body: JSON.stringify(body)
        }
    );

    const data = await response.json();

    console.log("STATUS:", response.status);
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok) {
        throw new Error(`RapidAPI returned ${response.status}`);
    }

    if (data.errors && data.errors.length) {
        throw new Error(
            data.errors[0].extensions?.data?.message ||
            data.errors[0].message
        );
    }

    return unwrapResponse(data);
}

async function getPropertyDetails(propertyId) {

    const response = await fetch(
        `https://realty-in-us.p.rapidapi.com/properties/v3/detail?property_id=${encodeURIComponent(propertyId)}`,
        {
            method: "GET",
            headers: {
                "x-rapidapi-key": RAPID_API_KEY,
                "x-rapidapi-host": RAPID_API_HOST
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to fetch property details.");
    }

    return unwrapResponse(data);
}

async function getPropertyPhotos(propertyId) {

    const response = await fetch(
        `https://realty-in-us.p.rapidapi.com/properties/v3/get-photos?property_id=${encodeURIComponent(propertyId)}`,
        {
            method: "GET",
            headers: {
                "x-rapidapi-key": RAPID_API_KEY,
                "x-rapidapi-host": RAPID_API_HOST
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to fetch photos.");
    }

    return unwrapResponse(data);
}

async function getSimilarHomes(propertyId) {

    const response = await fetch(
        `https://realty-in-us.p.rapidapi.com/properties/v3/list-similar-homes?property_id=${encodeURIComponent(propertyId)}`,
        {
            method: "GET",
            headers: {
                "x-rapidapi-key": RAPID_API_KEY,
                "x-rapidapi-host": RAPID_API_HOST
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to fetch similar homes.");
    }

    return unwrapResponse(data);
}

module.exports = {
    getProperties,
    getPropertyDetails,
    getPropertyPhotos,
    getSimilarHomes
};