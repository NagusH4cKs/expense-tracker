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
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

import { categoryService } from '../services/category.service';
import { groupService } from '../services/group.service';
import { CategoryItem } from '../types/category';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Add Category Dialog State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryGroupInput, setCategoryGroupInput] = useState(''); // e.g. "Tea, Coffee, Puffs"

  // Add Group Dialog State
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      // Parse group input if user gave initial groups (e.g. "Tea, Coffee, Puffs")
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

      setCategoryName('');
      setCategoryDesc('');
      setCategoryGroupInput('');
      setCategoryModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to create category');
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

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    try {
      await categoryService.delete(id);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete category');
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
              <CategoryRoundedIcon fontSize="small" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Category & Group Masters
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Manage main categories (e.g. Snacks, Grocery, Travel) and their sub-groups (e.g. Tea, Coffee, Puffs).
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Tooltip title="Refresh from API">
            <IconButton
              onClick={loadData}
              sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}
            >
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

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
            onClick={() => setCategoryModalOpen(true)}
            sx={{ fontWeight: 600 }}
          >
            Add Category
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} />
        </Box>
      ) : (
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {cat.name}
                      </Typography>
                      <Chip
                        label={cat.type.toUpperCase()}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          bgcolor: cat.type === 'income' ? '#ecfdf5' : '#fef2f2',
                          color: cat.type === 'income' ? '#047857' : '#b91c1c',
                        }}
                      />
                    </Box>
                    {cat.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.85rem' }}>
                        {cat.description}
                      </Typography>
                    )}
                  </Box>

                  <Tooltip title="Delete Category">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      sx={{ color: '#94a3b8', '&:hover': { color: 'error.main' } }}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Sub-Groups Area */}
                <Box
                  sx={{
                    mt: 2.5,
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: '#f8fafc',
                    border: '1px solid #edf2f7',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Groups / Sub-Items ({cat.groups.length})
                    </Typography>

                    <Button
                      size="small"
                      startIcon={<AddRoundedIcon />}
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setGroupModalOpen(true);
                      }}
                      sx={{ py: 0.2, px: 1, fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      Add Group
                    </Button>
                  </Box>

                  {cat.groups.length > 0 ? (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {cat.groups.map((group) => (
                        <Chip
                          key={group.id}
                          label={group.name}
                          size="small"
                          onDelete={() => handleDeleteGroup(group.id, group.name)}
                          sx={{
                            bgcolor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            '& .MuiChip-deleteIcon': {
                              color: '#94a3b8',
                              fontSize: 16,
                              '&:hover': { color: 'error.main' },
                            },
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', display: 'block' }}>
                      No groups added yet. Click &quot;Add Group&quot; to assign items like tea, coffee, etc.
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Add Category Dialog */}
      <Dialog
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <form onSubmit={handleCreateCategory}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Add New Category
            </Typography>
            <IconButton onClick={() => setCategoryModalOpen(false)} size="small">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>
            <TextField
              label="Category Name"
              placeholder="e.g. Snacks, Grocery, Travel"
              fullWidth
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel id="category-type-label">Type</InputLabel>
              <Select
                labelId="category-type-label"
                value={categoryType}
                label="Type"
                onChange={(e) => setCategoryType(e.target.value as 'expense' | 'income')}
              >
                <MenuItem value="expense">Expense</MenuItem>
                <MenuItem value="income">Income</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Description (Optional)"
              placeholder="e.g. Daily office snacks and refreshments"
              fullWidth
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
            />

            {/* Option to specify initial groups */}
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                OPTION: Initial Groups (Comma Separated)
              </Typography>
              <TextField
                placeholder="e.g. Tea, Coffee, Puffs, Samosa"
                fullWidth
                size="small"
                value={categoryGroupInput}
                onChange={(e) => setCategoryGroupInput(e.target.value)}
                helperText="Give initial sub-groups for this category separated by commas"
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => setCategoryModalOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" sx={{ px: 3, fontWeight: 600 }}>
              Create Category
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Add Group Dialog */}
      <Dialog
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <form onSubmit={handleCreateGroup}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Add New Group
            </Typography>
            <IconButton onClick={() => setGroupModalOpen(false)} size="small">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>
            <TextField
              label="Group Name"
              placeholder="e.g. Tea, Coffee, Puffs, Dinner"
              fullWidth
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel id="assign-category-label">Assign to Category</InputLabel>
              <Select
                labelId="assign-category-label"
                value={selectedCategoryId}
                label="Assign to Category"
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
              label="Description (Optional)"
              placeholder="e.g. Hot tea from local stalls"
              fullWidth
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => setGroupModalOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" sx={{ px: 3, fontWeight: 600 }}>
              Create Group
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export { CategoriesPage as CategoryMaster };
export default CategoriesPage;
