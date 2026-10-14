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
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';

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
    } catch {
      // ignore
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
    </Paper>
  );
};

/* ---------------- Table Component ---------------- */
interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  loading?: boolean;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onDelete,
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
            <TableCell align="right" sx={{ width: 50 }}></TableCell>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Chip
                      label={t.category}
                      size="small"
                      sx={{
                        bgcolor: '#f1f5f9',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        borderRadius: 1.5,
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
                        }}
                      />
                    )}
                  </Box>
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
