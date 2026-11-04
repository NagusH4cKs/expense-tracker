import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import { debtService, DebtItem } from '../services/debt.service';

const currency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const today = new Date().toISOString().slice(0, 10);

export const DebtsPage: React.FC = () => {
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<'loan' | 'repayment' | null>(null);
  const [selected, setSelected] = useState<DebtItem | null>(null);
  const [person, setPerson] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => { setLoading(true); try { setDebts(await debtService.list()); } catch (e: any) { setError(e.response?.data?.message || 'Could not load debts'); } finally { setLoading(false); } };
  useEffect(() => { void refresh(); }, []);
  const outstandingTotal = useMemo(() => debts.reduce((sum, d) => sum + d.outstandingAmount, 0), [debts]);

  const openLoan = () => { setPerson(''); setDescription(''); setAmount(''); setDate(today); setError(''); setDialog('loan'); };
  const openRepayment = (debt: DebtItem) => { setSelected(debt); setAmount(String(debt.outstandingAmount)); setDate(today); setError(''); setDialog('repayment'); };
  const save = async () => {
    setSaving(true); setError('');
    try {
      if (dialog === 'loan') await debtService.create({ person, description, amount: Number(amount), lentDate: date });
      else if (selected) await debtService.repay(selected.id, { amount: Number(amount), date });
      setDialog(null); setNotice(dialog === 'loan' ? 'Loan recorded' : 'Repayment recorded'); await refresh();
    } catch (e: any) { setError(e.response?.data?.message || 'Could not save this entry'); }
    finally { setSaving(false); }
  };

  return <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
      <Box><Typography variant="h4" sx={{ fontWeight: 800 }}>Debts</Typography><Typography color="text.secondary">Money you lent and repayments you received. These are excluded from income and expense reports.</Typography></Box>
      <Button variant="contained" onClick={openLoan} startIcon={<AccountBalanceRoundedIcon />}>Record loan</Button>
    </Box>
    <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid #e2e8f0', borderRadius: 3 }}>
      <Typography variant="overline" color="text.secondary">Still owed to you</Typography>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>{currency(outstandingTotal)}</Typography>
    </Paper>
    {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box> : debts.length === 0 ? <Paper sx={{ p: 5, textAlign: 'center' }}><Typography color="text.secondary">No loans recorded yet.</Typography></Paper> :
      <Stack spacing={2}>{debts.map((debt) => <Paper key={debt.id} elevation={0} sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box><Typography variant="h6" sx={{ fontWeight: 700 }}>{debt.person}</Typography>{debt.description && <Typography color="text.secondary">{debt.description}</Typography>}<Typography variant="caption" color="text.secondary">Lent {debt.lentDate}</Typography></Box>
          <Chip label={debt.isPaid ? 'Paid' : 'Outstanding'} color={debt.isPaid ? 'success' : 'warning'} variant="outlined" />
        </Box>
        <Box sx={{ display: 'flex', gap: { xs: 2, sm: 5 }, flexWrap: 'wrap', my: 2 }}>
          <Box><Typography variant="caption" color="text.secondary">Lent</Typography><Typography sx={{ fontWeight: 700 }}>{currency(debt.amount)}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Repaid</Typography><Typography sx={{ fontWeight: 700 }}>{currency(debt.repaidAmount)}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Remaining</Typography><Typography sx={{ fontWeight: 800, color: debt.isPaid ? 'success.main' : 'primary.main' }}>{currency(debt.outstandingAmount)}</Typography></Box>
        </Box>
        {debt.repayments.length > 0 && <Typography variant="caption" color="text.secondary">Repayments: {debt.repayments.map(r => `${r.date} ${currency(r.amount)}`).join(' · ')}</Typography>}
        {!debt.isPaid && <Box sx={{ mt: 2 }}><Button size="small" variant="outlined" onClick={() => openRepayment(debt)}>Record repayment</Button></Box>}
      </Paper>)}</Stack>}
    <Dialog open={Boolean(dialog)} onClose={() => !saving && setDialog(null)} fullWidth maxWidth="xs"><DialogTitle>{dialog === 'loan' ? 'Record money lent' : 'Record repayment'}</DialogTitle><DialogContent>
      <Stack spacing={2} sx={{ pt: 1 }}>
        {dialog === 'loan' && <><TextField label="Person" value={person} onChange={e => setPerson(e.target.value)} autoFocus /><TextField label="Note (optional)" value={description} onChange={e => setDescription(e.target.value)} /></>}
        {dialog === 'repayment' && <Typography color="text.secondary">{selected?.person} owes {currency(selected?.outstandingAmount || 0)}.</Typography>}
        <TextField label="Amount (INR)" type="number" value={amount} onChange={e => setAmount(e.target.value)} slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }} />
        <TextField label={dialog === 'loan' ? 'Date lent' : 'Repayment date'} type="date" value={date} onChange={e => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </DialogContent><DialogActions><Button onClick={() => setDialog(null)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></DialogActions></Dialog>
    <Snackbar open={Boolean(notice)} autoHideDuration={3000} onClose={() => setNotice('')}><Alert severity="success">{notice}</Alert></Snackbar>
  </Box>;
};
