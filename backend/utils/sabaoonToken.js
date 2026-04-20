import axios from "axios";
import SabaoonToken from "../models/SabaoonToken.js";
import FormData from "form-data";

export const storeSabaoonToken = async (token, expiry) => {
    try {
        await SabaoonToken.deleteMany({});

        const newToken = new SabaoonToken({
            token,
            expiry: new Date(expiry),
        });

        await newToken.save();
        console.log("Sabaoon token stored successfully");
        return newToken;
    } catch (error) {
        console.error("Error storing Sabaoon token:", error);
        throw error;
    }
};

export const getSabaoonToken = async () => {
    return await SabaoonToken.findOne().sort({ createdAt: -1 });
};

export const isTokenValid = async () => {
    const record = await getSabaoonToken();
    if (!record || !record.token) return false;

    return new Date(record.expiry) > new Date();
};

// Hits the Sabaoon login API, stores the returned token, and returns it.
export const refreshSabaoonToken = async () => {
    const { SABAOON_API_URL, SABAOON_EMAIL, SABAOON_PASSWORD, SABAOON_AGENT_CODE } = process.env;

    if (!SABAOON_EMAIL || !SABAOON_PASSWORD || !SABAOON_AGENT_CODE) {
        throw new Error("Sabaoon login credentials are not set in environment variables (SABAOON_EMAIL, SABAOON_PASSWORD, SABAOON_AGENT_CODE)");
    }

    const loginUrl = `${SABAOON_API_URL}/login`;

    const form = new FormData();
    form.append("email", SABAOON_EMAIL);
    form.append("password", SABAOON_PASSWORD);
    form.append("agent_code", SABAOON_AGENT_CODE);

    const response = await axios.post(loginUrl, form, {
        headers: form.getHeaders(),
    });

    console.log("Sabaoon API Response:", JSON.stringify(response.data, null, 2));

    const { token, expiry } = response.data;

    if (!token || !expiry) {
        throw new Error("Sabaoon login response did not include a token or expiry");
    }

    await storeSabaoonToken(token, expiry);
    console.log(`Sabaoon token refreshed, expires at: ${expiry}`);
    return { token, expiry };
};

// Returns a valid Sabaoon token, automatically refreshing it if it has expired.
export const getValidSabaoonToken = async () => {
    const record = await getSabaoonToken();

    const isExpired = !record || !record.token || new Date(record.expiry) <= new Date();

    if (isExpired) {
        console.log("Sabaoon token is missing or expired — refreshing...");
        const { token, expiry } = await refreshSabaoonToken();
        return { token, expiry: new Date(expiry) };
    }

    return record;
};

// Initialize Sabaoon token on startup: if DB is empty or token is expired, login and save token
export const initializeSabaoonToken = async () => {
    try {
        const existingToken = await getSabaoonToken();
        const isExpired = !existingToken || !existingToken.token || new Date(existingToken.expiry) <= new Date();

        if (isExpired) {
            console.log("Sabaoon token is missing or expired. Logging in and saving fresh token...");
            await refreshSabaoonToken();
            console.log("Sabaoon token initialized successfully");
        } else {
            console.log("Sabaoon token already exists and is valid in database");
        }
    } catch (error) {
        console.error("Error initializing Sabaoon token:", error);
        throw error;
    }
};