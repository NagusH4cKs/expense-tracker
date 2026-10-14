import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import { CategoryItem } from '../types/category';
import { transactionService } from '../services/transaction.service';

const COMMON_ACCOUNTS = [
  'ICICI Bank',
  'SBI Bank',
  'HDFC Bank',
  'Axis Bank',
  'Cash Wallet',
  'Credit Card',
  'UPI / GPay',
];

interface AddTransactionModalProps {
  open: boolean;
  dbCategories: CategoryItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  open,
  dbCategories,
  onClose,
  onSuccess,
}) => {
  // Today's date formatted as YYYY-MM-DD in local time
  const todayStr = useMemo(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  }, []);

  // Form State
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(todayStr);
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [group, setGroup] = useState<string>('');
  const [account, setAccount] = useState<string>('ICICI Bank');
  const [customAccount, setCustomAccount] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [reference, setReference] = useState<string>('');

  // UI State
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter categories matching type, or show all
  const filteredCategories = useMemo(() => {
    const matching = dbCategories.filter((c) => c.type === type);
    return matching.length > 0 ? matching : dbCategories;
  }, [dbCategories, type]);

  // Set default category when categories change or modal opens
  useEffect(() => {
    if (open) {
      setDate(todayStr);
      setErrorMsg(null);
      if (filteredCategories.length > 0 && (!category || !filteredCategories.some((c) => c.name === category))) {
        setCategory(filteredCategories[0].name);
      }
    }
  }, [open, filteredCategories, todayStr]);

  // Available groups for the selected category
  const availableGroups = useMemo(() => {
    const selected = dbCategories.find((c) => c.name === category);
    return selected ? selected.groups : [];
  }, [category, dbCategories]);

  // Set default group when category changes
  useEffect(() => {
    if (availableGroups.length > 0) {
      setGroup(availableGroups[0].name);
    } else {
      setGroup('');
    }
  }, [category, availableGroups]);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setDate(todayStr);
    setRemarks('');
    setReference('');
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₹0');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please enter a description for this transaction');
      return;
    }

    if (!category.trim()) {
      setErrorMsg('Please select a category');
      return;
    }

    const finalAccount = account === 'custom' ? customAccount.trim() : account;
    if (!finalAccount) {
      setErrorMsg('Please specify an account / payment method');
      return;
    }

    try {
      setLoading(true);
      await transactionService.create({
        date,
        description: description.trim(),
        amount: parsedAmount,
        type,
        category: category.trim(),
        group: group ? group.trim() : undefined,
        account: finalAccount,
        remarks: remarks.trim() || undefined,
        reference: reference.trim() || undefined,
      });

      resetForm();
      onSuccess();
    } catch (err: any) {
      console.error('Failed to create transaction', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            p: 1,
            boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
          },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: type === 'expense' ? 'error.light' : 'success.light',
                color: type === 'expense' ? 'error.main' : 'success.dark',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {type === 'expense' ? <ArrowUpwardRoundedIcon /> : <ArrowDownwardRoundedIcon />}
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Add New Transaction
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Manual entry with instant budget & ledger sync
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} disabled={loading} size="small">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>
          {errorMsg && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {errorMsg}
            </Alert>
          )}

          {/* 1. Transaction Type Selector (Expense vs Income) */}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={type}
              exclusive
              onChange={(_e, val) => {
                if (val) setType(val);
              }}
              fullWidth
              sx={{
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                p: 0.5,
                '& .MuiToggleButton-root': {
                  borderRadius: 2,
                  py: 1,
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  border: 'none',
                  '&.Mui-selected': {
                    bgcolor: type === 'expense' ? '#ef4444' : '#10b981',
                    color: '#ffffff',
                    '&:hover': {
                      bgcolor: type === 'expense' ? '#dc2626' : '#059669',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="expense">
                <ArrowUpwardRoundedIcon sx={{ mr: 1, fontSize: 18 }} />
                Expense
              </ToggleButton>
              <ToggleButton value="income">
                <ArrowDownwardRoundedIcon sx={{ mr: 1, fontSize: 18 }} />
                Income
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* 2. Amount and Date in Two Columns */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Amount (INR)"
              type="number"
              required
              fullWidth
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                },
                htmlInput: { step: 'any', min: '0.01' },
              }}
              placeholder="0.00"
              autoFocus
            />

            <TextField
              label="Transaction Date"
              type="date"
              required
              fullWidth
              value={date}
              onChange={(e) => setDate(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />
          </Box>

          {/* 3. Description */}
          <TextField
            label="Description / Title"
            placeholder="e.g. Grocery shopping, Zepto, Salary credit, Coffee"
            fullWidth
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* 4. Category and Group (Sub-item) */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: availableGroups.length > 0 ? '1fr 1fr' : '1fr' }, gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel id="manual-tx-category-label">Category</InputLabel>
              <Select
                labelId="manual-tx-category-label"
                value={category}
                label="Category *"
                onChange={(e) => setCategory(e.target.value)}
              >
                {filteredCategories.map((c) => (
                  <MenuItem key={c.id || c.name} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {availableGroups.length > 0 && (
              <FormControl fullWidth>
                <InputLabel id="manual-tx-group-label">Group / Sub-item</InputLabel>
                <Select
                  labelId="manual-tx-group-label"
                  value={group}
                  label="Group / Sub-item"
                  onChange={(e) => setGroup(e.target.value)}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {availableGroups.map((g) => (
                    <MenuItem key={g.id || g.name} value={g.name}>
                      {g.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {/* 5. Account / Payment Method */}
          <Box sx={{ display: 'grid', gridTemplateColumns: account === 'custom' ? { xs: '1fr', sm: '1fr 1fr' } : '1fr', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel id="manual-tx-account-label">Account / Payment Method</InputLabel>
              <Select
                labelId="manual-tx-account-label"
                value={account}
                label="Account / Payment Method *"
                onChange={(e) => setAccount(e.target.value)}
              >
                {COMMON_ACCOUNTS.map((acc) => (
                  <MenuItem key={acc} value={acc}>
                    {acc}
                  </MenuItem>
                ))}
                <MenuItem value="custom">+ Other / Custom Account</MenuItem>
              </Select>
            </FormControl>

            {account === 'custom' && (
              <TextField
                label="Custom Account Name"
                placeholder="e.g. Kotak Bank, Office Card"
                required
                fullWidth
                value={customAccount}
                onChange={(e) => setCustomAccount(e.target.value)}
              />
            )}
          </Box>

          {/* 6. Remarks and Reference (Optional details) */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Reference / UTR ID (Optional)"
              placeholder="e.g. UPI/12345/TXN"
              fullWidth
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />

            <TextField
              label="Remarks / Notes (Optional)"
              placeholder="e.g. Paid via GPay, shared expense"
              fullWidth
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </Box>
        </DialogContent>

        {/* Footer Actions */}
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={handleClose} disabled={loading} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ px: 3.5, fontWeight: 700, borderRadius: 2 }}
          >
            {loading ? 'Saving...' : 'Save Transaction'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
