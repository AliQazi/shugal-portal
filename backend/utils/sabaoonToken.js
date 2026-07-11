import axios from "axios";
import FormData from "form-data";
import SabaoonToken from "../models/SabaoonToken.js";

// Refresh this many ms before the stored expiry, so a request never goes out
// with a token that's about to die mid-flight.
const EXPIRY_BUFFER_MS = 60 * 1000;

const getSabaoonCreds = () => ({
    baseURL: (
        process.env.sabbor_Base_URI?.trim() ||
        process.env.saboor_Base_URI?.trim() ||
        process.env.SABAOON_API_URL?.trim() ||
        ""
    ).replace(/\/+$/, ""),
    email:
        process.env.sabbor_email?.trim() ||
        process.env.saboor_email?.trim() ||
        process.env.SABAOON_EMAIL?.trim(),
    password:
        process.env.saboor_password?.trim() ||
        process.env.sabbor_password?.trim() ||
        process.env.SABAOON_PASSWORD?.trim(),
    agentCode:
        process.env.saboor_AgentCode?.trim() ||
        process.env.sabbor_AgentCode?.trim() ||
        process.env.SABAOON_AGENT_CODE?.trim(),
});

const isExpired = (expiry) => {
    if (!expiry) return true;
    return new Date(expiry).getTime() - EXPIRY_BUFFER_MS <= Date.now();
};

export const storeSabaoonToken = async (token, expiry) => {
    await SabaoonToken.deleteMany({});
    const newToken = new SabaoonToken({ token, expiry: new Date(expiry) });
    await newToken.save();
    console.log(`Sabaoon token stored, expires at: ${newToken.expiry}`);
    return newToken;
};

export const getSabaoonToken = async () => {
    return await SabaoonToken.findOne().sort({ createdAt: -1 });
};

// Dedupe concurrent logins so a burst of requests arriving after expiry
// doesn't fire off N parallel login calls against Sabaoon.
let pendingLogin = null;

const performLogin = async () => {
    const { baseURL, email, password, agentCode } = getSabaoonCreds();

    if (!baseURL || !email || !password || !agentCode) {
        throw new Error("Sabaoon login credentials are not set in environment variables");
    }

    const loginUrl = `${baseURL}/login`;

    const form = new FormData();
    form.append("email", email);
    form.append("password", password);
    form.append("agent_code", agentCode);

    const response = await axios.post(loginUrl, form, {
        headers: form.getHeaders(),
    });

    console.log("Sabaoon API Response:", JSON.stringify(response.data, null, 2));

    const { token, expiry, message } = response.data || {};

    if (!token || !expiry) {
        throw new Error(`Sabaoon login failed: ${message || "response did not include a token or expiry"}`);
    }

    const record = await storeSabaoonToken(token, expiry);
    console.log(`Sabaoon token refreshed, expires at: ${expiry}`);
    return record;
};

const login = () => {
    if (!pendingLogin) {
        pendingLogin = performLogin().finally(() => {
            pendingLogin = null;
        });
    }
    return pendingLogin;
};

// Returns a token guaranteed valid (not expired) for Sabaoon, regenerating
// and persisting a fresh one if needed.
export const getValidSabaoonToken = async () => {
    const record = await getSabaoonToken();

    if (record?.token && !isExpired(record.expiry)) {
        return record;
    }

    console.log("Sabaoon token is missing or expired — refreshing...");
    return login();
};

// Drops the cached token so the next getValidSabaoonToken() call is forced
// to log in again — used when Sabaoon rejects a token as invalid even though
// our stored expiry hadn't passed yet.
export const invalidateSabaoonToken = async () => {
    await SabaoonToken.deleteMany({});
};

// Initialize Sabaoon token on startup: if DB is empty or token is expired, login and save token
export const initializeSabaoonToken = async () => {
    try {
        await getValidSabaoonToken();
        console.log("Sabaoon token initialized successfully");
    } catch (error) {
        console.error("Error initializing Sabaoon token:", error.message);
    }
};
