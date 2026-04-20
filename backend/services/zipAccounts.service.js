import axios from "axios";

// Load environment variables
const ZIP_ACCOUNTS_API_URL = process.env.ZIP_ACCOUNTS_API_URL;
const ZIP_ACCOUNTS_DB_PREFIX = process.env.ZIP_ACCOUNTS_DB_PREFIX;
const ZIP_ACCOUNTS_API_KEY = process.env.ZIP_ACCOUNTS_API_KEY;

// Create axios instance with default config
// Note: dbprefix is passed as a header, not query param or body
const zipAccountsAPI = axios.create({
  baseURL: ZIP_ACCOUNTS_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ZIP_ACCOUNTS_API_KEY}`,
    dbprefix: ZIP_ACCOUNTS_DB_PREFIX,
  },
  timeout: 10000, // Reduced from 30s to 10s
});

// Add response interceptor for error handling
zipAccountsAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("ZIP Accounts API Error:", error.response.data);
      throw new Error(
        error.response.data.message || "ZIP Accounts API request failed",
      );
    } else if (error.request) {
      console.error("ZIP Accounts API No Response:", error.request);
      throw new Error("No response from ZIP Accounts API");
    } else {
      console.error("ZIP Accounts API Error:", error.message);
      throw new Error(error.message);
    }
  },
);

/**
 * ZIP Accounts Service - Simplified
 * Provides access to chart of accounts and account listings
 */
class ZipAccountsService {
  /**
   * Get all accounts
   * @returns {Promise<Object>} List of accounts
   */
  async getAllAccounts() {
    try {
      const response = await zipAccountsAPI.get("/accounts/");
      return response.data;
    } catch (error) {
      console.error("❌ ZIP Accounts API Error:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }
  }

  /**
   * Get all subhead1 (chart of accounts level 1)
   * @returns {Promise<Object>} List of subhead1
   */
  async getSubhead1() {
    try {
      const response = await zipAccountsAPI.get("/subhead1/");
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch subhead1: ${error.message}`);
    }
  }

  /**
   * Get all subhead2 (chart of accounts level 2)
   * @returns {Promise<Object>} List of subhead2
   */
  async getSubhead2() {
    try {
      const response = await zipAccountsAPI.get("/subhead2/");
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch subhead2: ${error.message}`);
    }
  }

  /**
   * Get all chartheads
   * @returns {Promise<Object>} List of chartheads
   */
  async getChartheads() {
    try {
      const response = await zipAccountsAPI.get("/chartheads/");
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch chartheads: ${error.message}`);
    }
  }

  /**
   * Create new subhead2
   * @param {Object} data - Subhead2 data
   * @returns {Promise<Object>} Created subhead2
   */
  async createSubhead2(data) {
    try {
      const response = await zipAccountsAPI.post("/subhead2/", data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create subhead2: ${error.message}`);
    }
  }

  /**
   * Create new account
   * @param {Object} data - Account data
   * @returns {Promise<Object>} Created account
   */
  async createAccount(data) {
    try {
      const response = await zipAccountsAPI.post("/accounts/", data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create account: ${error.message}`);
    }
  }

  /**
   * Update Account
   * @param {Object} data - Account data
   * @returns {Promise<Object>} Created account
   */
  async updateAccount(data) {
    try {
      const response = await zipAccountsAPI.put(`accounts/${data.id}`, data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update account: ${error.message}`);
    }
  }
}

export default new ZipAccountsService();
