import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PieChartRoundedIcon from '@mui/icons-material/PieChartRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from 'recharts';

import {
  transactionService,
  AnalyticsData,
  CategoryBreakdownItem,
  TimeSeriesItem,
} from '../services/transaction.service';
import { budgetService } from '../services/budget.service';
import { categoryService } from '../services/category.service';
import { CategoryItem } from '../types/category';

const PIE_COLORS = [
  '#4f46e5', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#f97316', // Orange
  '#64748b', // Slate
  '#14b8a6', // Teal
  '#ef4444', // Red
];

const MONTH_NAMES = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatBarAmount = (val: any): string => {
  const num = Number(val);
  if (!num || num <= 0) return '';
  if (num >= 100000) return `₹${(num / 1000).toFixed(0)}k`;
  if (num >= 1000) {
    const k = num / 1000;
    return `₹${k >= 10 ? k.toFixed(0) : k.toFixed(1).replace('.0', '')}k`;
  }
  return `₹${Math.round(num)}`;
};

const now = new Date();
const CURRENT_YEAR = String(now.getFullYear());
const CURRENT_MONTH = String(now.getMonth() + 1).padStart(2, '0');
const CURRENT_DAY = String(now.getDate()).padStart(2, '0');
const CURRENT_FULL_DATE = `${CURRENT_YEAR}-${CURRENT_MONTH}-${CURRENT_DAY}`;

import { useNavigate } from 'react-router-dom';

export interface DashboardPageProps {
  onNavigateToImport?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToImport }) => {
  const navigate = useNavigate();
  const handleNavigateToImport = onNavigateToImport || (() => navigate('/import'));

  // 1. Common Filters State (Controls Top 4 Metric Cards & Defaults to Current Month & Year)
  const [commonYear, setCommonYear] = useState<string>(CURRENT_YEAR);
  const [commonMonth, setCommonMonth] = useState<string>(CURRENT_MONTH);
  const [commonDate, setCommonDate] = useState<string>('all');

  // Master available dates and years for dropdown options
  const [availableYears, setAvailableYears] = useState<string[]>([CURRENT_YEAR]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // Overview Analytics (for 4 Cards & Budget)
  const [overviewData, setOverviewData] = useState<AnalyticsData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(true);
  const initialPeriodChecked = useRef(false);
  const overviewRequestId = useRef(0);

  // 2. Individual Filters & Data for PIE CHART (Defaults to Current Month & Year)
  const [pieYear, setPieYear] = useState<string>(CURRENT_YEAR);
  const [pieMonth, setPieMonth] = useState<string>(CURRENT_MONTH);
  const [pieDate, setPieDate] = useState<string>('all');
  const [pieCategoryData, setPieCategoryData] = useState<CategoryBreakdownItem[]>([]);
  const [pieTotalExpense, setPieTotalExpense] = useState<number>(0);
  const [pieLoading, setPieLoading] = useState<boolean>(false);

  // 3. Individual Filters & Data for BAR CHART (Defaults to Current Month & Year)
  const [barYear, setBarYear] = useState<string>(CURRENT_YEAR);
  const [barMonth, setBarMonth] = useState<string>(CURRENT_MONTH);
  const [barDate, setBarDate] = useState<string>('all');
  const [barTimeSeries, setBarTimeSeries] = useState<TimeSeriesItem[]>([]);
  const [barSummary, setBarSummary] = useState<{ totalIncome: number; totalExpenses: number; balance: number }>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
  });
  const [barLoading, setBarLoading] = useState<boolean>(false);

  // The budget card can show the monthly total or one master category.
  const [budgetCategory, setBudgetCategory] = useState<string>('ALL');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [budgetSaveError, setBudgetSaveError] = useState<string>('');
  const [isSavingBudget, setIsSavingBudget] = useState<boolean>(false);
  const [dbCategories, setDbCategories] = useState<CategoryItem[]>([]);

  // Load category choices from the master, without local fallback names.
  useEffect(() => {
    categoryService
      .getAll()
      .then((data) => setDbCategories(data))
      .catch(() => {});
  }, []);

  // Filter available dates helper
  const getDatesForFilter = (yr: string, mo: string) => {
    if (!availableDates.length) return [];
    if (mo === 'all') {
      if (yr === 'all') return availableDates;
      return availableDates.filter((d) => d.startsWith(yr));
    }
    const prefix = `${yr}-${mo}`;
    return availableDates.filter((d) => d.startsWith(prefix));
  };

  const commonFilteredDates = useMemo(() => getDatesForFilter(commonYear, commonMonth), [availableDates, commonYear, commonMonth]);
  const pieFilteredDates = useMemo(() => getDatesForFilter(pieYear, pieMonth), [availableDates, pieYear, pieMonth]);
  const barFilteredDates = useMemo(() => getDatesForFilter(barYear, barMonth), [availableDates, barYear, barMonth]);

  // Fetch Overview Data (Budget + 4 Metric Cards)
  const fetchOverviewAnalytics = async () => {
    const requestId = ++overviewRequestId.current;
    try {
      setOverviewLoading(true);
      const data = await transactionService.getAnalytics({
        year: commonYear,
        month: commonMonth,
        date: commonDate,
        budgetCategory,
      });
      if (requestId !== overviewRequestId.current) return;
      if (data.filters?.availableYears?.length) {
        setAvailableYears(data.filters.availableYears);
      }
      if (data.filters?.availableDates?.length) {
        setAvailableDates(data.filters.availableDates);
      }

      // Open on the latest imported month when the current month has no transactions.
      // Explicit period selections continue to show their own totals, including zero.
      if (!initialPeriodChecked.current && commonYear === CURRENT_YEAR && commonMonth === CURRENT_MONTH && commonDate === 'all') {
        initialPeriodChecked.current = true;
        if (data.summary.count === 0 && data.filters?.availableDates?.length) {
          const latestDate = data.filters.availableDates[data.filters.availableDates.length - 1];
          if (latestDate.slice(0, 7) !== `${CURRENT_YEAR}-${CURRENT_MONTH}`) {
            setCommonYear(latestDate.slice(0, 4));
            setCommonMonth(latestDate.slice(5, 7));
            return;
          }
        }
      }
      setOverviewData(data);

    } catch (err) {
      if (requestId === overviewRequestId.current) console.error('Failed to load overview analytics', err);
    } finally {
      if (requestId === overviewRequestId.current) setOverviewLoading(false);
    }
  };

  // Fetch Individual Pie Chart Analytics
  const fetchPieAnalytics = async () => {
    try {
      setPieLoading(true);
      const data = await transactionService.getAnalytics({
        year: pieYear,
        month: pieMonth,
        date: pieDate,
      });
      setPieCategoryData(data.categoryBreakdown || []);
      setPieTotalExpense(data.summary?.totalExpenses || 0);
    } catch (err) {
      console.error('Failed to load pie analytics', err);
    } finally {
      setPieLoading(false);
    }
  };

  // Fetch Individual Bar Chart Analytics
  const fetchBarAnalytics = async () => {
    try {
      setBarLoading(true);
      const data = await transactionService.getAnalytics({
        year: barYear,
        month: barMonth,
        date: barDate,
      });
      setBarTimeSeries(data.timeSeries || []);
      setBarSummary({
        totalIncome: data.summary?.totalIncome || 0,
        totalExpenses: data.summary?.totalExpenses || 0,
        balance: data.summary?.balance || 0,
      });
    } catch (err) {
      console.error('Failed to load bar analytics', err);
    } finally {
      setBarLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchOverviewAnalytics();
  }, [commonYear, commonMonth, commonDate, budgetCategory]);

  useEffect(() => {
    fetchPieAnalytics();
  }, [pieYear, pieMonth, pieDate]);

  useEffect(() => {
    fetchBarAnalytics();
  }, [barYear, barMonth, barDate]);

  // Listen to transaction updates (from Transactions page or Add Transaction modal)
  useEffect(() => {
    const handleRefresh = () => {
      fetchOverviewAnalytics();
      fetchPieAnalytics();
      fetchBarAnalytics();
    };
    window.addEventListener('transaction-updated', handleRefresh);
    return () => window.removeEventListener('transaction-updated', handleRefresh);
  }, [commonYear, commonMonth, commonDate, budgetCategory, pieYear, pieMonth, pieDate, barYear, barMonth, barDate]);

  // Edit the target for the selected monthly or master-category scope.
  const handleOpenBudgetModal = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setBudgetInput(String(overviewData?.budget?.budgetAmount ?? 0));
    setBudgetSaveError('');
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = async () => {
    const amount = Number(budgetInput);
    if (!Number.isFinite(amount) || amount < 0 || budgetInput.trim() === '') {
      setBudgetSaveError('Enter a non-negative budget amount.');
      return;
    }
    try {
      setIsSavingBudget(true);
      await budgetService.setBudget(Number(commonYear), Number(commonMonth), amount, budgetCategory);
      setIsBudgetModalOpen(false);
      await fetchOverviewAnalytics();
    } catch (err: any) {
      setBudgetSaveError(err?.response?.data?.message || 'Failed to save budget.');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const budget = overviewData?.budget?.category === budgetCategory ? overviewData.budget : {
    category: budgetCategory,
    budgetAmount: 0,
    actualAmount: 0,
    incomeAmount: 0,
    expenseAmount: 0,
    incomeTransactionCount: 0,
    expenseTransactionCount: 0,
    transactionCount: 0,
    remainingBudget: 0,
    overBudget: 0,
    percentageSpent: 0,
  };
  const isIncomeBudget = dbCategories.some((category) => category.name === budgetCategory && category.type === 'income');
  const budgetStatus = budget.budgetAmount === 0
    ? 'Not Set'
    : isIncomeBudget
      ? budget.overBudget > 0 ? 'Above Target' : budget.remainingBudget === 0 ? 'Target Met' : 'Below Target'
      : budget.overBudget > 0 ? 'Over Budget' : 'Within Budget';
  const budgetStatusColor = isIncomeBudget
    ? budget.remainingBudget > 0 ? 'warning' : 'success'
    : budget.overBudget > 0 ? 'error' : 'success';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, pb: 4 }}>
      {/* ---------------- 1. COMMON FILTER & BUDGET HEADER BAR ---------------- */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3.5,
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              bgcolor: 'rgba(79, 70, 229, 0.08)',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarMonthRoundedIcon />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Period & Budget Overview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Baseline filter for budget cards and financial status
            </Typography>
          </Box>
        </Box>

        {/* Filter Controls: Year, Month, Date */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel id="common-year-label">Year</InputLabel>
            <Select
              labelId="common-year-label"
              value={commonYear}
              label="Year"
              onChange={(e) => {
                setCommonYear(e.target.value);
                setCommonDate('all');
              }}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All Years</MenuItem>
              {availableYears.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="common-month-label">Month</InputLabel>
            <Select
              labelId="common-month-label"
              value={commonMonth}
              label="Month"
              onChange={(e) => {
                setCommonMonth(e.target.value);
                setCommonDate('all');
              }}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All Months</MenuItem>
              {MONTH_NAMES.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="common-date-label">Date</InputLabel>
            <Select
              labelId="common-date-label"
              value={commonDate}
              label="Date"
              onChange={(e) => setCommonDate(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All Dates ({commonFilteredDates.length})</MenuItem>
              {commonFilteredDates.map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <IconButton onClick={fetchOverviewAnalytics} size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <RefreshRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Paper>

      {/* ---------------- 2. 4 FINANCIAL & BUDGET CARDS ---------------- */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2.5,
        }}
      >
        {/* CARD 1: Selected monthly or category budget */}
        <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3.5, bgcolor: '#ffffff' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(79, 70, 229, 0.1)',
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SavingsRoundedIcon />
              </Box>
              <Chip
                label={budget.budgetAmount > 0 ? 'Budget Active' : 'Not Set'}
                size="small"
                color={budget.budgetAmount > 0 ? 'primary' : 'default'}
                variant="outlined"
                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
              />
            </Box>
            <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
              <InputLabel id="budget-category-label">Budget</InputLabel>
              <Select
                labelId="budget-category-label"
                value={budgetCategory}
                label="Budget"
                onChange={(event) => setBudgetCategory(event.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="ALL">Monthly</MenuItem>
                {dbCategories.map((category) => (
                  <MenuItem key={category.id} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
                {dbCategories.length === 0 && (
                  <MenuItem disabled>No categories in master</MenuItem>
                )}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {budgetCategory === 'ALL' ? 'Monthly Budget' : `${budgetCategory} Budget`}
              {' - '}{MONTH_NAMES.find((m) => m.value === commonMonth)?.label || 'All Months'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.4, color: 'text.primary' }}>
                {budget.budgetAmount > 0 ? formatCurrency(budget.budgetAmount) : '₹0'}
              </Typography>
              <IconButton
                size="small"
                onClick={() => handleOpenBudgetModal()}
                disabled={commonYear === 'all' || commonMonth === 'all'}
                aria-label={budget.budgetAmount > 0 ? 'Edit budget' : 'Set budget'}
                sx={{ color: 'primary.main' }}
              >
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {budget.budgetAmount > 0
                ? 'Target for selected budget'
                : commonYear === 'all' || commonMonth === 'all'
                  ? 'Select one year and month to set a target'
                  : 'Use the edit icon to set a target'}
            </Typography>
          </CardContent>
        </Card>

        {/* CARD 2: Income for the selected month or category */}
        <Card elevation={0} sx={{ order: 2, border: '1px solid #e2e8f0', borderRadius: 3.5, bgcolor: '#ffffff' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  bgcolor: 'success.light',
                  color: 'success.dark',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowDownwardRoundedIcon />
              </Box>
              {isIncomeBudget && budget.budgetAmount > 0 && (
                <Chip
                  label={`${budget.percentageSpent}% of target`}
                  size="small"
                  color="success"
                  sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {budgetCategory === 'ALL' ? 'Total Income' : `${budgetCategory} Income`}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.4, color: 'success.dark' }}>
              {formatCurrency(budget.incomeAmount)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {budget.incomeTransactionCount} matching income transactions
            </Typography>
          </CardContent>
        </Card>

        {/* CARD 4: Selected target minus matching transactions */}
        <Card
          elevation={0}
          sx={{
            order: 4,
            border: '1px solid #e2e8f0',
            borderRadius: 3.5,
            bgcolor: budget.overBudget > 0 && !isIncomeBudget ? 'rgba(239, 68, 68, 0.04)' : '#ffffff',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  bgcolor: `${budgetStatusColor}.light`,
                  color: `${budgetStatusColor}.dark`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {budgetStatusColor === 'error' || budgetStatusColor === 'warning'
                  ? <WarningAmberRoundedIcon />
                  : <CheckCircleRoundedIcon />}
              </Box>
              <Chip
                label={budgetStatus}
                size="small"
                color={budgetStatusColor}
                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {isIncomeBudget ? `${budgetCategory} Target Gap` : budgetCategory === 'ALL' ? 'Remaining Budget' : `${budgetCategory} Remaining`}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mt: 0.4,
                color: `${budgetStatusColor}.dark`,
              }}
            >
              {budget.overBudget > 0
                ? `${isIncomeBudget ? '+' : '-'} ${formatCurrency(budget.overBudget)}`
                : formatCurrency(budget.remainingBudget)}
            </Typography>
            {budget.budgetAmount > 0 && (
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, budget.percentageSpent)}
                  color={isIncomeBudget ? 'success' : budget.overBudget > 0 ? 'error' : budget.percentageSpent > 80 ? 'warning' : 'primary'}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* CARD 3: Expenses for the selected month or category */}
        <Card elevation={0} sx={{ order: 3, border: '1px solid #e2e8f0', borderRadius: 3.5, bgcolor: '#ffffff' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  bgcolor: 'error.light',
                  color: 'error.dark',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowUpwardRoundedIcon />
              </Box>
              {!isIncomeBudget && budget.budgetAmount > 0 && (
                <Chip
                  label={`${budget.percentageSpent}% of target`}
                  size="small"
                  color={budget.percentageSpent > 90 ? 'error' : budget.percentageSpent > 70 ? 'warning' : 'default'}
                  sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {budgetCategory === 'ALL' ? 'Total Expenses' : `${budgetCategory} Expenses`}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.4, color: 'error.main' }}>
              {formatCurrency(budget.expenseAmount)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {budget.expenseTransactionCount} matching expense transactions
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* ---------------- 3. BOTH CHARTS IN SINGLE COLUMN (FULL WIDTH) ---------------- */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
        {/* ==================== CHART 1: PIE CHART WITH INDIVIDUAL FILTER ==================== */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3.5,
            border: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header Bar with Title and INDIVIDUAL FILTERS */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', lg: 'center' },
              gap: 2,
              mb: 3,
              pb: 2,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(79, 70, 229, 0.08)',
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PieChartRoundedIcon />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Expenses by Category (Pie Chart)
                  </Typography>
                  <Chip
                    label={`${pieCategoryData.length} Categories`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600, height: 22 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Categorized expense distribution with direct amounts on each slice
                </Typography>
              </Box>
            </Box>

            {/* Individual Filters for Pie Chart */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                <FilterAltRoundedIcon fontSize="small" />
                <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Pie Filter:
                </Typography>
              </Box>

              {/* Pie Year */}
              <FormControl size="small" sx={{ minWidth: 95 }}>
                <InputLabel id="pie-year-label">Year</InputLabel>
                <Select
                  labelId="pie-year-label"
                  value={pieYear}
                  label="Year"
                  onChange={(e) => {
                    setPieYear(e.target.value);
                    setPieDate('all');
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Years</MenuItem>
                  {availableYears.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Pie Month */}
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel id="pie-month-label">Month</InputLabel>
                <Select
                  labelId="pie-month-label"
                  value={pieMonth}
                  label="Month"
                  onChange={(e) => {
                    setPieMonth(e.target.value);
                    setPieDate('all');
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Months</MenuItem>
                  {MONTH_NAMES.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Pie Date */}
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel id="pie-date-label">Date</InputLabel>
                <Select
                  labelId="pie-date-label"
                  value={pieDate}
                  label="Date"
                  onChange={(e) => setPieDate(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Dates ({pieFilteredDates.length})</MenuItem>
                  {pieFilteredDates.map((d) => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <IconButton onClick={fetchPieAnalytics} size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <RefreshRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Pie Chart Display Area */}
          {pieLoading ? (
            <Box sx={{ py: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={36} />
            </Box>
          ) : pieCategoryData.length === 0 ? (
            <Box sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body1">No expense transactions found for selected Pie Chart filters</Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                Try selecting "All Months" or another period
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 3 }}>
              {/* Donut Chart with Direct Slices Labels */}
              <Box sx={{ width: { xs: '100%', md: '55%' }, height: 380, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 35, left: 35, bottom: 20 }}>
                    <Pie
                      data={pieCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={115}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value, percent }: any) =>
                        percent !== undefined && percent >= 0.03
                          ? `${name}: ₹${Math.round(Number(value)).toLocaleString('en-IN')} (${(percent * 100).toFixed(0)}%)`
                          : ''
                      }
                      labelLine={{ stroke: '#94a3b8', strokeWidth: 1.2 }}
                    >
                      {pieCategoryData.map((_entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Amount']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontWeight: 600,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center of Donut Info */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                    Total Expense
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                    {formatCurrency(pieTotalExpense)}
                  </Typography>
                </Box>
              </Box>

              {/* Category Breakdown Details List */}
              <Box
                sx={{
                  width: { xs: '100%', md: '45%' },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  maxHeight: 360,
                  overflowY: 'auto',
                  pr: 1,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  Amounts by Category ({pieCategoryData.length})
                </Typography>
                {pieCategoryData.map((c, i) => (
                  <Box
                    key={c.name}
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      border: '1px solid #f1f5f9',
                      bgcolor: '#fafafa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: PIE_COLORS[i % PIE_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {c.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.count} transaction{c.count > 1 ? 's' : ''} • {c.percentage}% of total
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.main' }}>
                      {formatCurrency(c.value)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Paper>

        {/* ==================== CHART 2: BAR CHART WITH INDIVIDUAL FILTER ==================== */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3.5,
            border: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header Bar with Title and INDIVIDUAL FILTERS */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', lg: 'center' },
              gap: 2,
              mb: 3,
              pb: 2,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(16, 185, 129, 0.08)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BarChartRoundedIcon />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Income vs Expense Trend (Bar Chart)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.8 }}>
                    <Chip
                      label="Income"
                      size="small"
                      sx={{ bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontWeight: 700, height: 22, fontSize: '0.7rem' }}
                    />
                    <Chip
                      label="Expense"
                      size="small"
                      sx={{ bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', fontWeight: 700, height: 22, fontSize: '0.7rem' }}
                    />
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Timeline distribution across date, month, and year with amounts displayed on each bar
                </Typography>
              </Box>
            </Box>

            {/* Individual Filters for Bar Chart */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                <FilterAltRoundedIcon fontSize="small" />
                <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Bar Filter:
                </Typography>
              </Box>

              {/* Bar Year */}
              <FormControl size="small" sx={{ minWidth: 95 }}>
                <InputLabel id="bar-year-label">Year</InputLabel>
                <Select
                  labelId="bar-year-label"
                  value={barYear}
                  label="Year"
                  onChange={(e) => {
                    setBarYear(e.target.value);
                    setBarDate('all');
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Years</MenuItem>
                  {availableYears.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Bar Month */}
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel id="bar-month-label">Month</InputLabel>
                <Select
                  labelId="bar-month-label"
                  value={barMonth}
                  label="Month"
                  onChange={(e) => {
                    setBarMonth(e.target.value);
                    setBarDate('all');
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Months</MenuItem>
                  {MONTH_NAMES.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Bar Date */}
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel id="bar-date-label">Date</InputLabel>
                <Select
                  labelId="bar-date-label"
                  value={barDate}
                  label="Date"
                  onChange={(e) => setBarDate(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Dates ({barFilteredDates.length})</MenuItem>
                  {barFilteredDates.map((d) => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <IconButton onClick={fetchBarAnalytics} size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <RefreshRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Bar Chart Display Area with Amounts on each bar */}
          {barLoading ? (
            <Box sx={{ py: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={36} />
            </Box>
          ) : barTimeSeries.length === 0 ? (
            <Box sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body1">No financial flow activity for selected Bar Chart filters</Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                Try selecting "All Months" or another period
              </Typography>
            </Box>
          ) : (
            <Box sx={{ width: '100%', height: 420 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barTimeSeries} margin={{ top: 32, right: 20, left: 10, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      formatCurrency(Number(val) || 0),
                      name === 'income' ? 'Income' : 'Expense',
                    ]}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontWeight: 600,
                    }}
                  />
                  {/* Green Income Bar with exact amount label on top */}
                  <Bar dataKey="income" name="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    <LabelList
                      dataKey="income"
                      position="top"
                      fill="#059669"
                      fontSize={10}
                      fontWeight={700}
                      formatter={formatBarAmount}
                    />
                  </Bar>
                  {/* Red Expense Bar with exact amount label on top */}
                  <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    <LabelList
                      dataKey="expense"
                      position="top"
                      fill="#dc2626"
                      fontSize={10}
                      fontWeight={700}
                      formatter={formatBarAmount}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}

          {/* Bar Chart Summary Footer */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 2,
              pt: 2,
              borderTop: '1px solid #f1f5f9',
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Total Points: <strong>{barTimeSeries.length}</strong>
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ color: '#059669', fontWeight: 700 }}>
                Period Income: {formatCurrency(barSummary.totalIncome)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 700 }}>
                Period Expense: {formatCurrency(barSummary.totalExpenses)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Net Balance: {barSummary.balance >= 0 ? '+' : ''}
                {formatCurrency(barSummary.balance)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Edit the selected budget target */}
      <Dialog
        open={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Set {budgetCategory === 'ALL' ? 'Monthly' : budgetCategory} Budget
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {MONTH_NAMES.find((m) => m.value === commonMonth)?.label} {commonYear}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsBudgetModalOpen(false)} aria-label="Close budget dialog">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Budget target (INR)"
            fullWidth
            type="number"
            value={budgetInput}
            onChange={(event) => {
              setBudgetInput(event.target.value);
              setBudgetSaveError('');
            }}
            error={Boolean(budgetSaveError)}
            helperText={budgetSaveError || `${formatCurrency(budget.actualAmount)} across matching transactions`}
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsBudgetModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveBudget} disabled={isSavingBudget}>
            {isSavingBudget ? <CircularProgress size={18} color="inherit" /> : 'Save Budget'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export { DashboardPage as DashboardView };
export default DashboardPage;
