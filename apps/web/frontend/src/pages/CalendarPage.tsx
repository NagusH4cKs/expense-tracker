import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { calendarService, CalendarEventItem, CalendarEventPayload } from '../services/calendar.service';
import { categoryService } from '../services/category.service';
import { CategoryItem } from '../types/category';

type CalendarView = 'month' | 'week' | 'day' | 'year';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad = (value: number) => String(value).padStart(2, '0');
const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const shiftDays = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const weekStart = (date: Date) => shiftDays(date, -((date.getDay() + 6) % 7));
const monthTitle = (date: Date) => date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const formatDay = (date: Date) => date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const formatMoney = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(value);

const shiftAnchor = (date: Date, view: CalendarView, direction: number) => {
  if (view === 'year') return new Date(date.getFullYear() + direction, date.getMonth(), 1);
  if (view === 'month') return new Date(date.getFullYear(), date.getMonth() + direction, 1);
  return shiftDays(date, direction * (view === 'week' ? 7 : 1));
};

export const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventItem | null>(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(toDateKey(new Date()));
  const [dueTime, setDueTime] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [dialogError, setDialogError] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      setEvents(await calendarService.list());
    } catch (error: any) {
      setPageError(error.response?.data?.message || 'Could not load calendar events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    categoryService.getAll('expense').then(setCategories).catch(() => setCategories([]));
  }, [loadEvents]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEventItem[]>();
    for (const event of events) {
      const existing = grouped.get(event.dueDate) || [];
      existing.push(event);
      grouped.set(event.dueDate, existing);
    }
    return grouped;
  }, [events]);

  const sortedForDate = (date: Date) => [...(eventsByDate.get(toDateKey(date)) || [])]
    .sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || ''));

  const openCreate = (date = toDateKey(anchorDate)) => {
    setEditingEvent(null);
    setTitle('');
    setDueDate(date);
    setDueTime('');
    setAmount('');
    setCategory('');
    setDescription('');
    setDialogError('');
    setDialogOpen(true);
  };

  const openEdit = (event: CalendarEventItem) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDueDate(event.dueDate);
    setDueTime(event.dueTime || '');
    setAmount(event.amount === null || event.amount === undefined ? '' : String(event.amount));
    setCategory(event.category || '');
    setDescription(event.description || '');
    setDialogError('');
    setDialogOpen(true);
  };

  const handleSave = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setDialogError('');
    if (!title.trim()) return setDialogError('Enter a title for this reminder.');
    const numericAmount = amount.trim() ? Number(amount) : null;
    if (numericAmount !== null && (!Number.isFinite(numericAmount) || numericAmount < 0)) {
      return setDialogError('Enter a valid amount.');
    }
    const payload: CalendarEventPayload = {
      title: title.trim(),
      dueDate,
      dueTime: dueTime || undefined,
      amount: numericAmount,
      category: category || undefined,
      description: description.trim() || undefined,
    };
    setSaving(true);
    try {
      if (editingEvent) await calendarService.update(editingEvent.id, payload);
      else await calendarService.create(payload);
      setDialogOpen(false);
      await loadEvents();
    } catch (error: any) {
      setDialogError(error.response?.data?.message || 'Could not save this reminder.');
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (event: CalendarEventItem) => {
    try {
      const updated = await calendarService.update(event.id, { isCompleted: !event.isCompleted });
      setEvents((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error: any) {
      setPageError(error.response?.data?.message || 'Could not update this reminder.');
    }
  };

  const removeEvent = async (event: CalendarEventItem) => {
    try {
      await calendarService.remove(event.id);
      setEvents((current) => current.filter((item) => item.id !== event.id));
    } catch (error: any) {
      setPageError(error.response?.data?.message || 'Could not delete this reminder.');
    }
  };

  const renderEvent = (event: CalendarEventItem, compact = false) => (
    <Card
      key={event.id}
      variant="outlined"
      onClick={() => openEdit(event)}
      sx={{
        cursor: 'pointer',
        borderRadius: 2,
        bgcolor: event.isCompleted ? '#f8fafc' : 'color-mix(in srgb, var(--app-primary) 6%, white)',
        borderColor: event.isCompleted ? '#e2e8f0' : 'color-mix(in srgb, var(--app-primary) 22%, white)',
        opacity: event.isCompleted ? 0.72 : 1,
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <CardContent sx={{ p: compact ? 0.8 : 1.5, '&:last-child': { pb: compact ? 0.8 : 1.5 } }}>
        <Stack direction="row" alignItems="flex-start" spacing={0.5}>
          <Checkbox
            checked={event.isCompleted}
            size="small"
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleComplete(event)}
            sx={{ p: 0.25, mt: -0.2 }}
            inputProps={{ 'aria-label': event.isCompleted ? 'Mark reminder not done' : 'Mark reminder done' }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 700,
                lineHeight: 1.3,
                textDecoration: event.isCompleted ? 'line-through' : 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: compact ? 'nowrap' : 'normal',
              }}
            >
              {event.dueTime ? `${event.dueTime} · ` : ''}{event.title}
            </Typography>
            {!compact && (
              <>
                {event.amount !== null && event.amount !== undefined && (
                  <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 700, mt: 0.5 }}>
                    {formatMoney(event.amount)}{event.category ? ` · ${event.category}` : ''}
                  </Typography>
                )}
                {event.description && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{event.description}</Typography>}
              </>
            )}
          </Box>
          {!compact && (
            <Tooltip title="Delete reminder">
              <IconButton
                size="small"
                aria-label="Delete reminder"
                onClick={(e) => { e.stopPropagation(); removeEvent(event); }}
                sx={{ mt: -0.75, mr: -0.75, color: 'text.secondary' }}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  const monthDays = useMemo(() => {
    const first = monthStart(anchorDate);
    const start = shiftDays(first, -((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => shiftDays(start, index));
  }, [anchorDate]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => shiftDays(weekStart(anchorDate), index)), [anchorDate]);
  const todayKey = toDateKey(new Date());
  const calendarHeading = view === 'year'
    ? String(anchorDate.getFullYear())
    : view === 'day' ? formatDay(anchorDate) : monthTitle(anchorDate);

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Payment Calendar</Typography>
          <Typography color="text.secondary">Plan upcoming EMIs, chit funds, bills, and other due payments.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => openCreate()} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
          Add reminder
        </Button>
      </Box>

      {pageError && <Alert severity="error" onClose={() => setPageError('')}>{pageError}</Alert>}

      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Previous">
              <IconButton aria-label="Previous period" onClick={() => setAnchorDate((date) => shiftAnchor(date, view, -1))}>
                <ArrowBackIosNewRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="h6" sx={{ fontWeight: 800, minWidth: { xs: 170, sm: 220 }, textAlign: 'center' }}>{calendarHeading}</Typography>
            <Tooltip title="Next">
              <IconButton aria-label="Next period" onClick={() => setAnchorDate((date) => shiftAnchor(date, view, 1))}>
                <ArrowForwardIosRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button size="small" color="inherit" onClick={() => setAnchorDate(new Date())}>Today</Button>
          </Stack>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={(_event, nextView: CalendarView | null) => nextView && setView(nextView)}
            aria-label="Calendar view"
            sx={{ alignSelf: { xs: 'stretch', md: 'auto' }, '& .MuiToggleButton-root': { flex: { xs: 1, md: 'initial' }, textTransform: 'none', fontWeight: 700, px: 1.5 } }}
          >
            <ToggleButton value="day">Day</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="year">Year</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {loading ? (
          <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
        ) : view === 'month' ? (
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 700, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderTop: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0' }}>
              {WEEKDAYS.map((day) => (
                <Box key={day} sx={{ p: 1, textAlign: 'center', bgcolor: '#f8fafc', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>{day}</Typography>
                </Box>
              ))}
              {monthDays.map((date) => {
                const key = toDateKey(date);
                const dayEvents = sortedForDate(date);
                const inMonth = date.getMonth() === anchorDate.getMonth();
                return (
                  <Box
                    key={key}
                    role="button"
                    tabIndex={0}
                    aria-label={`Add reminder on ${formatDay(date)}`}
                    onClick={() => openCreate(key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openCreate(key); }}
                    sx={{ minHeight: { xs: 88, sm: 112 }, p: 0.8, bgcolor: inMonth ? '#fff' : '#fafafa', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', '&:hover': { bgcolor: 'color-mix(in srgb, var(--app-primary) 4%, white)' } }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: key === todayKey ? 900 : 600, color: key === todayKey ? 'primary.main' : inMonth ? 'text.primary' : 'text.disabled', borderRadius: '50%', width: 24, height: 24, display: 'grid', placeItems: 'center', bgcolor: key === todayKey ? 'color-mix(in srgb, var(--app-primary) 12%, white)' : 'transparent' }}>{date.getDate()}</Typography>
                      {dayEvents.length > 0 && <Typography variant="caption" color="text.secondary">{dayEvents.length}</Typography>}
                    </Box>
                    <Stack spacing={0.4}>
                      {dayEvents.slice(0, 2).map((event) => (
                        <Box key={event.id} onClick={(e) => { e.stopPropagation(); openEdit(event); }}>
                          {renderEvent(event, true)}
                        </Box>
                      ))}
                      {dayEvents.length > 2 && <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>+{dayEvents.length - 2} more</Typography>}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ) : view === 'week' ? (
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 900, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', gap: 1 }}>
              {weekDays.map((date) => (
                <Paper key={toDateKey(date)} variant="outlined" sx={{ p: 1, minHeight: 260, borderRadius: 2, bgcolor: toDateKey(date) === todayKey ? 'color-mix(in srgb, var(--app-primary) 4%, white)' : '#fff' }}>
                  <Button fullWidth onClick={() => openCreate(toDateKey(date))} sx={{ textTransform: 'none', justifyContent: 'space-between', color: 'text.primary', px: 0.5, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">{WEEKDAYS[(date.getDay() + 6) % 7]}</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{date.getDate()}</Typography>
                  </Button>
                  <Stack spacing={1}>{sortedForDate(date).map((event) => renderEvent(event))}</Stack>
                </Paper>
              ))}
            </Box>
          </Box>
        ) : view === 'day' ? (
          <Stack spacing={1.5}>
            <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => openCreate(toDateKey(anchorDate))} sx={{ alignSelf: 'flex-start' }}>Add reminder for this day</Button>
            {sortedForDate(anchorDate).length === 0 ? (
              <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2.5 }}>
                <EventAvailableRoundedIcon color="disabled" sx={{ fontSize: 38, mb: 1 }} />
                <Typography color="text.secondary">No reminders for this day.</Typography>
              </Paper>
            ) : sortedForDate(anchorDate).map((event) => renderEvent(event))}
          </Stack>
        ) : (
          <Grid container spacing={1.5}>
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const date = new Date(anchorDate.getFullYear(), monthIndex, 1);
              const monthEvents = events.filter((event) => {
                const eventDate = parseDate(event.dueDate);
                return eventDate.getFullYear() === date.getFullYear() && eventDate.getMonth() === monthIndex;
              });
              const outstanding = monthEvents.filter((event) => !event.isCompleted).length;
              return (
                <Grid key={monthIndex} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Card variant="outlined" onClick={() => { setAnchorDate(date); setView('month'); }} sx={{ height: '100%', borderRadius: 2.5, cursor: 'pointer', '&:hover': { borderColor: 'primary.main', bgcolor: 'color-mix(in srgb, var(--app-primary) 4%, white)' } }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{date.toLocaleDateString('en-IN', { month: 'long' })}</Typography>
                      <Typography variant="caption" color="text.secondary">{monthEvents.length} reminders · {outstanding} upcoming</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, color: 'text.secondary' }}>
          <CheckCircleRoundedIcon fontSize="small" color="success" />
          <Typography variant="caption">Checking a reminder marks it complete; it does not create an expense transaction.</Typography>
        </Stack>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleSave}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800 }}>
            {editingEvent ? 'Edit payment reminder' : 'Add payment reminder'}
            <IconButton onClick={() => setDialogOpen(false)} disabled={saving} aria-label="Close"><CloseRoundedIcon /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.2, pt: '12px !important' }}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            <TextField label="Payment or event" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="e.g. Home EMI, Chit fund" />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="Time (optional)" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField label="Expected amount (optional)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: 'any' } }} />
              <FormControl>
                <InputLabel id="calendar-event-category">Category (optional)</InputLabel>
                <Select labelId="calendar-event-category" label="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {categories.map((item) => <MenuItem key={item.id} value={item.name}>{item.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <TextField label="Notes (optional)" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} placeholder="Add payment reference or other details" />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <Button color="inherit" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
              {saving ? 'Saving…' : editingEvent ? 'Save changes' : 'Add reminder'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
};

export default CalendarPage;
