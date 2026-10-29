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
  Collapse,
  Divider,
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
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded';
import UnfoldLessRoundedIcon from '@mui/icons-material/UnfoldLessRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

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

  // Expand / Collapse state for the 4 financial cards (as requested by user)
  const [expandedCards, setExpandedCards] = useState<{
    budget: boolean;
    income: boolean;
    expense: boolean;
    remaining: boolean;
  }>({
    budget: false,
    income: false,
    expense: false,
    remaining: false,
  });

  const isAllExpanded = expandedCards.budget && expandedCards.income && expandedCards.expense && expandedCards.remaining;

  const toggleExpandCard = (card: 'budget' | 'income' | 'expense' | 'remaining') => {
    setExpandedCards((prev) => ({ ...prev, [card]: !prev[card] }));
  };

  const toggleAllCards = () => {
    const nextState = !isAllExpanded;
    setExpandedCards({
      budget: nextState,
      income: nextState,
      expense: nextState,
      remaining: nextState,
    });
  };

  // Category budget input map for live tallying and setting category budgets
  const [categoryBudgetInputs, setCategoryBudgetInputs] = useState<Record<string, string>>({});
  const [savingCategoryBudget, setSavingCategoryBudget] = useState<string | null>(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [budgetSaveError, setBudgetSaveError] = useState<string>('');
  const [isSavingBudget, setIsSavingBudget] = useState<boolean>(false);
  const [dbCategories, setDbCategories] = useState<CategoryItem[]>([]);

  // Load category choices from the master
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
      });
      if (requestId !== overviewRequestId.current) return;
      if (data.filters?.availableYears?.length) {
        setAvailableYears(data.filters.availableYears);
      }
      if (data.filters?.availableDates?.length) {
        setAvailableDates(data.filters.availableDates);
      }

      // Open on the latest imported month when the current month has no transactions.
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

      // Populate category budget inputs
      if (data.categoryFinancials) {
        const inputMap: Record<string, string> = {};
        data.categoryFinancials.forEach((c) => {
          inputMap[c.category] = c.budgetAmount > 0 ? String(c.budgetAmount) : '';
        });
        setCategoryBudgetInputs(inputMap);
      }
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
  }, [commonYear, commonMonth, commonDate]);

  useEffect(() => {
    fetchPieAnalytics();
  }, [pieYear, pieMonth, pieDate]);

  useEffect(() => {
    fetchBarAnalytics();
  }, [barYear, barMonth, barDate]);

  // Listen to transaction updates
  useEffect(() => {
    const handleRefresh = () => {
      fetchOverviewAnalytics();
      fetchPieAnalytics();
      fetchBarAnalytics();
    };
    window.addEventListener('transaction-updated', handleRefresh);
    return () => window.removeEventListener('transaction-updated', handleRefresh);
  }, [commonYear, commonMonth, commonDate, pieYear, pieMonth, pieDate, barYear, barMonth, barDate]);

  // Handle changing input for a single category budget
  const handleCategoryBudgetInputChange = (catName: string, val: string) => {
    setCategoryBudgetInputs((prev) => ({ ...prev, [catName]: val }));
  };

  // Save an individual category budget
  const handleSaveCategoryBudget = async (catName: string) => {
    if (commonYear === 'all' || commonMonth === 'all') {
      alert('Please select a specific year and month to set budget targets.');
      return;
    }
    const rawVal = categoryBudgetInputs[catName] || '0';
    const amount = Math.max(0, parseFloat(rawVal) || 0);

    try {
      setSavingCategoryBudget(catName);
      await budgetService.setBudget(Number(commonYear), Number(commonMonth), amount, catName);
      await fetchOverviewAnalytics();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save category budget.');
    } finally {
      setSavingCategoryBudget(null);
    }
  };

  // Open general monthly budget modal
  const handleOpenBudgetModal = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setBudgetInput(String(overviewData?.budget?.monthlyAllBudget || overviewData?.budget?.budgetAmount || 0));
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
      await budgetService.setBudget(Number(commonYear), Number(commonMonth), amount, 'ALL');
      setIsBudgetModalOpen(false);
      await fetchOverviewAnalytics();
    } catch (err: any) {
      setBudgetSaveError(err?.response?.data?.message || 'Failed to save budget.');
    } finally {
      setIsSavingBudget(false);
    }
  };

  // Dynamic Tally Calculation (Voice Note Specification):
  // 1. Calculate sum of category budget inputs
  const talliedCategoryBudget = useMemo(() => {
    let sum = 0;
    Object.values(categoryBudgetInputs).forEach((v) => {
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) sum += n;
    });
    return sum;
  }, [categoryBudgetInputs]);

  // 2. If user set values for categories, overall monthly budget is tallied from categories!
  // If no category values given, monthly budget record is taken!
  const hasCategoryBudgets = talliedCategoryBudget > 0;
  const overallMonthlyBudget = hasCategoryBudgets
    ? talliedCategoryBudget
    : (overviewData?.budget?.monthlyAllBudget || overviewData?.budget?.budgetAmount || 0);

  const overallTotalExpenses = overviewData?.summary?.totalExpenses || 0;
  const overallTotalIncome = overviewData?.summary?.totalIncome || 0;
  const overallRemainingBudget = Math.max(0, overallMonthlyBudget - overallTotalExpenses);
  const overallOverBudget = overallTotalExpenses > overallMonthlyBudget && overallMonthlyBudget > 0
    ? overallTotalExpenses - overallMonthlyBudget
    : 0;
  const overallPercentageSpent = overallMonthlyBudget > 0
    ? Math.min(100, Math.round((overallTotalExpenses / overallMonthlyBudget) * 100))
    : 0;

  const budgetStatus = overallMonthlyBudget === 0
    ? 'Not Set'
    : overallOverBudget > 0
      ? 'Over Budget'
      : 'Within Budget';

  const budgetStatusColor = overallMonthlyBudget === 0
    ? 'default'
    : overallOverBudget > 0
      ? 'error'
      : 'success';
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

      {/* ---------------- 2. 4 FINANCIAL & BUDGET CARDS (WITH EXPAND / COLLAPSE & TALLYING) ---------------- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: -1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
          Monthly Overview & Budget Breakdown
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={toggleAllCards}
          startIcon={isAllExpanded ? <UnfoldLessRoundedIcon fontSize="small" /> : <UnfoldMoreRoundedIcon fontSize="small" />}
          sx={{ borderRadius: 2, fontSize: '0.75rem', fontWeight: 600, textTransform: 'none', py: 0.4 }}
        >
          {isAllExpanded ? 'Collapse All Categories' : 'Expand All Categories'}
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        {/* CARD 1: Monthly Budget with Subcategory Setting & Tallying */}
        <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3.5, bgcolor: '#ffffff', transition: 'all 0.2s' }}>
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
                label={hasCategoryBudgets ? 'Tallied from Categories' : overallMonthlyBudget > 0 ? 'Active Target' : 'Not Set'}
                size="small"
                color={overallMonthlyBudget > 0 ? 'primary' : 'default'}
                variant="outlined"
                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
              />
            </Box>

            {/* Field label with Expand / Collapse toggle right before the field name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => toggleExpandCard('budget')}
                aria-label={expandedCards.budget ? 'Collapse subcategories' : 'Expand subcategories'}
                sx={{
                  p: 0.4,
                  color: expandedCards.budget ? 'primary.main' : 'text.secondary',
                  bgcolor: expandedCards.budget ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                  borderRadius: 1.5,
                }}
              >
                {expandedCards.budget ? <KeyboardArrowDownRoundedIcon fontSize="small" /> : <KeyboardArrowRightRoundedIcon fontSize="small" />}
              </IconButton>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Monthly Budget
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {overallMonthlyBudget > 0 ? formatCurrency(overallMonthlyBudget) : '₹0'}
              </Typography>
              <IconButton
                size="small"
                onClick={handleOpenBudgetModal}
                disabled={commonYear === 'all' || commonMonth === 'all'}
                aria-label="Set monthly budget"
                sx={{ color: 'primary.main' }}
                title="Edit base monthly target"
              >
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 0.5 }}>
              {hasCategoryBudgets
                ? `Sum of category targets (${Object.values(categoryBudgetInputs).filter((v) => parseFloat(v) > 0).length} budgeted)`
                : overallMonthlyBudget > 0
                  ? 'Base monthly target (expand to set per category)'
                  : 'Expand or click edit to set budget'}
            </Typography>

            {/* SUB-CATEGORIES UNDER MONTHLY BUDGET (Expand/Collapse) */}
            <Collapse in={expandedCards.budget} timeout="auto" unmountOnExit>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.68rem', display: 'block', mb: 1.5 }}>
                Category Target Budgets (Live Tally)
              </Typography>
              <Box sx={{ maxHeight: 340, overflowY: 'auto', pr: 0.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {(overviewData?.categoryFinancials || dbCategories).map((item: any) => {
                  const catName = item.category || item.name;
                  const inputValue = categoryBudgetInputs[catName] !== undefined ? categoryBudgetInputs[catName] : '';
                  const isSavingThis = savingCategoryBudget === catName;

                  return (
                    <Box
                      key={catName}
                      sx={{
                        p: 1.2,
                        borderRadius: 2,
                        bgcolor: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }} noWrap>
                          {catName}
                        </Typography>
                        {item.type && (
                          <Chip
                            label={item.type}
                            size="small"
                            sx={{ height: 16, fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700 }}
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          size="small"
                          type="number"
                          placeholder="Target ₹"
                          value={inputValue}
                          onChange={(e) => handleCategoryBudgetInputChange(catName, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveCategoryBudget(catName);
                            }
                          }}
                          slotProps={{
                            input: {
                              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              sx: { fontSize: '0.8rem', height: 32, bgcolor: '#ffffff' },
                            },
                          }}
                          fullWidth
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleSaveCategoryBudget(catName)}
                          disabled={isSavingThis || commonYear === 'all' || commonMonth === 'all'}
                          color="primary"
                          title="Save category budget"
                          sx={{ border: '1px solid #cbd5e1', borderRadius: 1.5, p: 0.6 }}
                        >
                          {isSavingThis ? <CircularProgress size={16} /> : <CheckRoundedIcon fontSize="small" />}
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        {/* CARD 2: Total Income with Subcategory Breakdown */}
        <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3.5, bgcolor: '#ffffff', transition: 'all 0.2s' }}>
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
              <Chip
                label="Total Credits"
                size="small"
                color="success"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
              />
            </Box>

            {/* Field label with Expand / Collapse toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => toggleExpandCard('income')}
                aria-label={expandedCards.income ? 'Collapse income categories' : 'Expand income categories'}
                sx={{
                  p: 0.4,
                  color: expandedCards.income ? 'success.dark' : 'text.secondary',
                  bgcolor: expandedCards.income ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                  borderRadius: 1.5,
                }}
              >
                {expandedCards.income ? <KeyboardArrowDownRoundedIcon fontSize="small" /> : <KeyboardArrowRightRoundedIcon fontSize="small" />}
              </IconButton>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Total Income
              </Typography>
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.dark', ml: 0.5 }}>
              {formatCurrency(overallTotalIncome)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 0.5 }}>
              {overviewData?.budget?.incomeTransactionCount || 0} income credits (Transfers excluded)
            </Typography>

            {/* SUB-CATEGORIES UNDER INCOME (Expand/Collapse) */}
            <Collapse in={expandedCards.income} timeout="auto" unmountOnExit>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.68rem', display: 'block', mb: 1.5 }}>
                Category Income Credits (Tallies to Total)
              </Typography>
              <Box sx={{ maxHeight: 340, overflowY: 'auto', pr: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(overviewData?.categoryFinancials || [])
                  .filter((c) => c.incomeAmount > 0 || c.type === 'income')
                  .map((item) => (
                    <Box
                      key={item.category}
                      sx={{
                        p: 1.2,
                        borderRadius: 2,
                        bgcolor: item.incomeAmount > 0 ? 'rgba(34, 197, 94, 0.04)' : '#f8fafc',
                        border: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                          {item.category}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.transactionCount} transactions
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark' }}>
                        +{formatCurrency(item.incomeAmount)}
                      </Typography>
                    </Box>
                  ))}
                {(overviewData?.categoryFinancials || []).filter((c) => c.incomeAmount > 0 || c.type === 'income').length === 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No income transactions in this period.
                  </Typography>
                )}
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        {/* CARD 3: Total Expenses with Subcategory Breakdown */}
        <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3.5, bgcolor: '#ffffff', transition: 'all 0.2s' }}>
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
              <Chip
                label="Total Debits"
                size="small"
                color="error"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
              />
            </Box>

            {/* Field label with Expand / Collapse toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => toggleExpandCard('expense')}
                aria-label={expandedCards.expense ? 'Collapse expense categories' : 'Expand expense categories'}
                sx={{
                  p: 0.4,
                  color: expandedCards.expense ? 'error.dark' : 'text.secondary',
                  bgcolor: expandedCards.expense ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  borderRadius: 1.5,
                }}
              >
                {expandedCards.expense ? <KeyboardArrowDownRoundedIcon fontSize="small" /> : <KeyboardArrowRightRoundedIcon fontSize="small" />}
              </IconButton>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Total Expenses
              </Typography>
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main', ml: 0.5 }}>
              {formatCurrency(overallTotalExpenses)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 0.5 }}>
              {overviewData?.budget?.expenseTransactionCount || 0} expense debits (Transfers excluded)
            </Typography>

            {/* SUB-CATEGORIES UNDER EXPENSES (Expand/Collapse) */}
            <Collapse in={expandedCards.expense} timeout="auto" unmountOnExit>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.68rem', display: 'block', mb: 1.5 }}>
                Category Expense Debits (Tallies to Total)
              </Typography>
              <Box sx={{ maxHeight: 340, overflowY: 'auto', pr: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(overviewData?.categoryFinancials || [])
                  .filter((c) => c.expenseAmount > 0 || c.type === 'expense')
                  .sort((a, b) => b.expenseAmount - a.expenseAmount)
                  .map((item) => (
                    <Box
                      key={item.category}
                      sx={{
                        p: 1.2,
                        borderRadius: 2,
                        bgcolor: item.expenseAmount > 0 ? 'rgba(239, 68, 68, 0.03)' : '#f8fafc',
                        border: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                          {item.category}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {overallTotalExpenses > 0 ? Math.round((item.expenseAmount / overallTotalExpenses) * 100) : 0}% of expenses
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                        {formatCurrency(item.expenseAmount)}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        {/* CARD 4: Remaining Budget with Subcategory Breakdown */}
        <Card
          elevation={0}
          sx={{
            border: '1px solid #e2e8f0',
            borderRadius: 3.5,
            bgcolor: overallOverBudget > 0 ? 'rgba(239, 68, 68, 0.04)' : '#ffffff',
            transition: 'all 0.2s',
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
                {budgetStatusColor === 'error' ? <WarningAmberRoundedIcon /> : <CheckCircleRoundedIcon />}
              </Box>
              <Chip
                label={budgetStatus}
                size="small"
                color={budgetStatusColor}
                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
              />
            </Box>

            {/* Field label with Expand / Collapse toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => toggleExpandCard('remaining')}
                aria-label={expandedCards.remaining ? 'Collapse remaining budget' : 'Expand remaining budget'}
                sx={{
                  p: 0.4,
                  color: expandedCards.remaining ? `${budgetStatusColor}.dark` : 'text.secondary',
                  bgcolor: expandedCards.remaining ? `${budgetStatusColor}.light` : 'transparent',
                  borderRadius: 1.5,
                }}
              >
                {expandedCards.remaining ? <KeyboardArrowDownRoundedIcon fontSize="small" /> : <KeyboardArrowRightRoundedIcon fontSize="small" />}
              </IconButton>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Remaining Budget
              </Typography>
            </Box>

            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: `${budgetStatusColor}.dark`,
                ml: 0.5,
              }}
            >
              {overallOverBudget > 0
                ? `- ${formatCurrency(overallOverBudget)}`
                : formatCurrency(overallRemainingBudget)}
            </Typography>

            {overallMonthlyBudget > 0 && (
              <Box sx={{ mt: 1, ml: 0.5 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, overallPercentageSpent)}
                  color={overallOverBudget > 0 ? 'error' : overallPercentageSpent > 80 ? 'warning' : 'primary'}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4 }}>
                  {overallPercentageSpent}% spent of {formatCurrency(overallMonthlyBudget)}
                </Typography>
              </Box>
            )}

            {/* SUB-CATEGORIES UNDER REMAINING (Expand/Collapse) */}
            <Collapse in={expandedCards.remaining} timeout="auto" unmountOnExit>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.68rem', display: 'block', mb: 1.5 }}>
                Category Target Status (Tallies to Remaining)
              </Typography>
              <Box sx={{ maxHeight: 340, overflowY: 'auto', pr: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(overviewData?.categoryFinancials || [])
                  .filter((c) => c.type === 'expense' || c.budgetAmount > 0 || c.expenseAmount > 0)
                  .map((item) => {
                    const assignedBudget = parseFloat(categoryBudgetInputs[item.category]) || item.budgetAmount || 0;
                    const diff = assignedBudget - item.expenseAmount;
                    const isOver = diff < 0 && assignedBudget > 0;
                    const isNoBudget = assignedBudget === 0;

                    return (
                      <Box
                        key={item.category}
                        sx={{
                          p: 1.2,
                          borderRadius: 2,
                          bgcolor: isOver ? 'rgba(239, 68, 68, 0.04)' : '#f8fafc',
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                            {item.category}
                          </Typography>
                          <Chip
                            label={
                              isNoBudget
                                ? `Spent ${formatCurrency(item.expenseAmount)}`
                                : isOver
                                  ? `−${formatCurrency(Math.abs(diff))} Over`
                                  : `${formatCurrency(diff)} Left`
                            }
                            size="small"
                            color={isNoBudget ? 'default' : isOver ? 'error' : 'success'}
                            sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }}
                          />
                        </Box>
                        {assignedBudget > 0 && (
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, Math.round((item.expenseAmount / assignedBudget) * 100))}
                            color={isOver ? 'error' : 'primary'}
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                        )}
                      </Box>
                    );
                  })}
              </Box>
            </Collapse>
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
              Set Base Monthly Budget
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
            label="Monthly Budget Target (INR)"
            fullWidth
            type="number"
            value={budgetInput}
            onChange={(event) => {
              setBudgetInput(event.target.value);
              setBudgetSaveError('');
            }}
            error={Boolean(budgetSaveError)}
            helperText={budgetSaveError || 'Applied as overall monthly budget when subcategory budgets are not specified'}
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
