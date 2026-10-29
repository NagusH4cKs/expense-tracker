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
          const defaultGroup = matched?.groups?.[0]?.name || t.group;
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

  // Toggle All Selection (excluding confirmed duplicates)
  const handleToggleSelectAll = (checked: boolean) => {
    setTransactions((prev) =>
      prev.map((t) => (t.duplicateStatus === 'confirmed' ? t : { ...t, selected: checked }))
    );
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    try {
      setLoading(true);
      setLoadingStage('import');
      setImportProgress({ completed: 0, total: selectedCount, imported: 0, batch: 1, batchCount: Math.ceil(selectedCount / IMPORT_BATCH_SIZE) });
      setError(null);
      const res = await importService.confirm(transactions, true, setImportProgress);
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

  const selectedCount = transactions.filter((t) => t.selected && t.duplicateStatus !== 'confirmed').length;
  const confirmedDuplicatesCount = transactions.filter((t) => t.duplicateStatus === 'confirmed').length;
  const possibleDuplicatesCount = transactions.filter((t) => t.duplicateStatus === 'possible').length;
  const needsReviewCount = transactions.filter((t) => t.needsReview || t.category === 'Needs review').length;
  const transfersCount = transactions.filter((t) => t.isTransfer).length;
  const newGroupCount = transactions.filter((t) => t.isNewGroup).length;

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
              bgcolor: 'rgba(79, 70, 229, 0.08)',
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
              <Chip
                label={`Total: ${transactions.length}`}
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.85rem' }}
              />
              <Chip
                label={`Ready to Import: ${selectedCount}`}
                color="success"
                sx={{ fontWeight: 700, fontSize: '0.85rem' }}
              />
              {confirmedDuplicatesCount > 0 && (
                <Chip
                  icon={<BlockRoundedIcon />}
                  label={`Confirmed Duplicates: ${confirmedDuplicatesCount}`}
                  color="error"
                  sx={{ fontWeight: 700, fontSize: '0.85rem' }}
                />
              )}
              {possibleDuplicatesCount > 0 && (
                <Chip
                  icon={<WarningAmberRoundedIcon />}
                  label={`Possible Duplicates: ${possibleDuplicatesCount}`}
                  color="warning"
                  sx={{ fontWeight: 700, fontSize: '0.85rem' }}
                />
              )}
              {needsReviewCount > 0 && (
                <Chip
                  icon={<WarningAmberRoundedIcon />}
                  label={`Needs Review: ${needsReviewCount}`}
                  sx={{ fontWeight: 700, fontSize: '0.85rem', bgcolor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}
                />
              )}
              {transfersCount > 0 && (
                <Chip
                  icon={<SyncAltRoundedIcon />}
                  label={`Transfers: ${transfersCount}`}
                  color="info"
                  sx={{ fontWeight: 700, fontSize: '0.85rem' }}
                />
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
            <TableContainer sx={{ maxHeight: 620 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedCount > 0 && selectedCount < transactions.filter((t) => t.duplicateStatus !== 'confirmed').length}
                        checked={selectedCount > 0 && selectedCount === transactions.filter((t) => t.duplicateStatus !== 'confirmed').length}
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
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>STATUS</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {transactions.map((t) => {
                    const isExpense = t.type === 'expense';
                    const isConfirmedDup = t.duplicateStatus === 'confirmed';
                    const isPossibleDup = t.duplicateStatus === 'possible';
                    const isReview = t.needsReview || t.category === 'Needs review';
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
                            : t.selected
                            ? 'rgba(79, 70, 229, 0.02)'
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
                                value={t.category || 'Needs review'}
                                onChange={(e) => handleCategoryChange(t.tempId, e.target.value)}
                                sx={{
                                  fontSize: '0.82rem',
                                  height: 32,
                                  borderRadius: 1.5,
                                  bgcolor: '#ffffff',
                                }}
                              >
                                {categories.map((c) => (
                                  <MenuItem key={c.id} value={c.name} sx={{ fontSize: '0.82rem' }}>
                                    {c.name}
                                  </MenuItem>
                                ))}
                                {!categories.some((c) => c.name === t.category) && (
                                  <MenuItem value={t.category} sx={{ fontSize: '0.82rem' }}>
                                    {t.category}
                                  </MenuItem>
                                )}
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
                                  value={t.group || availableGroups[0]?.name || ''}
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
                                  {t.group && !availableGroups.some((g) => g.name === t.group) && (
                                    <MenuItem value={t.group} sx={{ fontSize: '0.82rem' }}>
                                      {t.group}
                                    </MenuItem>
                                  )}
                                </Select>
                              </FormControl>
                            ) : (
                              <Chip
                                label={t.group || 'General'}
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

                        {/* Status / Duplicate Pill */}
                        <TableCell align="center">
                          {isConfirmedDup ? (
                            <Tooltip title={t.duplicateReason || 'Exact duplicate found in database. Will be skipped.'}>
                              <Chip
                                icon={<BlockRoundedIcon fontSize="small" />}
                                label="Confirmed Dup"
                                size="small"
                                color="error"
                                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
                              />
                            </Tooltip>
                          ) : isPossibleDup ? (
                            <Tooltip title={t.duplicateReason || 'Possible duplicate based on similar amount and date.'}>
                              <Chip
                                icon={<WarningAmberRoundedIcon fontSize="small" />}
                                label="Possible Dup"
                                size="small"
                                color="warning"
                                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
                              />
                            </Tooltip>
                          ) : isReview ? (
                            <Tooltip title="Unmatched or low-confidence pattern. Please verify category.">
                              <Chip
                                icon={<WarningAmberRoundedIcon fontSize="small" />}
                                label="Needs Review"
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  bgcolor: '#fffbeb',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                }}
                              />
                            </Tooltip>
                          ) : (
                            <Chip
                              icon={<CheckRoundedIcon fontSize="small" />}
                              label="Ready"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
    </Box>
  );
};

export { ImportPage as ImportStepper };
export default ImportPage;
