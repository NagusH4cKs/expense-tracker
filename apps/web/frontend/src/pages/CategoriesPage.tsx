import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import RuleFolderRoundedIcon from '@mui/icons-material/RuleFolderRounded';

import { categoryService } from '../services/category.service';
import { groupService } from '../services/group.service';
import { ruleService } from '../services/rule.service';
import { CategoryItem } from '../types/category';
import { CategorizationRule } from '../types/rule';

export const CategoriesPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'categories' | 'rules'>('categories');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Add / Edit Category Dialog State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryGroupInput, setCategoryGroupInput] = useState('');

  // Add Group Dialog State
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Add / Edit Rule Dialog State
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [rulePattern, setRulePattern] = useState('');
  const [ruleMatchType, setRuleMatchType] = useState<'contains' | 'exact' | 'prefix' | 'regex'>('contains');
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleGroup, setRuleGroup] = useState('');
  const [rulePriority, setRulePriority] = useState<number>(50);
  const [ruleBank, setRuleBank] = useState('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [catsData, rulesData] = await Promise.all([
        categoryService.getAll(),
        ruleService.getAll(),
      ]);
      setCategories(catsData);
      setRules(rulesData);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load categories and rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryName('');
    setCategoryType('expense');
    setCategoryDesc('');
    setCategoryGroupInput('');
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategoryId(cat.id);
    setCategoryName(cat.name);
    setCategoryType(cat.type);
    setCategoryDesc(cat.description || '');
    setCategoryGroupInput('');
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      if (editingCategoryId) {
        await categoryService.update(editingCategoryId, {
          name: categoryName.trim(),
          type: categoryType,
          description: categoryDesc.trim() || undefined,
        });
      } else {
        const groupNames = categoryGroupInput
          .split(',')
          .map((g) => g.trim())
          .filter(Boolean);

        await categoryService.create({
          name: categoryName.trim(),
          type: categoryType,
          description: categoryDesc.trim() || undefined,
          groupNames: groupNames.length > 0 ? groupNames : undefined,
        });
      }

      setCategoryModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Delete category "${name}"? Transactions using it will be affected.`)) return;
    try {
      await categoryService.delete(id);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete category');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      await groupService.create({
        name: groupName.trim(),
        description: groupDesc.trim() || undefined,
        categoryId: selectedCategoryId || undefined,
      });

      setGroupName('');
      setGroupDesc('');
      setSelectedCategoryId('');
      setGroupModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to create group');
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!window.confirm(`Delete group "${name}"?`)) return;
    try {
      await groupService.delete(id);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete group');
    }
  };

  // Rule Handlers
  const handleOpenAddRule = () => {
    setEditingRuleId(null);
    setRulePattern('');
    setRuleMatchType('contains');
    setRuleCategory(categories[0]?.name || 'Groceries');
    setRuleGroup('');
    setRulePriority(50);
    setRuleBank('ALL');
    setRuleModalOpen(true);
  };

  const handleOpenEditRule = (rule: CategorizationRule) => {
    setEditingRuleId(rule.id);
    setRulePattern(rule.pattern);
    setRuleMatchType(rule.matchType);
    setRuleCategory(rule.category);
    setRuleGroup(rule.group || '');
    setRulePriority(rule.priority);
    setRuleBank(rule.bank || 'ALL');
    setRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rulePattern.trim() || !ruleCategory.trim()) return;

    try {
      if (editingRuleId) {
        await ruleService.update(editingRuleId, {
          pattern: rulePattern.trim(),
          matchType: ruleMatchType,
          category: ruleCategory.trim(),
          group: ruleGroup.trim() || null,
          priority: Number(rulePriority) || 50,
          bank: ruleBank,
        });
      } else {
        await ruleService.create({
          pattern: rulePattern.trim(),
          matchType: ruleMatchType,
          category: ruleCategory.trim(),
          group: ruleGroup.trim() || undefined,
          priority: Number(rulePriority) || 50,
          bank: ruleBank,
          isUserCreated: true,
        });
      }

      setRuleModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to save rule');
    }
  };

  const handleToggleRuleActive = async (rule: CategorizationRule) => {
    try {
      await ruleService.update(rule.id, { isActive: !rule.isActive });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r))
      );
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Delete this categorization rule?')) return;
    try {
      await ruleService.delete(id);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete rule');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header Panel */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 3.5,
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {currentTab === 'categories' ? <CategoryRoundedIcon fontSize="small" /> : <AutoFixHighRoundedIcon fontSize="small" />}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {currentTab === 'categories' ? 'Category & Group Master' : 'Automatic Categorization Engine'}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {currentTab === 'categories'
              ? 'Add, rename, and manage categories and their sub-groups for accurate financial classification.'
              : 'Configurable rule-based pattern engine. Narration prefixes, keywords, priorities, and bank-specific rules.'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Tooltip title="Refresh from API">
            <IconButton onClick={loadData} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {currentTab === 'categories' ? (
            <>
              <Button
                variant="outlined"
                startIcon={<LayersRoundedIcon />}
                onClick={() => {
                  setSelectedCategoryId(categories[0]?.id || '');
                  setGroupModalOpen(true);
                }}
                sx={{ fontWeight: 600, borderColor: '#e2e8f0' }}
              >
                Add Group
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddRoundedIcon />}
                onClick={handleOpenAddCategory}
                sx={{ fontWeight: 600 }}
              >
                Add Category
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenAddRule}
              sx={{ fontWeight: 600 }}
            >
              Add Rule
            </Button>
          )}
        </Box>
      </Paper>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={currentTab}
          onChange={(_e, val) => setCurrentTab(val)}
          sx={{
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '0.92rem', minHeight: 48 },
          }}
        >
          <Tab
            value="categories"
            label={`Categories & Groups (${categories.length})`}
            icon={<CategoryRoundedIcon fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            value="rules"
            label={`Categorization Rules (${rules.length})`}
            icon={<RuleFolderRoundedIcon fontSize="small" />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} />
        </Box>
      ) : currentTab === 'categories' ? (
        /* ==================== TAB 1: CATEGORIES & GROUPS ==================== */
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2.5,
          }}
        >
          {categories.map((cat) => (
            <Paper
              key={cat.id}
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                bgcolor: '#ffffff',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.light',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                },
              }}
            >
              <Box>
                {/* Category Title & Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {cat.name}
                    </Typography>
                    <Chip
                      label={cat.type.toUpperCase()}
                      size="small"
                      sx={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        height: 20,
                        bgcolor:
                          cat.type === 'income'
                            ? '#ecfdf5'
                            : cat.type === 'transfer'
                              ? '#eff6ff'
                              : '#fef2f2',
                        color:
                          cat.type === 'income'
                            ? '#047857'
                            : cat.type === 'transfer'
                              ? '#1d4ed8'
                              : '#b91c1c',
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Rename / Edit Category">
                      <IconButton size="small" onClick={() => handleOpenEditCategory(cat)} sx={{ color: 'text.secondary' }}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Category">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {cat.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {cat.description}
                  </Typography>
                )}

                {/* Sub-groups badges */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    Sub-Groups ({cat.groups?.length || 0})
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {cat.groups && cat.groups.length > 0 ? (
                      cat.groups.map((grp) => (
                        <Chip
                          key={grp.id}
                          label={grp.name}
                          onDelete={() => handleDeleteGroup(grp.id, grp.name)}
                          deleteIcon={<CloseRoundedIcon style={{ fontSize: 14 }} />}
                          variant="outlined"
                          sx={{
                            borderRadius: 1.5,
                            bgcolor: '#f8fafc',
                            borderColor: '#cbd5e1',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                          }}
                        />
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No groups created yet.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Add Group button in Card footer */}
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setGroupModalOpen(true);
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  Add sub-group
                </Button>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        /* ==================== TAB 2: CATEGORIZATION RULES ==================== */
        <Paper elevation={0} sx={{ borderRadius: 3.5, border: '1px solid #e2e8f0', overflow: 'hidden', bgcolor: '#ffffff' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>PRIORITY</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>PATTERN / CONDITION</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>MATCH TYPE</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>TARGET CATEGORY</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>DEFAULT GROUP</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>BANK SCOPE</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>ACTIVE</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} hover sx={{ opacity: rule.isActive ? 1 : 0.6 }}>
                    <TableCell>
                      <Chip
                        label={rule.priority}
                        size="small"
                        color={rule.priority >= 80 ? 'primary' : rule.priority >= 60 ? 'info' : 'default'}
                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        {rule.pattern}
                      </Typography>
                      {rule.isUserCreated && (
                        <Chip label="User Saved Pattern" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem', color: 'primary.main', mt: 0.3 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={rule.matchType.toUpperCase()}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={rule.category}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          bgcolor: rule.category === 'Transfer' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(79, 70, 229, 0.08)',
                          color: rule.category === 'Transfer' ? 'primary.dark' : 'primary.main',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                      {rule.group || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={rule.bank || 'ALL'}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.68rem' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={rule.isActive}
                        onChange={() => handleToggleRuleActive(rule)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => handleOpenEditRule(rule)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteRule(rule.id)} color="error">
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ==================== MODAL: ADD / EDIT CATEGORY ==================== */}
      <Dialog
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}
      >
        <form onSubmit={handleSaveCategory}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {editingCategoryId ? 'Rename / Edit Category' : 'Create New Category'}
            </Typography>
            <IconButton size="small" onClick={() => setCategoryModalOpen(false)}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
            <TextField
              label="Category Name"
              required
              fullWidth
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Shopping, Petrol, Travel"
            />

            <FormControl fullWidth>
              <InputLabel id="category-type-label">Category Type</InputLabel>
              <Select
                labelId="category-type-label"
                value={categoryType}
                label="Category Type"
                onChange={(e) => setCategoryType(e.target.value as any)}
              >
                <MenuItem value="expense">Expense (Outflow)</MenuItem>
                <MenuItem value="income">Income (Credits)</MenuItem>
                <MenuItem value="transfer">Transfer (Internal Account Transfer)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Description (Optional)"
              fullWidth
              multiline
              rows={2}
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
              placeholder="Brief description of this spending category"
            />

            {!editingCategoryId && (
              <TextField
                label="Initial Sub-Groups (Optional)"
                fullWidth
                value={categoryGroupInput}
                onChange={(e) => setCategoryGroupInput(e.target.value)}
                placeholder="e.g. Tea, Coffee, Puffs (comma separated)"
                helperText="Separate multiple initial groups with commas"
              />
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingCategoryId ? 'Update Category' : 'Create Category'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ==================== MODAL: ADD GROUP ==================== */}
      <Dialog
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}
      >
        <form onSubmit={handleCreateGroup}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Add Sub-Group
            </Typography>
            <IconButton size="small" onClick={() => setGroupModalOpen(false)}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
            <FormControl fullWidth required>
              <InputLabel id="parent-category-label">Parent Category</InputLabel>
              <Select
                labelId="parent-category-label"
                value={selectedCategoryId}
                label="Parent Category"
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Group Name"
              required
              fullWidth
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Samosa, Haircut, Metro"
            />

            <TextField
              label="Description (Optional)"
              fullWidth
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder="Optional notes"
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setGroupModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Create Group
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ==================== MODAL: ADD / EDIT RULE ==================== */}
      <Dialog
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}
      >
        <form onSubmit={handleSaveRule}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {editingRuleId ? 'Edit Categorization Rule' : 'Add New Categorization Rule'}
            </Typography>
            <IconButton size="small" onClick={() => setRuleModalOpen(false)}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
            <TextField
              label="Matching Pattern / Keywords"
              required
              fullWidth
              value={rulePattern}
              onChange={(e) => setRulePattern(e.target.value)}
              placeholder="e.g. tea, coffee, snacks OR zerodha OR f "
              helperText="For 'contains', separate multiple keywords with commas"
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="match-type-label">Match Type</InputLabel>
                <Select
                  labelId="match-type-label"
                  value={ruleMatchType}
                  label="Match Type"
                  onChange={(e) => setRuleMatchType(e.target.value as any)}
                >
                  <MenuItem value="contains">Contains Keywords</MenuItem>
                  <MenuItem value="prefix">Prefix (Starts With)</MenuItem>
                  <MenuItem value="exact">Exact Match</MenuItem>
                  <MenuItem value="regex">Regular Expression</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Priority (Higher = Evaluated First)"
                type="number"
                fullWidth
                value={rulePriority}
                onChange={(e) => setRulePriority(Number(e.target.value))}
                helperText="Default: 50. High priority rules (e.g. 90-100) match first."
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel id="rule-category-label">Target Category</InputLabel>
                <Select
                  labelId="rule-category-label"
                  value={ruleCategory}
                  label="Target Category"
                  onChange={(e) => setRuleCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="rule-bank-label">Bank Scope</InputLabel>
                <Select
                  labelId="rule-bank-label"
                  value={ruleBank}
                  label="Bank Scope"
                  onChange={(e) => setRuleBank(e.target.value)}
                >
                  <MenuItem value="ALL">All Banks</MenuItem>
                  <MenuItem value="ICICI">ICICI Bank</MenuItem>
                  <MenuItem value="SBI">SBI Bank</MenuItem>
                  <MenuItem value="HDFC">HDFC Bank</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Default Sub-Group (Optional)"
              fullWidth
              value={ruleGroup}
              onChange={(e) => setRuleGroup(e.target.value)}
              placeholder="e.g. Quick Bites, Monthly Salary"
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRuleModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingRuleId ? 'Update Rule' : 'Save Rule'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default CategoriesPage;
