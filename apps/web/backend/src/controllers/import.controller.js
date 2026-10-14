import { importService } from '../services/import.service.js';

export const preview = async (req, res) => {
  try {
    let content;

    if (req.file) {
      if (!req.file.buffer || req.file.buffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'The uploaded file is empty. Please select a valid CSV or Excel statement.',
        });
      }
      content = req.file.buffer;
    } else if (req.body && req.body.csvData) {
      if (typeof req.body.csvData !== 'string' || !req.body.csvData.trim()) {
        return res.status(400).json({
          success: false,
          message: 'The provided statement data is empty.',
        });
      }
      content = req.body.csvData;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded or csvData provided in request body',
      });
    }

    const result = await importService.preview(content);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Import Preview Error]:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to parse statement' });
  }
};

export const confirm = async (req, res) => {
  try {
    const { transactions, autoCreateGroups } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'An array of transactions is required for confirmation',
      });
    }

    const result = await importService.confirmImport(
      transactions,
      autoCreateGroups !== false
    );

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('[Import Confirm Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const importController = {
  preview,
  confirm,
};
