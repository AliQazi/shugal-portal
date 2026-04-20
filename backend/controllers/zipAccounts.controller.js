/**
 * ZIP Accounts Controller (Simplified)
 * 
 * Controller for basic ZIP Accounts API operations
 * Uses helpers for complex queries that require filtering
 * 
 * @module controllers/zipAccounts
 */

import zipAccountsService from '../services/zipAccounts.service.js';
import {
  findAccountById,
  findAccountByName,
  findSubhead1ById,
  findSubhead2ById,
  findSubhead1ByName,
  findSubhead2ByName,
  getAccountsBySubhead2Id as findAccountsBySubhead2,
  getSubhead2BySubhead1Id as findSubhead2BySubhead1
} from '../utils/zipAccountHelper.js';

/**
 * Get all ZIP accounts
 */
export const getAllAccounts = async (req, res) => {
  try {
    const result = await zipAccountsService.getAllAccounts();
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Get All Accounts Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all subhead1 (chart of accounts level 1)
 */
export const getSubhead1 = async (req, res) => {
  try {
    const result = await zipAccountsService.getSubhead1();
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Get Subhead1 Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all subhead2 (chart of accounts level 2)
 */
export const getSubhead2 = async (req, res) => {
  try {
    const result = await zipAccountsService.getSubhead2();
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Get Subhead2 Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get account by ID
 */
export const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await findAccountById(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Get Account By ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get account by name
 */
export const getAccountByName = async (req, res) => {
  try {
    const { name } = req.params;
    const result = await findAccountByName(name);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Get Account By Name Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get subhead1 by ID
 */
export const getSubhead1ById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await findSubhead1ById(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Subhead1 not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Get Subhead1 By ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get subhead2 by ID
 */
export const getSubhead2ById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await findSubhead2ById(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Subhead2 not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Get Subhead2 By ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get subhead1 by name
 */
export const getSubhead1ByName = async (req, res) => {
  try {
    const { name } = req.params;
    const result = await findSubhead1ByName(name);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Subhead1 not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Get Subhead1 By Name Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get subhead2 by name
 */
export const getSubhead2ByName = async (req, res) => {
  try {
    const { name } = req.params;
    const result = await findSubhead2ByName(name);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Subhead2 not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Get Subhead2 By Name Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get accounts by subhead2 ID
 */
export const getAccountsBySubhead2Id = async (req, res) => {
  try {
    const { subhead2Id } = req.params;
    const result = await findAccountsBySubhead2(subhead2Id);
    
    res.status(200).json({
      success: true,
      data: result,
      count: result.length
    });
  } catch (error) {
    console.error("Get Accounts By Subhead2 ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get subhead2 by subhead1 ID
 */
export const getSubhead2BySubhead1Id = async (req, res) => {
  try {
    const { subhead1Id } = req.params;
    const result = await findSubhead2BySubhead1(subhead1Id);
    
    res.status(200).json({
      success: true,
      data: result,
      count: result.length
    });
  } catch (error) {
    console.error("Get Subhead2 By Subhead1 ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
