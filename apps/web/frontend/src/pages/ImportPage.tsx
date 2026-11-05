import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  Alert,
  CircularProgress,
  LinearProgress,
  Backdrop,
  Tooltip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  Snackbar,
} from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import RuleFolderRoundedIcon from '@mui/icons-material/RuleFolderRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import BookmarkAddRoundedIcon from '@mui/icons-material/BookmarkAddRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import { importService, IMPORT_BATCH_SIZE, importTimeout, ImportPreviewResponse, ImportProgress, ParsedTransactionPreview } from '../services/import.service';
import { categoryService } from '../services/category.service';
import { ruleService } from '../services/rule.service';
import { CategoryItem } from '../types/category';
import { SAMPLE_ICICI_STATEMENT } from '../data/sampleStatement';

import { useNavigate } from 'react-router-dom';

export interface ImportPageProps {
  onFinish?: () => void;
  onNavigateCategories?: () => void;
}

const STEPS = ['Upload Statement', 'Columns Mapping', 'Review & Categorize', 'Import Complete'];

export const ImportPage: React.FC<ImportPageProps> = ({ onFinish, onNavigateCategories }) => {
  const navigate = useNavigate();
  const handleFinish = onFinish || (() => navigate('/transactions'));
  const handleNavigateCategories = onNavigateCategories || (() => navigate('/categories'));
  const [activeStep, setActiveStep] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<'preview' | 'import' | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preview Result
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransactionPreview[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Confirmation Result
  const [importResult, setImportResult] = useState<{ importedCount: number; totalReceived: number } | null>(null);
  const [removedItemSnackbar, setRemovedItemSnackbar] = useState<string | null>(null);

  // Active filter for review table: 'all' | 'ready' | 'needs_review' | 'possible_dup' | 'confirmed_dup' | 'self'
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready' | 'needs_review' | 'possible_dup' | 'confirmed_dup' | 'self'>('all');

  // Load Categories for the manual dropdown
  useEffect(() => {
    categoryService
      .getAll()
      .then((data) => setCategories(data))
      .catch((err) => console.error('Failed to load categories', err));
  }, []);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setRawCsvText('');
      setError(null);
    }
  };

  // Load Sample Statement provided in user prompt
  const handleUseSample = () => {
    setFile(null);
    setRawCsvText(SAMPLE_ICICI_STATEMENT);
    setError(null);
  };

  // Parse and Preview via API
  const handleRunPreview = async () => {
    if (!file && !rawCsvText) {
      setError('Please choose a CSV/Excel file or click "Use Sample Statement"');
      return;
    }

    try {
      setLoading(true);
      setLoadingStage('preview');
      setError(null);
      const res = await importService.preview(file, rawCsvText || undefined);
      setPreviewData(res);
      setTransactions(res.transactions);
      setActiveStep(1); // Proceed to Column Mapping Step
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to parse statement');
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  };

  // Update Category manually on a transaction
  // Save as Rule Modal State
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [saveRulePattern, setSaveRulePattern] = useState('');
  const [saveRuleCategory, setSaveRuleCategory] = useState('');
  const [saveRuleMatchType, setSaveRuleMatchType] = useState<'contains' | 'exact' | 'prefix' | 'regex'>('contains');
  const [saveRulePriority, setSaveRulePriority] = useState<number>(60);
  const [saveRuleBank, setSaveRuleBank] = useState<string>('ALL');
  const [isSavingRule, setIsSavingRule] = useState<boolean>(false);

  const handleOpenSaveRule = (t: ParsedTransactionPreview) => {
    const rawPattern = t.detectedKeyword || t.description.split('-')[0].trim();
    setSaveRulePattern(rawPattern || t.description);
    setSaveRuleCategory(t.category);
    setSaveRuleMatchType(t.rawRemarks.toLowerCase().startsWith('f ') || t.rawRemarks.toLowerCase().startsWith('home') ? 'prefix' : 'contains');
    setSaveRulePriority(60);
    setSaveRuleBank(t.account || 'ALL');
    setRuleModalOpen(true);
  };

  const handleSaveRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveRulePattern.trim() || !saveRuleCategory.trim()) return;

    try {
      setIsSavingRule(true);
      await ruleService.create({
        pattern: saveRulePattern.trim(),
        matchType: saveRuleMatchType,
        category: saveRuleCategory.trim(),
        priority: Number(saveRulePriority) || 60,
        bank: saveRuleBank,
        isUserCreated: true,
      });
      setRuleModalOpen(false);
      alert(`Pattern "${saveRulePattern}" saved as reusable rule for "${saveRuleCategory}"!`);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save rule');
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleToggleExcludeTransfer = (tempId: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.tempId === tempId ? { ...t, excludeFromReport: !t.excludeFromReport } : t))
    );
  };

  const handleToggleTransfer = (tempId: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.tempId === tempId) {
          const nextIsTransfer = !t.isTransfer;
          return {
            ...t,
            isTransfer: nextIsTransfer,
            category: nextIsTransfer ? 'Transfer' : t.category === 'Transfer' ? 'Others' : t.category,
            excludeFromReport: nextIsTransfer,
          };
        }
        return t;
      })
    );
  };

  // Update Category manually on a transaction
  const handleCategoryChange = (tempId: string, newCategory: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.tempId === tempId) {
          const matched = categories.find((c) => c.name === newCategory);
          const defaultGroup = matched?.groups?.[0]?.name || '';
          const isTransferCat = newCategory.toLowerCase() === 'transfer';
          return {
            ...t,
            category: newCategory,
            group: defaultGroup,
            isNewGroup: false,
            needsReview: newCategory === 'Needs review',
            isTransfer: isTransferCat,
            excludeFromReport: isTransferCat ? true : t.excludeFromReport,
          };
        }
        return t;
      })
    );
  };

  // Update Group manually on a transaction
  const handleGroupChange = (tempId: string, newGroup: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.tempId === tempId ? { ...t, group: newGroup } : t))
    );
  };

  // Toggle transaction selection
  const handleToggleSelect = (tempId: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.tempId === tempId ? { ...t, selected: !t.selected } : t))
    );
  };

  // Toggle All Selection for currently visible/filtered transactions (excluding confirmed duplicates)
  const handleToggleSelectAll = (checked: boolean) => {
    const visibleIds = new Set(filteredTransactions.map((t) => t.tempId));
    setTransactions((prev) =>
      prev.map((t) => {
        if (visibleIds.has(t.tempId) && t.duplicateStatus !== 'confirmed') {
          return { ...t, selected: checked };
        }
        return t;
      })
    );
  };

  // Delete / Remove transaction row from import preview with 1 icon click
  const handleDeleteRow = (tempId: string, description: string) => {
    setTransactions((prev) => prev.filter((t) => t.tempId !== tempId));
    setRemovedItemSnackbar(`Removed "${description || 'transaction'}" from import`);
  };

  // Change Status manually (Ready, Needs Review, Possible Dup, Confirmed Dup, Self)
  const handleStatusChange = (
    tempId: string,
    newStatus: 'ready' | 'needs_review' | 'possible_dup' | 'confirmed_dup' | 'self'
  ) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.tempId !== tempId) return t;

        switch (newStatus) {
          case 'self':
            return {
              ...t,
              isSelf: true,
              isTransfer: true,
              transferStatus: 'self',
              category: 'Transfer',
              group: 'Internal Transfer',
              duplicateStatus: 'none',
              isDuplicate: false,
              needsReview: false,
              excludeFromReport: true,
              selected: true,
            };

          case 'ready':
            return {
              ...t,
              isSelf: false,
              isTransfer: false,
              duplicateStatus: 'none',
              isDuplicate: false,
              needsReview: false,
              selected: true,
              category: t.category === 'Needs review' || t.category === 'Transfer' ? 'Others' : t.category,
            };

          case 'needs_review':
            return {
              ...t,
              isSelf: false,
              duplicateStatus: 'none',
              isDuplicate: false,
              needsReview: true,
              selected: true,
            };

          case 'possible_dup':
            return {
              ...t,
              isSelf: false,
              duplicateStatus: 'possible',
              isDuplicate: true,
              needsReview: true,
              selected: true,
            };

          case 'confirmed_dup':
            return {
              ...t,
              isSelf: false,
              duplicateStatus: 'confirmed',
              isDuplicate: true,
              needsReview: false,
              selected: false,
            };

          default:
            return t;
        }
      })
    );
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    const uncategorized = transactions.filter((transaction) =>
      transaction.selected && transaction.duplicateStatus !== 'confirmed' && !isSelf(transaction) &&
      !categories.some((category) => category.name === transaction.category)
    );
    if (uncategorized.length > 0) {
      setError(`Choose a category from Category & Group Master for each selected row (${uncategorized.length} still need one).`);
      return;
    }

    const masterAlignedTransactions = transactions.map((transaction) => {
      const category = categories.find((item) => item.name === transaction.category);
      const groupIsValid = category?.groups.some((group) => group.name === transaction.group);
      return {
        ...transaction,
        group: groupIsValid ? transaction.group : (category?.groups[0]?.name || null),
      };
    });

    try {
      setLoading(true);
      setLoadingStage('import');
      setImportProgress({ completed: 0, total: selectedCount, imported: 0, batch: 1, batchCount: Math.ceil(selectedCount / IMPORT_BATCH_SIZE) });
      setError(null);
      const res = await importService.confirm(masterAlignedTransactions, setImportProgress);
      setImportResult({
        importedCount: res.importedCount,
        totalReceived: res.totalReceived,
      });
      setActiveStep(3); // Step 4 Complete
    } catch (err: any) {
      const progress = err?.importProgress as ImportProgress | undefined;
      const detail = err?.code === 'ECONNABORTED'
        ? 'The current batch timed out. It may still finish on the server; review the ledger before retrying. Retrying skips transactions already saved.'
        : err?.response?.data?.message || err?.message || 'Failed to import transactions';
      setError(progress && progress.completed > 0
        ? `${progress.completed} of ${progress.total} rows were confirmed before the error. ${detail}`
        : detail);
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  };

  const isConfirmedDup = (t: ParsedTransactionPreview) => t.duplicateStatus === 'confirmed';
  const isPossibleDup = (t: ParsedTransactionPreview) => t.duplicateStatus === 'possible';
  const isSelf = (t: ParsedTransactionPreview) =>
    Boolean(
      t.isSelf ||
      t.transferStatus === 'self' ||
      t.category === 'Transfer' ||
      /\bself\b/i.test(`${t.description || ''} ${t.rawRemarks || ''}`) ||
      `${t.description || ''} ${t.rawRemarks || ''}`.toLowerCase().includes('own account')
    );
  const isReview = (t: ParsedTransactionPreview) =>
    !isSelf(t) && (t.needsReview || t.category === 'Needs review');
  const isCleanReady = (t: ParsedTransactionPreview) =>
    !isConfirmedDup(t) && !isPossibleDup(t) && !isSelf(t) && !isReview(t);

  const selectedCount = transactions.filter((t) => t.selected && t.duplicateStatus !== 'confirmed').length;
  const confirmedDuplicatesCount = transactions.filter(isConfirmedDup).length;
  const possibleDuplicatesCount = transactions.filter(isPossibleDup).length;
  const selfCount = transactions.filter(isSelf).length;
  const needsReviewCount = transactions.filter(isReview).length;
  const readyCount = transactions.filter(isCleanReady).length;
  const newGroupCount = transactions.filter((t) => t.isNewGroup).length;

  const filteredTransactions = transactions.filter((t) => {
    switch (activeFilter) {
      case 'self':
        return isSelf(t);
      case 'needs_review':
        return isReview(t);
      case 'possible_dup':
        return isPossibleDup(t);
      case 'confirmed_dup':
        return isConfirmedDup(t);
      case 'ready':
        return isCleanReady(t);
      case 'all':
      default:
        return true;
    }
  });

  const handleFilterClick = (filter: 'all' | 'ready' | 'needs_review' | 'possible_dup' | 'confirmed_dup' | 'self') => {
    setActiveFilter((prev) => (prev === filter ? 'all' : filter));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, pb: 6 }}>
      <Backdrop open={loading} sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: '#fff', flexDirection: 'column', gap: 2 }}>
        <CircularProgress color="inherit" size={42} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {loadingStage === 'preview' ? 'Reading and checking statement…' : 'Importing transactions…'}
        </Typography>
        {loadingStage === 'import' && importProgress && (
          <Box sx={{ width: 'min(360px, 85vw)', textAlign: 'center' }}>
            <LinearProgress variant="determinate" value={importProgress.total > 0 ? importProgress.completed / importProgress.total * 100 : 0} sx={{ height: 8, borderRadius: 4 }} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {importProgress.completed} of {importProgress.total} rows confirmed
            </Typography>
            <Typography variant="caption">
              Batch {Math.min(importProgress.batch, importProgress.batchCount)} of {importProgress.batchCount} · up to {Math.ceil(importTimeout(Math.min(IMPORT_BATCH_SIZE, importProgress.total)) / 1000)} seconds per batch
            </Typography>
          </Box>
        )}
      </Backdrop>
      {/* Top Header Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 3.5,
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.5,
              bgcolor: 'primary.main',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloudUploadRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Bank Statement Importer
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload Excel (.xlsx, .xls) or CSV statement. Automatically maps columns, detects duplicates, and assigns categories.
            </Typography>
          </Box>
        </Box>

        {/* Stepper Progress */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #f1f5f9' }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* ---------------- STEP 0: Upload Screen ---------------- */}
      {activeStep === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3.5,
            border: '2px dashed #cbd5e1',
            bgcolor: '#ffffff',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2.5,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: 'color-mix(in srgb, var(--app-primary) 8%, transparent)',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloudUploadRoundedIcon sx={{ fontSize: 36 }} />
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Drag and drop your Bank Statement
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supports <strong>.xlsx, .xls, .csv</strong> (e.g. ICICI Bank, SBI, HDFC detailed statements)
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<DescriptionRoundedIcon />}
              sx={{ px: 3, py: 1.2, fontWeight: 600 }}
            >
              Choose Excel / CSV File
              <input
                type="file"
                hidden
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              startIcon={<AutoFixHighRoundedIcon />}
              onClick={handleUseSample}
              sx={{ px: 2.5, py: 1.2, fontWeight: 600 }}
            >
              Use Sample ICICI Statement
            </Button>
          </Box>

          {/* Selected File Status */}
          {(file || rawCsvText) && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                width: '100%',
                maxWidth: 520,
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircleRoundedIcon color="success" />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {file ? file.name : 'ICICI Sample Detailed Statement (99 records)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Pre-loaded verified bank statement'}
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="contained"
                color="primary"
                endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardRoundedIcon />}
                disabled={loading}
                onClick={handleRunPreview}
                sx={{ fontWeight: 600 }}
              >
                Continue
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* ---------------- STEP 1: Columns Mapping (Auto-Detected) ---------------- */}
      {activeStep === 1 && previewData && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Alert severity="success" icon={<CheckRoundedIcon />} sx={{ borderRadius: 2.5 }}>
            <strong>Columns Detected Automatically!</strong> Fixed statement columns were matched with zero manual configuration.
          </Alert>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              borderRadius: 3.5,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Detected Statement Columns
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Account: <strong>{previewData.accountName}</strong> · Header Row: #{previewData.headerRowIndex + 1}
                </Typography>
              </Box>
              <Chip
                label="Auto-Mapped"
                color="success"
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Box>

            {/* Mappings Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 2,
              }}
            >
              {[
                { label: 'Date Column', mapped: 'Transaction Date / Value Date', status: 'Matched' },
                { label: 'Narration / Remarks', mapped: 'Transaction Remarks', status: 'Matched' },
                { label: 'Withdrawal (Expense)', mapped: 'Withdrawal Amount(INR)', status: 'Matched' },
                { label: 'Deposit (Income)', mapped: 'Deposit Amount(INR)', status: 'Matched' },
                { label: 'Balance Column', mapped: 'Balance(INR)', status: 'Matched' },
                { label: 'Reference / Txn ID', mapped: 'UPI Reference & Hash', status: 'Matched' },
              ].map((item) => (
                <Card key={item.label} variant="outlined" sx={{ borderRadius: 2.5, p: 1 }}>
                  <CardContent sx={{ p: '12px !important' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.3, color: 'primary.main' }}>
                      {item.mapped}
                    </Typography>
                    <Chip
                      icon={<CheckRoundedIcon fontSize="small" />}
                      label={item.status}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.65rem', mt: 0.8 }}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* Navigation Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: '1px solid #f1f5f9' }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => setActiveStep(0)}
                sx={{ fontWeight: 600 }}
              >
                Back to Upload
              </Button>

              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => setActiveStep(2)}
                sx={{ px: 3, fontWeight: 600 }}
              >
                Proceed to Review & Categorization ({previewData.totalRows} Rows)
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* ---------------- STEP 2: Review, Categorization & Duplicate Check ---------------- */}
      {activeStep === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Summary Banner */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Tooltip title={activeFilter === 'all' ? 'Currently showing all transactions' : 'Click to filter: Show all transactions'} arrow>
                <Chip
                  label={`Total: ${transactions.length}`}
                  variant={activeFilter === 'all' ? 'filled' : 'outlined'}
                  clickable
                  onClick={() => handleFilterClick('all')}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    ...(activeFilter === 'all'
                      ? {
                          bgcolor: '#1e293b',
                          color: '#ffffff',
                          boxShadow: '0 3px 10px rgba(30, 41, 59, 0.25)',
                          transform: 'scale(1.03)',
                        }
                      : {
                          borderColor: '#cbd5e1',
                          color: '#475569',
                          '&:hover': { bgcolor: '#f1f5f9', transform: 'translateY(-1px)' },
                        }),
                  }}
                />
              </Tooltip>

              <Tooltip title={activeFilter === 'ready' ? 'Currently showing ready transactions' : 'Click to filter: Ready to import'} arrow>
                <Chip
                  label={`Ready to Import: ${readyCount}`}
                  color="success"
                  variant={activeFilter === 'ready' ? 'filled' : 'outlined'}
                  clickable
                  onClick={() => handleFilterClick('ready')}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    ...(activeFilter === 'ready'
                      ? {
                          bgcolor: '#10b981',
                          color: '#ffffff',
                          boxShadow: '0 0 0 2px #ffffff, 0 0 0 4px #10b981, 0 4px 12px rgba(16, 185, 129, 0.35)',
                          transform: 'scale(1.04)',
                        }
                      : {
                          '&:hover': { transform: 'translateY(-1px)', bgcolor: '#ecfdf5' },
                        }),
                  }}
                />
              </Tooltip>

              {confirmedDuplicatesCount > 0 && (
                <Tooltip title={activeFilter === 'confirmed_dup' ? 'Currently showing confirmed duplicates' : 'Click to filter: Confirmed duplicates'} arrow>
                  <Chip
                    icon={<BlockRoundedIcon />}
                    label={`Confirmed Duplicates: ${confirmedDuplicatesCount}`}
                    color="error"
                    variant={activeFilter === 'confirmed_dup' ? 'filled' : 'outlined'}
                    clickable
                    onClick={() => handleFilterClick('confirmed_dup')}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      ...(activeFilter === 'confirmed_dup'
                        ? {
                            bgcolor: '#ef4444',
                            color: '#ffffff',
                            boxShadow: '0 0 0 2px #ffffff, 0 0 0 4px #ef4444, 0 4px 12px rgba(239, 68, 68, 0.35)',
                            transform: 'scale(1.04)',
                          }
                        : {
                            '&:hover': { transform: 'translateY(-1px)', bgcolor: '#fff1f2' },
                          }),
                    }}
                  />
                </Tooltip>
              )}

              {possibleDuplicatesCount > 0 && (
                <Tooltip title={activeFilter === 'possible_dup' ? 'Currently showing possible duplicates' : 'Click to filter: Possible duplicates'} arrow>
                  <Chip
                    icon={<WarningAmberRoundedIcon />}
                    label={`Possible Duplicates: ${possibleDuplicatesCount}`}
                    color="warning"
                    variant={activeFilter === 'possible_dup' ? 'filled' : 'outlined'}
                    clickable
                    onClick={() => handleFilterClick('possible_dup')}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      ...(activeFilter === 'possible_dup'
                        ? {
                            bgcolor: '#f59e0b',
                            color: '#ffffff',
                            boxShadow: '0 0 0 2px #ffffff, 0 0 0 4px #f59e0b, 0 4px 12px rgba(245, 158, 11, 0.35)',
                            transform: 'scale(1.04)',
                          }
                        : {
                            '&:hover': { transform: 'translateY(-1px)', bgcolor: '#fffbeb' },
                          }),
                    }}
                  />
                </Tooltip>
              )}

              {(needsReviewCount > 0 || activeFilter === 'needs_review') && (
                <Tooltip title={activeFilter === 'needs_review' ? 'Currently showing transactions needing review' : 'Click to filter: Needs review'} arrow>
                  <Chip
                    icon={<WarningAmberRoundedIcon />}
                    label={`Needs Review: ${needsReviewCount}`}
                    clickable
                    onClick={() => handleFilterClick('needs_review')}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      bgcolor: activeFilter === 'needs_review' ? '#d97706' : '#fffbeb',
                      color: activeFilter === 'needs_review' ? '#ffffff' : '#b45309',
                      border: '1px solid',
                      borderColor: activeFilter === 'needs_review' ? '#d97706' : '#fde68a',
                      ...(activeFilter === 'needs_review'
                        ? {
                            boxShadow: '0 0 0 2px #ffffff, 0 0 0 4px #d97706, 0 4px 12px rgba(217, 119, 6, 0.35)',
                            transform: 'scale(1.04)',
                          }
                        : {
                            '&:hover': { transform: 'translateY(-1px)', bgcolor: '#fef3c7' },
                          }),
                    }}
                  />
                </Tooltip>
              )}

              {selfCount > 0 && (
                <Tooltip title={activeFilter === 'self' ? 'Currently showing self transactions' : 'Click to filter: Self transactions'} arrow>
                  <Chip
                    icon={<SyncAltRoundedIcon />}
                    label={`Self: ${selfCount}`}
                    clickable
                    onClick={() => handleFilterClick('self')}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      bgcolor: activeFilter === 'self' ? 'var(--app-primary)' : 'color-mix(in srgb, var(--app-primary) 12%, white)',
                      color: activeFilter === 'self' ? '#ffffff' : '#6d28d9',
                      border: '1px solid',
                      borderColor: 'var(--app-primary)',
                      ...(activeFilter === 'self'
                        ? {
                            boxShadow: '0 0 0 2px #ffffff, 0 0 0 4px var(--app-primary), 0 4px 12px color-mix(in srgb, var(--app-primary) 35%, transparent)',
                            transform: 'scale(1.04)',
                          }
                        : {
                            '&:hover': { transform: 'translateY(-1px)', bgcolor: '#ddd6fe' },
                          }),
                    }}
                  />
                </Tooltip>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => setActiveStep(1)}
                sx={{ fontWeight: 600 }}
              >
                Back
              </Button>

              <Button
                variant="contained"
                color="primary"
                disabled={selectedCount === 0 || loading}
                onClick={handleConfirmImport}
                endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckRoundedIcon />}
                sx={{ px: 3, fontWeight: 600 }}
              >
                Import {selectedCount} Transactions
              </Button>
            </Box>
          </Paper>

          {/* Transactions Review Table */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3.5,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              bgcolor: '#ffffff',
            }}
          >
            {/* Active Filter Bar */}
            {activeFilter !== 'all' && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 3,
                  py: 1.2,
                  bgcolor:
                    activeFilter === 'self'
                      ? '#f5f3ff'
                      : activeFilter === 'needs_review'
                      ? '#fffbeb'
                      : activeFilter === 'possible_dup'
                      ? '#fff7ed'
                      : activeFilter === 'confirmed_dup'
                      ? '#fff1f2'
                      : '#f0fdf4',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterAltRoundedIcon
                    fontSize="small"
                    sx={{
                      color:
                        activeFilter === 'self'
                          ? 'var(--app-primary)'
                          : activeFilter === 'needs_review'
                          ? '#b45309'
                          : activeFilter === 'possible_dup'
                          ? '#c2410c'
                          : activeFilter === 'confirmed_dup'
                          ? '#b91c1c'
                          : '#15803d',
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>
                    Showing {filteredTransactions.length} of {transactions.length} transactions
                    <span style={{ fontWeight: 500, color: '#64748b', marginLeft: 6 }}>
                      (Filter:{' '}
                      <strong style={{ color: '#0f172a' }}>
                        {activeFilter === 'self'
                          ? 'Self'
                          : activeFilter === 'needs_review'
                          ? 'Needs Review'
                          : activeFilter === 'possible_dup'
                          ? 'Possible Duplicates'
                          : activeFilter === 'confirmed_dup'
                          ? 'Confirmed Duplicates'
                          : 'Ready to Import'}
                      </strong>
                      )
                    </span>
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => setActiveFilter('all')}
                  startIcon={<CloseRoundedIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    py: 0.3,
                    color: '#475569',
                    bgcolor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#f1f5f9' },
                  }}
                >
                  Show All ({transactions.length})
                </Button>
              </Box>
            )}

            <TableContainer sx={{ maxHeight: 620 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={
                          filteredTransactions.filter((t) => t.duplicateStatus !== 'confirmed').length > 0 &&
                          filteredTransactions.filter((t) => t.duplicateStatus !== 'confirmed' && t.selected).length > 0 &&
                          filteredTransactions.filter((t) => t.duplicateStatus !== 'confirmed' && t.selected).length <
                            filteredTransactions.filter((t) => t.duplicateStatus !== 'confirmed').length
                        }
                        checked={
                          filteredTransactions.filter((t) => t.duplicateStatus !== 'confirmed').length > 0 &&
                          filteredTransactions.filter((t) => t.duplicateStatus !== 'confirmed' && t.selected).length ===
                            filteredTransactions.filter((t) => t.duplicateStatus !== 'confirmed').length
                        }
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>DATE</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', minWidth: 220 }}>PAYEE / NARRATION</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>TYPE</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>AMOUNT</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', minWidth: 200 }}>
                      CATEGORY & RULE
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', minWidth: 150 }}>
                      GROUP
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', minWidth: 160 }}>
                      TRANSFER / EXCLUSION
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', minWidth: 155 }}>STATUS</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', width: 64 }}>ACTION</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 7 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                          <CheckCircleRoundedIcon sx={{ fontSize: 48, color: '#10b981' }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {activeFilter === 'self'
                              ? 'No Self Transactions'
                              : activeFilter === 'needs_review'
                              ? 'All Transactions Reviewed! 🎉'
                              : activeFilter === 'confirmed_dup'
                              ? 'No Confirmed Duplicates'
                              : activeFilter === 'possible_dup'
                              ? 'No Possible Duplicates'
                              : 'No transactions found for this filter'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
                            {activeFilter === 'self'
                              ? 'All self transactions have been removed or resolved.'
                              : activeFilter === 'needs_review'
                              ? 'Every transaction in this statement has been categorized and verified.'
                              : 'There are no transactions matching the selected filter criteria.'}
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setActiveFilter('all')}
                            sx={{ mt: 1, fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
                          >
                            View All Transactions ({transactions.length})
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((t) => {
                    const isExpense = t.type === 'expense';
                    const isConfirmedDup = t.duplicateStatus === 'confirmed';
                    const isPossibleDup = t.duplicateStatus === 'possible';
                    const isRowSelf = isSelf(t);
                    const isReviewRow = !isRowSelf && (t.needsReview || t.category === 'Needs review');
                    const availableGroups = categories.find((c) => c.name === t.category)?.groups || [];

                    return (
                      <TableRow
                        key={t.tempId}
                        hover
                        selected={t.selected}
                        sx={{
                          opacity: isConfirmedDup ? 0.6 : 1,
                          bgcolor: isConfirmedDup
                            ? '#fff1f2'
                            : isPossibleDup
                            ? '#fffbeb'
                            : isRowSelf
                            ? '#faf5ff'
                            : t.selected
                            ? 'color-mix(in srgb, var(--app-primary) 2%, transparent)'
                            : 'inherit',
                        }}
                      >
                        {/* Checkbox */}
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={t.selected && !isConfirmedDup}
                            disabled={isConfirmedDup}
                            onChange={() => handleToggleSelect(t.tempId)}
                          />
                        </TableCell>

                        {/* Date */}
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'text.secondary' }}>
                          {t.date}
                        </TableCell>

                        {/* Description & clean payee */}
                        <TableCell sx={{ maxWidth: 280 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }} noWrap>
                            {t.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.72rem' }}>
                            {t.rawRemarks}
                          </Typography>
                          {t.reference && (
                            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'primary.main', display: 'block' }}>
                              Ref: {t.reference}
                            </Typography>
                          )}
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <Chip
                            label={t.type.toUpperCase()}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              bgcolor: isExpense ? '#fef2f2' : '#ecfdf5',
                              color: isExpense ? '#b91c1c' : '#047857',
                            }}
                          />
                        </TableCell>

                        {/* Amount */}
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            color: isExpense ? 'error.main' : 'success.main',
                          }}
                        >
                          {isExpense ? '−' : '+'}₹{t.amount.toLocaleString('en-IN')}
                        </TableCell>

                        {/* Category Selector + Save As Rule */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FormControl size="small" fullWidth>
                              <Select
                                value={categories.some((category) => category.name === t.category) ? t.category : ''}
                                onChange={(e) => handleCategoryChange(t.tempId, e.target.value)}
                                sx={{
                                  fontSize: '0.82rem',
                                  height: 32,
                                  borderRadius: 1.5,
                                  bgcolor: '#ffffff',
                                }}
                              >
                                <MenuItem value="" disabled sx={{ fontSize: '0.82rem' }}>
                                  {categories.length ? 'Select a category' : 'Loading categories…'}
                                </MenuItem>
                                {categories.map((c) => (
                                  <MenuItem key={c.id} value={c.name} sx={{ fontSize: '0.82rem' }}>
                                    {c.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Tooltip title="Save as reusable categorization rule">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenSaveRule(t)}
                                sx={{ color: 'primary.main', border: '1px solid #e2e8f0', p: 0.6 }}
                              >
                                <BookmarkAddRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          {t.detectedKeyword && (
                            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'success.dark', display: 'block', mt: 0.3 }}>
                              Rule: "{t.detectedKeyword}"
                            </Typography>
                          )}
                        </TableCell>

                        {/* Group Selection */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {availableGroups.length > 0 ? (
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={availableGroups.find((group) => group.name === t.group)?.name || availableGroups[0]?.name || ''}
                                  onChange={(e) => handleGroupChange(t.tempId, e.target.value)}
                                  sx={{
                                    fontSize: '0.82rem',
                                    height: 32,
                                    borderRadius: 1.5,
                                    bgcolor: '#ffffff',
                                  }}
                                >
                                  {availableGroups.map((g) => (
                                    <MenuItem key={g.id} value={g.name} sx={{ fontSize: '0.82rem' }}>
                                      {g.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : (
                              <Chip
                                label="No groups in Category & Group Master"
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 24,
                                  fontSize: '0.75rem',
                                  borderColor: t.isNewGroup ? 'warning.main' : '#cbd5e1',
                                  color: t.isNewGroup ? 'warning.dark' : 'text.secondary',
                                }}
                              />
                            )}
                          </Box>
                        </TableCell>

                        {/* Transfer & Exclusion Column */}
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                icon={<SwapHorizRoundedIcon fontSize="small" />}
                                label={t.isTransfer ? (t.transferStatus === 'linked' ? 'Linked Transfer' : 'Transfer') : 'Not Transfer'}
                                size="small"
                                onClick={() => handleToggleTransfer(t.tempId)}
                                sx={{
                                  height: 22,
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  bgcolor: t.isTransfer ? '#eff6ff' : '#f1f5f9',
                                  color: t.isTransfer ? '#1d4ed8' : '#64748b',
                                }}
                              />
                            </Box>
                            {t.isTransfer && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Checkbox
                                  size="small"
                                  checked={t.excludeFromReport ?? true}
                                  onChange={() => handleToggleExcludeTransfer(t.tempId)}
                                  sx={{ p: 0 }}
                                />
                                <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                                  Exclude from Reports
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>

                        {/* Interactive Status Selector */}
                        <TableCell align="center">
                          <FormControl size="small" sx={{ width: '100%', minWidth: 145 }}>
                            <Select
                              value={
                                isConfirmedDup
                                  ? 'confirmed_dup'
                                  : isPossibleDup
                                  ? 'possible_dup'
                                  : isRowSelf
                                  ? 'self'
                                  : isReviewRow
                                  ? 'needs_review'
                                  : 'ready'
                              }
                              onChange={(e) =>
                                handleStatusChange(
                                  t.tempId,
                                  e.target.value as 'ready' | 'needs_review' | 'possible_dup' | 'confirmed_dup' | 'self'
                                )
                              }
                              sx={{
                                height: 28,
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                borderRadius: 2,
                                bgcolor: isConfirmedDup
                                  ? '#fff1f2'
                                  : isPossibleDup
                                  ? '#fff7ed'
                                  : isRowSelf
                                  ? '#ede9fe'
                                  : isReviewRow
                                  ? '#fffbeb'
                                  : '#ecfdf5',
                                color: isConfirmedDup
                                  ? '#b91c1c'
                                  : isPossibleDup
                                  ? '#c2410c'
                                  : isRowSelf
                                  ? '#6d28d9'
                                  : isReviewRow
                                  ? '#b45309'
                                  : '#047857',
                                border: `1px solid ${
                                  isConfirmedDup
                                    ? '#fecdd3'
                                    : isPossibleDup
                                    ? '#fed7aa'
                                    : isRowSelf
                                    ? '#ddd6fe'
                                    : isReviewRow
                                    ? '#fde68a'
                                    : '#a7f3d0'
                                }`,
                                '& .MuiSelect-select': {
                                  py: 0.3,
                                  px: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  border: 'none',
                                },
                              }}
                            >
                              <MenuItem value="ready" sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#047857' }}>
                                <CheckRoundedIcon sx={{ mr: 0.8, color: '#059669', fontSize: 16 }} />
                                Ready to Import
                              </MenuItem>
                              <MenuItem value="self" sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#6d28d9' }}>
                                <SyncAltRoundedIcon sx={{ mr: 0.8, color: 'primary.main', fontSize: 16 }} />
                                Self
                              </MenuItem>
                              <MenuItem value="needs_review" sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#b45309' }}>
                                <WarningAmberRoundedIcon sx={{ mr: 0.8, color: '#d97706', fontSize: 16 }} />
                                Needs Review
                              </MenuItem>
                              <MenuItem value="possible_dup" sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#c2410c' }}>
                                <WarningAmberRoundedIcon sx={{ mr: 0.8, color: '#ea580c', fontSize: 16 }} />
                                Possible Dup
                              </MenuItem>
                              <MenuItem value="confirmed_dup" sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#b91c1c' }}>
                                <BlockRoundedIcon sx={{ mr: 0.8, color: '#dc2626', fontSize: 16 }} />
                                Confirmed Dup
                              </MenuItem>
                            </Select>
                          </FormControl>
                          {t.duplicateReason && (
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{
                                display: 'block',
                                fontSize: '0.65rem',
                                color: 'text.secondary',
                                mt: 0.3,
                                maxWidth: 155,
                              }}
                              title={t.duplicateReason}
                            >
                              {t.duplicateReason}
                            </Typography>
                          )}
                        </TableCell>

                        {/* 1-Click Delete Action */}
                        <TableCell align="center">
                          <Tooltip title="Delete transaction from import" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteRow(t.tempId, t.description)}
                              sx={{
                                color: '#ef4444',
                                bgcolor: '#fff1f2',
                                border: '1px solid #fecdd3',
                                p: 0.6,
                                transition: 'all 0.2s',
                                '&:hover': {
                                  color: '#ffffff',
                                  bgcolor: '#dc2626',
                                  borderColor: '#dc2626',
                                },
                              }}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* ---------------- STEP 3: Complete Screen ---------------- */}
      {activeStep === 3 && importResult && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 6 },
            borderRadius: 3.5,
            border: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'success.light',
              color: 'success.dark',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircleRoundedIcon sx={{ fontSize: 44 }} />
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              Import Completed Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              <strong>{importResult.importedCount}</strong> new transactions were imported and saved to the database.
            </Typography>
            {confirmedDuplicatesCount > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {confirmedDuplicatesCount} duplicate transactions were detected and safely skipped.
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleFinish}
              sx={{ px: 3, py: 1.2, fontWeight: 600 }}
            >
              View in Transactions Ledger
            </Button>

            <Button
              variant="outlined"
              onClick={() => {
                setActiveStep(0);
                setFile(null);
                setRawCsvText('');
                setPreviewData(null);
                setTransactions([]);
                setImportResult(null);
              }}
              sx={{ px: 2.5, py: 1.2, fontWeight: 600 }}
            >
              Import Another Statement
            </Button>
          </Box>
        </Paper>
      )}

      {/* Save Reusable Rule Dialog */}
      <Dialog open={ruleModalOpen} onClose={() => setRuleModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Save Categorization Rule</DialogTitle>
        <form onSubmit={handleSaveRuleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Save this narration pattern as a reusable rule. Future imports matching this pattern will automatically be assigned to this category.
            </Typography>
            <TextField
              label="Match Pattern / Keyword"
              value={saveRulePattern}
              onChange={(e) => setSaveRulePattern(e.target.value)}
              required
              fullWidth
              size="small"
              helperText="E.g., ZERODHA, SWIGGY, or prefix like 'f ' / 'home'"
            />
            <FormControl fullWidth size="small">
              <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600 }}>
                Category
              </Typography>
              <Select
                value={saveRuleCategory}
                onChange={(e) => setSaveRuleCategory(e.target.value)}
                required
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600 }}>
                Matching Type
              </Typography>
              <Select
                value={saveRuleMatchType}
                onChange={(e) => setSaveRuleMatchType(e.target.value as any)}
              >
                <MenuItem value="contains">Contains (matches anywhere in description/remarks)</MenuItem>
                <MenuItem value="prefix">Prefix (starts with keyword)</MenuItem>
                <MenuItem value="exact">Exact (full exact match)</MenuItem>
                <MenuItem value="regex">Regex pattern</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Priority (1-100)"
                type="number"
                value={saveRulePriority}
                onChange={(e) => setSaveRulePriority(Number(e.target.value))}
                size="small"
                helperText="Higher numbers take precedence"
              />
              <TextField
                label="Bank Scope"
                value={saveRuleBank}
                onChange={(e) => setSaveRuleBank(e.target.value)}
                size="small"
                helperText="'ALL' or specific bank e.g. ICICI, SBI"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setRuleModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSavingRule}>
              {isSavingRule ? 'Saving...' : 'Save Rule'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar feedback on row deletion */}
      <Snackbar
        open={Boolean(removedItemSnackbar)}
        autoHideDuration={3000}
        onClose={() => setRemovedItemSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setRemovedItemSnackbar(null)}
          severity="info"
          variant="filled"
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {removedItemSnackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export { ImportPage as ImportStepper };
export default ImportPage;
