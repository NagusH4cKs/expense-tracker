import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Chip,
  InputAdornment,
  Tooltip,
  TablePagination,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';

import { categoryService } from '../services/category.service';
import { transactionService } from '../services/transaction.service';
import { CategoryItem } from '../types/category';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  group?: string;
  amount: number;
  type: 'expense' | 'income';
  account: string;
  remarks?: string;
}

const DEFAULT_CATEGORIES: readonly string[] = [
  'Food & Dining',
  'Snacks',
  'Grocery',
  'Stationery',
  'Friends',
  'Home',
  'Travel',
  'Investment',
  'Salary',
  'Dividend',
  'Refund',
  'Medicine',
  'Personal Care',
  'Other',
];

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dbCategories, setDbCategories] = useState<CategoryItem[]>([]);

  // Edit Category Modal State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editCategory, setEditCategory] = useState<string>('');
  const [editGroup, setEditGroup] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Snackbar Notification State
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Debounce search query so server gets query only after user finishes typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0); // Reset to first page whenever search changes
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load categories and groups from backend API
  useEffect(() => {
    categoryService
      .getAll()
      .then((data) => setDbCategories(data))
      .catch(() => {});
  }, []);

  const categoriesList = useMemo(() => {
    if (dbCategories.length > 0) {
      return dbCategories.map((c) => c.name);
    }
    return DEFAULT_CATEGORIES;
  }, [dbCategories]);

  // Sub-groups available for the currently selected category in edit dialog
  const availableEditGroups = useMemo(() => {
    const found = dbCategories.find((c) => c.name === editCategory);
    return found?.groups || [];
  }, [dbCategories, editCategory]);

  // Load transactions server-side with pagination and query filters
  const loadTransactions = async () => {
    try {
      setIsLoadingTransactions(true);
      const res = await transactionService.getAll({
        page: page + 1, // backend is 1-indexed
        limit: rowsPerPage,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        search: debouncedSearch.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      const mapped: Transaction[] = res.items.map((t) => ({
        id: t.id,
        date: t.date ? t.date.split('T')[0] : '',
        description: t.description,
        category: t.category,
        group: t.group || undefined,
        amount: t.amount,
        type: t.type,
        account: t.account,
        remarks: t.remarks || undefined,
      }));

      setTransactions(mapped);
      setTotalRecords(res.pagination.total);
    } catch (err) {
      console.warn('Could not load transactions from API', err);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [page, rowsPerPage, selectedCategory, debouncedSearch, startDate, endDate]);

  // Auto-reload if an add-transaction event was fired
  useEffect(() => {
    const handleRefresh = () => {
      loadTransactions();
    };
    window.addEventListener('transaction-updated', handleRefresh);
    return () => window.removeEventListener('transaction-updated', handleRefresh);
  }, []);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCategoryFilterChange = (cat: string) => {
    setSelectedCategory(cat);
    setPage(0);
  };

  const handleDelete = async (id: string) => {
    try {
      await transactionService.delete(id);
      loadTransactions();
      window.dispatchEvent(new CustomEvent('transaction-updated'));
      setSnackbar({
        open: true,
        message: 'Transaction deleted successfully',
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to delete transaction',
        severity: 'error',
      });
    }
  };

  // Open Edit Dialog for a transaction
  const handleOpenEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditCategory(tx.category);
    setEditGroup(tx.group || '');
  };

  // Close Edit Dialog
  const handleCloseEdit = () => {
    setEditingTransaction(null);
    setEditCategory('');
    setEditGroup('');
  };

  // Save Category / Group update
  const handleSaveEdit = async () => {
    if (!editingTransaction) return;
    if (!editCategory.trim()) {
      setSnackbar({ open: true, message: 'Please select a category', severity: 'error' });
      return;
    }

    try {
      setIsSavingEdit(true);
      await transactionService.update(editingTransaction.id, {
        category: editCategory.trim(),
        group: editGroup.trim() || null,
      });

      // Optimistically update table row
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingTransaction.id
            ? { ...t, category: editCategory.trim(), group: editGroup.trim() || undefined }
            : t
        )
      );

      // Notify other views (dashboard analytics & budget cards update automatically!)
      window.dispatchEvent(new CustomEvent('transaction-updated'));

      setSnackbar({
        open: true,
        message: `Updated category to "${editCategory.trim()}" for "${editingTransaction.description}"`,
        severity: 'success',
      });

      handleCloseEdit();
    } catch (err: any) {
      console.error('Failed to update category', err);
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Failed to update category',
        severity: 'error',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3.5,
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Filter Section: Search, Category, Date Filters */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        {/* Row 1: Search, Category dropdown, and Import button */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, flex: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <TextField
              placeholder="Search description, category, group, account..."
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                maxWidth: { sm: 380 },
                bgcolor: '#ffffff',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="category-filter-label">Category</InputLabel>
              <Select
                labelId="category-filter-label"
                value={selectedCategory}
                label="Category"
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
                sx={{ borderRadius: 2, bgcolor: '#ffffff' }}
              >
                <MenuItem value="All">All Categories</MenuItem>
                {categoriesList.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Button
            variant="outlined"
            startIcon={<UploadFileRoundedIcon />}
            onClick={() => navigate('/import')}
            sx={{
              borderRadius: 2,
              borderColor: '#e2e8f0',
              color: 'text.primary',
              bgcolor: '#ffffff',
              whiteSpace: 'nowrap',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(79, 70, 229, 0.04)',
              },
            }}
          >
            Import Statement
          </Button>
        </Box>

        {/* Row 2: Date-based Filter Bar with Inputs and Dynamic Quick Preset Chips */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
            p: 1.5,
            borderRadius: 2.5,
            bgcolor: '#f8fafc',
            border: '1px solid #f1f5f9',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: 'text.secondary' }}>
              <CalendarMonthRoundedIcon fontSize="small" color="primary" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Date Filter:
              </Typography>
            </Box>

            <TextField
              label="From Date"
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{
                minWidth: 145,
                bgcolor: '#ffffff',
                '& .MuiOutlinedInput-root': { borderRadius: 2 },
              }}
            />

            <TextField
              label="To Date"
              type="date"
              size="small"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{
                minWidth: 145,
                bgcolor: '#ffffff',
                '& .MuiOutlinedInput-root': { borderRadius: 2 },
              }}
            />

            {/* Preset quick buttons - dynamically calculated */}
            {(() => {
              const now = new Date();
              const curYr = now.getFullYear();
              const curMo = String(now.getMonth() + 1).padStart(2, '0');
              const curDay = String(now.getDate()).padStart(2, '0');
              const todayStr = `${curYr}-${curMo}-${curDay}`;

              const thisMonthStart = `${curYr}-${curMo}-01`;
              const thisMonthEndDay = new Date(curYr, now.getMonth() + 1, 0).getDate();
              const thisMonthEnd = `${curYr}-${curMo}-${String(thisMonthEndDay).padStart(2, '0')}`;
              const thisMonthLabel = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });

              const prevDate = new Date(curYr, now.getMonth() - 1, 1);
              const prevYr = prevDate.getFullYear();
              const prevMo = String(prevDate.getMonth() + 1).padStart(2, '0');
              const prevEndDay = new Date(prevYr, prevDate.getMonth() + 1, 0).getDate();
              const prevMonthStart = `${prevYr}-${prevMo}-01`;
              const prevMonthEnd = `${prevYr}-${prevMo}-${String(prevEndDay).padStart(2, '0')}`;
              const prevMonthLabel = prevDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

              const isAll = !startDate && !endDate;
              const isToday = startDate === todayStr && endDate === todayStr;
              const isThisMonth = startDate === thisMonthStart && endDate === thisMonthEnd;
              const isPrevMonth = startDate === prevMonthStart && endDate === prevMonthEnd;

              return (
                <>
                  <Chip
                    label="All Dates"
                    clickable
                    color={isAll ? 'primary' : 'default'}
                    variant={isAll ? 'filled' : 'outlined'}
                    size="small"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setPage(0);
                    }}
                    sx={{ fontWeight: 600 }}
                  />

                  <Chip
                    label={`This Month (${thisMonthLabel})`}
                    clickable
                    color={isThisMonth ? 'primary' : 'default'}
                    variant={isThisMonth ? 'filled' : 'outlined'}
                    size="small"
                    onClick={() => {
                      setStartDate(thisMonthStart);
                      setEndDate(thisMonthEnd);
                      setPage(0);
                    }}
                    sx={{ fontWeight: 600 }}
                  />

                  <Chip
                    label={`Last Month (${prevMonthLabel})`}
                    clickable
                    color={isPrevMonth ? 'primary' : 'default'}
                    variant={isPrevMonth ? 'filled' : 'outlined'}
                    size="small"
                    onClick={() => {
                      setStartDate(prevMonthStart);
                      setEndDate(prevMonthEnd);
                      setPage(0);
                    }}
                    sx={{ fontWeight: 600 }}
                  />

                  <Chip
                    label="Today"
                    clickable
                    color={isToday ? 'primary' : 'default'}
                    variant={isToday ? 'filled' : 'outlined'}
                    size="small"
                    onClick={() => {
                      setStartDate(todayStr);
                      setEndDate(todayStr);
                      setPage(0);
                    }}
                    sx={{ fontWeight: 600 }}
                  />
                </>
              );
            })()}

            {(startDate || endDate) && (
              <Button
                size="small"
                startIcon={<RestartAltRoundedIcon fontSize="small" />}
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setPage(0);
                }}
                sx={{ textTransform: 'none', fontWeight: 600, color: 'error.main' }}
              >
                Clear Dates
              </Button>
            )}
          </Box>

          {/* Filtered count badge */}
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {startDate || endDate
              ? `Server Filter: ${totalRecords} records found`
              : `Total Records: ${totalRecords}`}
          </Typography>
        </Box>
      </Box>

      {/* Transactions Table with Pagination */}
      <TransactionTable
        transactions={transactions}
        onDelete={handleDelete}
        onEdit={handleOpenEdit}
        loading={isLoadingTransactions}
      />

      {/* Server-Side Pagination Bar */}
      <TablePagination
        component="div"
        count={totalRecords}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Records per page:"
        sx={{
          borderTop: '1px solid #e2e8f0',
          px: 2,
          mt: 1,
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: '0.85rem',
            fontWeight: 500,
            color: 'text.secondary',
          },
          '.MuiTablePagination-select': {
            borderRadius: 1.5,
          },
        }}
      />

      {/* ===================== EDIT CATEGORY MODAL ===================== */}
      <Dialog
        open={Boolean(editingTransaction)}
        onClose={handleCloseEdit}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3.5, p: 1 },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryRoundedIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Edit Category
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleCloseEdit}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
          {/* Transaction Summary Preview Card */}
          {editingTransaction && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.8,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', flex: 1, pr: 1 }}>
                  {editingTransaction.description}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    color: editingTransaction.type === 'expense' ? 'error.main' : 'success.main',
                  }}
                >
                  {editingTransaction.type === 'expense' ? '−' : '+'}
                  {formatCurrency(editingTransaction.amount)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  📅 {editingTransaction.date}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  🏦 {editingTransaction.account}
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Category Dropdown */}
          <FormControl fullWidth size="small">
            <InputLabel id="edit-category-select-label">Category</InputLabel>
            <Select
              labelId="edit-category-select-label"
              value={editCategory}
              label="Category"
              onChange={(e) => {
                setEditCategory(e.target.value);
                setEditGroup(''); // reset group when category changes
              }}
              sx={{ borderRadius: 2 }}
            >
              {categoriesList.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Quick Select Preset Chips */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              Quick Select Categories:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              {['Investment', 'Food & Dining', 'Grocery', 'Snacks', 'Travel', 'Home', 'Salary', 'Medicine', 'Other'].map(
                (quickCat) => (
                  <Chip
                    key={quickCat}
                    label={quickCat}
                    size="small"
                    clickable
                    color={editCategory === quickCat ? 'primary' : 'default'}
                    variant={editCategory === quickCat ? 'filled' : 'outlined'}
                    onClick={() => {
                      setEditCategory(quickCat);
                      setEditGroup('');
                    }}
                    sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                  />
                )
              )}
            </Box>
          </Box>

          {/* Sub-Group Dropdown (if groups exist for selected category) */}
          {availableEditGroups.length > 0 && (
            <FormControl fullWidth size="small">
              <InputLabel id="edit-group-select-label">Sub-Group / Tag (Optional)</InputLabel>
              <Select
                labelId="edit-group-select-label"
                value={editGroup}
                label="Sub-Group / Tag (Optional)"
                onChange={(e) => setEditGroup(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">
                  <em>None (No group)</em>
                </MenuItem>
                {availableEditGroups.map((grp) => (
                  <MenuItem key={grp.id} value={grp.name}>
                    {grp.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Typography variant="caption" color="text.secondary">
            💡 Modifying the category will immediately update category expense totals and adjust the remaining budget on your dashboard.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseEdit} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveEdit}
            disabled={isSavingEdit}
            startIcon={isSavingEdit ? <CircularProgress size={16} color="inherit" /> : <EditRoundedIcon />}
            sx={{ fontWeight: 600, px: 3, borderRadius: 2 }}
          >
            {isSavingEdit ? 'Saving...' : 'Update Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Alert */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ borderRadius: 2.5, fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

/* ---------------- Table Component ---------------- */
interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  loading?: boolean;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onDelete,
  onEdit,
  loading = false,
}) => {
  if (loading) {
    return (
      <Box
        sx={{
          py: 8,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={36} color="primary" />
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          Loading records from server...
        </Typography>
      </Box>
    );
  }

  if (!transactions.length) {
    return (
      <Box
        sx={{
          py: 8,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <ReceiptLongRoundedIcon sx={{ fontSize: 48, color: '#cbd5e1' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          No transactions found
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Try adjusting your search query or add a new transaction.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.78rem' }}>
              DATE
            </TableCell>
            <TableCell sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.78rem' }}>
              DESCRIPTION
            </TableCell>
            <TableCell sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.78rem' }}>
              CATEGORY / GROUP
            </TableCell>
            <TableCell sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.78rem' }}>
              ACCOUNT
            </TableCell>
            <TableCell
              align="right"
              sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.78rem' }}
            >
              AMOUNT
            </TableCell>
            <TableCell align="right" sx={{ width: 90 }}>
              ACTIONS
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((t) => {
            const isExpense = t.type === 'expense';
            return (
              <TableRow
                key={t.id}
                hover
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                }}
              >
                <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {t.date}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {t.description}
                </TableCell>
                <TableCell>
                  <Tooltip title="Click to edit category & group" arrow>
                    <Box
                      onClick={() => onEdit(t)}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.8,
                        cursor: 'pointer',
                        p: 0.4,
                        borderRadius: 2,
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          bgcolor: 'rgba(79, 70, 229, 0.08)',
                          '& .category-chip': {
                            borderColor: 'primary.main',
                            color: 'primary.main',
                          },
                        },
                      }}
                    >
                      <Chip
                        className="category-chip"
                        label={t.category}
                        size="small"
                        icon={<EditRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                        sx={{
                          bgcolor: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          border: '1px solid transparent',
                          transition: 'all 0.2s',
                        }}
                      />
                      {t.group && (
                        <Chip
                          label={t.group}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: '#cbd5e1',
                            color: '#64748b',
                            fontSize: '0.72rem',
                            borderRadius: 1.5,
                            cursor: 'pointer',
                          }}
                        />
                      )}
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip
                    label={t.account}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.72rem',
                      borderColor: '#e2e8f0',
                    }}
                  />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    color: isExpense ? 'error.main' : 'success.main',
                  }}
                >
                  {isExpense ? '−' : '+'}
                  {formatCurrency(t.amount)}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Tooltip title="Edit Category">
                      <IconButton
                        size="small"
                        onClick={() => onEdit(t)}
                        sx={{
                          color: '#64748b',
                          '&:hover': { color: 'primary.main', bgcolor: 'rgba(79, 70, 229, 0.08)' },
                        }}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => onDelete(t.id)}
                        sx={{
                          color: '#94a3b8',
                          '&:hover': { color: 'error.main', bgcolor: '#fee2e2' },
                        }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TransactionsPage;
