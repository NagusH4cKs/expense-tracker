import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { ruleService, normalizeText } from './rule.service.js';

/**
 * Parse CSV or Excel buffer or text into 2D matrix of string cells
 */
export const parseToMatrix = (bufferOrString) => {
  try {
    if (!bufferOrString) return [];

    let workbook;
    if (typeof bufferOrString === 'string') {
      if (!bufferOrString.trim()) return [];
      workbook = XLSX.read(bufferOrString, { type: 'string', raw: true });
    } else if (Buffer.isBuffer(bufferOrString)) {
      if (bufferOrString.length === 0) return [];
      workbook = XLSX.read(bufferOrString, { type: 'buffer', raw: true });
    } else {
      workbook = XLSX.read(bufferOrString, { raw: true });
    }

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      return [];
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) return [];

    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    return data.filter((row) => Array.isArray(row) && row.some((c) => String(c || '').trim() !== ''));
  } catch (err) {
    console.error('[parseToMatrix error]:', err);
    return [];
  }
};

/**
 * Detect header row and column indices from statement matrix
 */
export const detectColumns = (matrix) => {
  let headerRowIndex = -1;
  let maxScore = -1;
  let bestColumns = {
    dateIdx: -1,
    remarksIdx: -1,
    withdrawalIdx: -1,
    depositIdx: -1,
    amountIdx: -1,
    typeIdx: -1,
    balanceIdx: -1,
    chequeIdx: -1,
    sNoIdx: -1,
  };
  let accountName = 'ICICI Bank';

  // Scan up to 40 rows for metadata and headers
  for (let r = 0; r < Math.min(matrix.length, 40); r++) {
    const row = matrix[r].map((cell) => String(cell || '').trim());
    const rowStr = row.join(' ').toLowerCase();

    // Check account number or bank name in metadata rows
    if (rowStr.includes('account number') || rowStr.includes('account:')) {
      const val = row.find((c) => c && !c.toLowerCase().includes('account number') && !c.toLowerCase().includes('account:'));
      if (val) accountName = val;
    }
    if (rowStr.includes('state bank of india') || rowStr.includes('sbi')) {
      accountName = 'SBI';
    } else if (rowStr.includes('icici bank') || rowStr.includes('icici')) {
      accountName = 'ICICI';
    } else if (rowStr.includes('hdfc bank') || rowStr.includes('hdfc')) {
      accountName = 'HDFC';
    }

    const cols = {
      dateIdx: -1,
      remarksIdx: -1,
      withdrawalIdx: -1,
      depositIdx: -1,
      amountIdx: -1,
      typeIdx: -1,
      balanceIdx: -1,
      chequeIdx: -1,
      sNoIdx: -1,
    };

    let score = 0;
    row.forEach((col, idx) => {
      const c = col.toLowerCase().replace(/[\r\n\t]/g, ' ').trim();
      if (!c) return;

      // Date matching
      if (c === 'transaction date' || c === 'txn date' || c === 'trans date') {
        cols.dateIdx = idx;
        score += 4;
      } else if ((c === 'date' || c === 'value date' || c === 'posting date' || c.endsWith(' date')) && cols.dateIdx === -1) {
        cols.dateIdx = idx;
        score += 3;
      }

      // Remarks matching
      if (c.includes('remarks') || c.includes('description') || c.includes('particulars') || c.includes('narration')) {
        cols.remarksIdx = idx;
        score += 4;
      } else if ((c.includes('detail') || c === 'payee' || c === 'merchant') && cols.remarksIdx === -1) {
        cols.remarksIdx = idx;
        score += 2;
      }

      // Withdrawal / Debit
      if (c.includes('withdrawal') || c.includes('debit') || /\bdr\b/.test(c)) {
        cols.withdrawalIdx = idx;
        score += 3;
      }

      // Deposit / Credit
      if (c.includes('deposit') || c.includes('credit') || /\bcr\b/.test(c)) {
        cols.depositIdx = idx;
        score += 3;
      }

      // Single Amount column
      if ((c === 'amount' || c === 'amt' || c.startsWith('amount(') || c.startsWith('amount (')) && !c.includes('withdrawal') && !c.includes('deposit')) {
        cols.amountIdx = idx;
        score += 2;
      }

      // Type column
      if (c === 'type' || c === 'dr/cr' || c === 'cr/dr' || c === 'txn type') {
        cols.typeIdx = idx;
        score += 2;
      }

      // Balance
      if (c.includes('balance') || /\bbal\b/.test(c)) {
        cols.balanceIdx = idx;
        score += 2;
      }

      // Cheque / Ref
      if (c.includes('cheque') || c.includes('check') || c.includes('ref') || c.includes('utr')) {
        cols.chequeIdx = idx;
        score += 1;
      }

      // S No
      if (c === 's no.' || c === 's no' || c === 'sl no' || c === 's.no.' || c === 'sr no' || c === 'sl.no') {
        cols.sNoIdx = idx;
        score += 1;
      }
    });

    if (score > maxScore && (cols.dateIdx !== -1 || cols.remarksIdx !== -1)) {
      maxScore = score;
      headerRowIndex = r;
      bestColumns = cols;
    }
  }

  // Fallback if not detected
  if (headerRowIndex === -1 && matrix.length > 0) {
    headerRowIndex = 0;
    const row = matrix[0].map((cell) => String(cell || '').trim());
    row.forEach((col, idx) => {
      const c = col.toLowerCase();
      if (c.includes('date') && bestColumns.dateIdx === -1) bestColumns.dateIdx = idx;
      else if ((c.includes('remark') || c.includes('desc') || c.includes('particular')) && bestColumns.remarksIdx === -1) bestColumns.remarksIdx = idx;
      else if ((c.includes('with') || c.includes('deb') || /\bdr\b/.test(c)) && bestColumns.withdrawalIdx === -1) bestColumns.withdrawalIdx = idx;
      else if ((c.includes('dep') || c.includes('cred') || /\bcr\b/.test(c)) && bestColumns.depositIdx === -1) bestColumns.depositIdx = idx;
      else if (c.includes('bal') && bestColumns.balanceIdx === -1) bestColumns.balanceIdx = idx;
    });
  }

  return { headerRowIndex, detectedColumns: bestColumns, accountName };
};

/**
 * Extract clean transaction identifier / reference
 */
export const generateReference = (date, remarks, amount, type, rawRef = '') => {
  if (rawRef && rawRef.trim()) {
    return rawRef.trim();
  }
  // Check if remarks contains UPI / UTR transaction ID (12 digits or alphanumeric string)
  const upiMatch = remarks.match(/([A-Z0-9]{20,40}|\b\d{12}\b)/);
  if (upiMatch) {
    return upiMatch[0];
  }
  // Deterministic hash of (date + remarks + amount + type)
  return crypto
    .createHash('sha256')
    .update(`${date}_${normalizeText(remarks)}_${amount}_${type}`)
    .digest('hex')
    .slice(0, 32);
};

/**
 * Bank-specific parsing of narration for clean payee & details
 */
export const extractDetails = (remarks, bank = 'ICICI') => {
  let cleanDesc = remarks;
  let detectedKeyword = '';

  const trimmed = remarks.trim();

  // Bank Specific: UPI Format (ICICI, Axis, HDFC)
  if (trimmed.startsWith('UPI/')) {
    const parts = trimmed.split('/');
    const merchant = parts[1] || '';
    const purpose = parts[3] || '';
    cleanDesc = merchant ? `${merchant}${purpose ? ' - ' + purpose : ''}` : remarks;
    detectedKeyword = purpose.toLowerCase().trim();
  } else if (trimmed.startsWith('ACH/') || trimmed.startsWith('CMS/')) {
    const parts = trimmed.split('/');
    cleanDesc = parts[1] || remarks;
    detectedKeyword = 'dividend';
  } else if (/^TRANSFER-UPI\//i.test(trimmed)) {
    // SBI UPI narration format
    const parts = trimmed.split('/');
    const merchant = parts[1] || parts[2] || '';
    cleanDesc = merchant ? `UPI: ${merchant}` : remarks;
  } else if (/^NEFT-/i.test(trimmed) || /^RTGS-/i.test(trimmed)) {
    const parts = trimmed.split('-');
    cleanDesc = parts[1] || remarks;
  }

  return { cleanDesc, detectedKeyword };
};

/**
 * Preview statement: Parsing, Rule Categorization, Confirmed vs Possible Duplicate Detection, and Transfer Linking
 */
export const preview = async (bufferOrString) => {
  const matrix = parseToMatrix(bufferOrString);
  if (!matrix || matrix.length === 0) {
    throw new Error('File is empty or could not be parsed');
  }

  const { headerRowIndex, detectedColumns, accountName } = detectColumns(matrix);
  const dataRows = matrix.slice(headerRowIndex + 1);

  const parsedTransactions = [];
  const referencesToCheck = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const rawDate = detectedColumns.dateIdx >= 0 ? String(row[detectedColumns.dateIdx] ?? '').trim() : '';
    const rawRemarks = detectedColumns.remarksIdx >= 0 ? String(row[detectedColumns.remarksIdx] ?? '').trim() : '';
    const rawWithdrawal = detectedColumns.withdrawalIdx >= 0 ? String(row[detectedColumns.withdrawalIdx] ?? '').trim() : '';
    const rawDeposit = detectedColumns.depositIdx >= 0 ? String(row[detectedColumns.depositIdx] ?? '').trim() : '';
    const rawAmount = detectedColumns.amountIdx >= 0 ? String(row[detectedColumns.amountIdx] ?? '').trim() : '';
    const rawType = detectedColumns.typeIdx >= 0 ? String(row[detectedColumns.typeIdx] ?? '').trim().toLowerCase() : '';
    const rawBalance = detectedColumns.balanceIdx >= 0 ? String(row[detectedColumns.balanceIdx] ?? '').trim() : '';
    const rawCheque = detectedColumns.chequeIdx >= 0 ? String(row[detectedColumns.chequeIdx] ?? '').trim() : '';

    if (!rawRemarks && !rawWithdrawal && !rawDeposit && !rawAmount) continue;
    const lowerRemarks = rawRemarks.toLowerCase();
    if (lowerRemarks.includes('legends used') || lowerRemarks.includes('cheque number from') || lowerRemarks.includes('total:')) continue;

    let withdrawal = parseFloat(rawWithdrawal.replace(/[^0-9.-]/g, '')) || 0;
    let deposit = parseFloat(rawDeposit.replace(/[^0-9.-]/g, '')) || 0;
    let amount = 0;
    let type = 'expense';

    if (withdrawal > 0 || deposit > 0) {
      if (withdrawal > 0) {
        amount = withdrawal;
        type = 'expense';
      } else {
        amount = deposit;
        type = 'income';
      }
    } else if (rawAmount) {
      const parsedAmt = parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0;
      if (rawType.includes('cr') || rawType.includes('credit') || rawType.includes('income')) {
        type = 'income';
        amount = Math.abs(parsedAmt);
      } else if (rawType.includes('dr') || rawType.includes('debit') || rawType.includes('expense')) {
        type = 'expense';
        amount = Math.abs(parsedAmt);
      } else if (parsedAmt < 0) {
        type = 'expense';
        amount = Math.abs(parsedAmt);
      } else {
        amount = parsedAmt;
        type = 'expense';
      }
    }

    if (amount === 0) continue;

    // Date normalization
    let formattedDate = '';
    if (/^\d{5}(\.\d+)?$/.test(rawDate)) {
      const serial = parseFloat(rawDate);
      const excelDate = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!isNaN(excelDate.getTime())) {
        formattedDate = excelDate.toISOString().slice(0, 10);
      }
    }
    if (!formattedDate) {
      const dateMatch = rawDate.match(/^(\d{1,2})[\/,\-\.\s]+(\d{1,2})[\/,\-\.\s]+(\d{2,4})/);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
        formattedDate = `${year}-${month}-${day}`;
      }
    }
    if (!formattedDate && /^\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2}/.test(rawDate)) {
      formattedDate = rawDate.replace(/\//g, '-').slice(0, 10);
    }
    if (!formattedDate && rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        formattedDate = parsed.toISOString().slice(0, 10);
      }
    }
    if (!formattedDate) {
      formattedDate = new Date().toISOString().slice(0, 10);
    }

    const { cleanDesc, detectedKeyword } = extractDetails(rawRemarks, accountName);
    const reference = generateReference(formattedDate, rawRemarks, amount, type, rawCheque);
    referencesToCheck.push(reference);

    const cleanBalance = parseFloat(rawBalance.replace(/[^0-9.-]/g, '')) || null;

    parsedTransactions.push({
      tempId: `tmp_${i}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: formattedDate,
      rawRemarks,
      description: cleanDesc,
      detectedKeyword,
      amount,
      type,
      account: accountName || 'ICICI',
      balance: cleanBalance,
      reference,
      selected: true,
    });
  }

  // Load existing records from DB to check for Confirmed & Possible Duplicates
  const existingByRef = await prisma.transaction.findMany({
    where: {
      reference: { in: referencesToCheck },
    },
    select: { id: true, reference: true, date: true, amount: true, type: true, account: true, description: true },
  });
  const existingRefSet = new Set(existingByRef.map((t) => t.reference));

  // Check matching dates for possible duplicates (same account, date, amount, type)
  const allDatesInFile = Array.from(new Set(parsedTransactions.map((t) => t.date)));
  const existingSameDate = await prisma.transaction.findMany({
    where: {
      date: { in: allDatesInFile },
    },
    select: { id: true, reference: true, date: true, amount: true, type: true, account: true, description: true },
  });

  // Fetch active categorization rules & categories
  const [rules, dbCategories] = await Promise.all([
    prisma.categorizationRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.category.findMany({
      include: { groups: true },
    }),
  ]);

  const seenInFileRef = new Set();
  const seenInFileTuple = new Map(); // key -> tempId

  // Categorize and Run Duplicate Detection
  const categorizedTransactions = [];

  for (const t of parsedTransactions) {
    const tupleKey = `${t.account}_${t.date}_${t.amount}_${t.type}`;

    // 1. Confirmed Duplicate:
    // Case A: Reference exists in DB or earlier in current file
    const isDbRefMatch = existingRefSet.has(t.reference);
    const isFileRefMatch = seenInFileRef.has(t.reference);

    // Case B: Exact match on (account, date, amount, type, description)
    const isDbExactMatch = existingSameDate.some(
      (e) => e.account === t.account && e.date === t.date && Math.abs(e.amount - t.amount) < 0.01 && e.type === t.type && normalizeText(e.description) === normalizeText(t.description)
    );
    const isFileExactMatch = seenInFileTuple.has(tupleKey) && normalizeText(seenInFileTuple.get(tupleKey).description) === normalizeText(t.description);

    let duplicateStatus = 'none';
    let duplicateReason = '';

    if (isDbRefMatch || isFileRefMatch) {
      duplicateStatus = 'confirmed';
      duplicateReason = isDbRefMatch ? 'Matches existing bank reference in database' : 'Duplicate transaction reference in file';
    } else if (isDbExactMatch || isFileExactMatch) {
      duplicateStatus = 'confirmed';
      duplicateReason = 'Identical account, date, amount, and description';
    } else {
      // 2. Possible Duplicate requiring review (Section 5.5):
      // Same account, date, amount, type but different reference or slight variation in description
      const possibleDbMatch = existingSameDate.find(
        (e) => e.account === t.account && e.date === t.date && Math.abs(e.amount - t.amount) < 0.01 && e.type === t.type
      );
      if (possibleDbMatch) {
        duplicateStatus = 'possible';
        duplicateReason = `Matches transaction on ${t.date} for ₹${t.amount} (${possibleDbMatch.description})`;
      } else if (seenInFileTuple.has(tupleKey)) {
        duplicateStatus = 'possible';
        duplicateReason = `Duplicate amount ₹${t.amount} on ${t.date} found earlier in file`;
      }
    }

    seenInFileRef.add(t.reference);
    if (!seenInFileTuple.has(tupleKey)) {
      seenInFileTuple.set(tupleKey, t);
    }

    // 3. Rule-based Categorization (Section 5.4)
    const catMatch = ruleService.matchTransactionWithRules(
      { rawRemarks: t.rawRemarks, description: t.description, account: t.account },
      rules,
      dbCategories
    );

    // 4. Transfer Detection (Section 5.6):
    // Check if category is Transfer or remarks indicate self transfer
    const lowerComb = `${t.rawRemarks} ${t.description}`.toLowerCase();
    const isTransferDetected = catMatch.isTransfer ||
      lowerComb.includes('self transfer') ||
      lowerComb.includes('own account') ||
      lowerComb.includes('to sbi') ||
      lowerComb.includes('from sbi') ||
      lowerComb.includes('to icici') ||
      lowerComb.includes('from icici');

    categorizedTransactions.push({
      ...t,
      category: isTransferDetected ? 'Transfer' : catMatch.category,
      group: catMatch.group || (isTransferDetected ? 'Internal Transfer' : null),
      confidence: isTransferDetected ? 'high' : catMatch.confidence,
      matchedRuleId: catMatch.matchedRuleId,
      needsReview: isTransferDetected ? false : catMatch.needsReview,
      isTransfer: isTransferDetected,
      transferStatus: isTransferDetected ? 'one_sided' : null,
      excludeFromReport: isTransferDetected, // Exclude internal transfer by default from spending reports
      duplicateStatus,
      duplicateReason,
      isDuplicate: duplicateStatus === 'confirmed',
      selected: duplicateStatus !== 'confirmed', // Confirmed duplicates deselected by default
    });
  }

  // 5. Link debit and credit sides of transfers (Section 5.6)
  // For transfers in the file: match debit (expense) and credit (income) with identical amount on same date
  const transferItems = categorizedTransactions.filter((t) => t.isTransfer);
  for (let i = 0; i < transferItems.length; i++) {
    const itemA = transferItems[i];
    if (itemA.transferStatus === 'linked') continue;

    const matchB = transferItems.find(
      (b, idx) => idx !== i &&
        b.transferStatus !== 'linked' &&
        Math.abs(b.amount - itemA.amount) < 0.01 &&
        b.type !== itemA.type &&
        b.date === itemA.date
    );

    if (matchB) {
      itemA.transferStatus = 'linked';
      itemA.transferLinkedId = matchB.tempId;
      itemA.excludeFromReport = true;

      matchB.transferStatus = 'linked';
      matchB.transferLinkedId = itemA.tempId;
      matchB.excludeFromReport = true;
    }
  }

  const confirmedDuplicatesCount = categorizedTransactions.filter((t) => t.duplicateStatus === 'confirmed').length;
  const possibleDuplicatesCount = categorizedTransactions.filter((t) => t.duplicateStatus === 'possible').length;
  const needsReviewCount = categorizedTransactions.filter((t) => t.needsReview).length;
  const transfersCount = categorizedTransactions.filter((t) => t.isTransfer).length;

  return {
    accountName,
    totalRows: categorizedTransactions.length,
    newItemsCount: categorizedTransactions.length - confirmedDuplicatesCount,
    duplicatesCount: confirmedDuplicatesCount,
    possibleDuplicatesCount,
    needsReviewCount,
    transfersCount,
    detectedColumns,
    headerRowIndex,
    transactions: categorizedTransactions,
  };
};

/**
 * Confirm and save transactions with transfer handling, rule auto-learning, and duplicate skipping
 */
export const confirmImport = async (transactions, autoCreateGroups = true) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new Error('No transactions provided for import');
  }

  // Only import non-duplicate (or user-approved) and selected items
  const validItems = transactions.filter((t) => t.selected && t.duplicateStatus !== 'confirmed');

  if (validItems.length === 0) {
    return { success: true, count: 0, message: 'All transactions were duplicates or unselected' };
  }

  // 1. Auto-create missing categories and groups if enabled
  if (autoCreateGroups) {
    const distinctPairs = new Map();
    for (const item of validItems) {
      if (item.category && item.category !== 'Needs review') {
        const cat = item.category.trim();
        const grp = item.group ? item.group.trim() : null;
        if (!distinctPairs.has(cat)) {
          distinctPairs.set(cat, new Set());
        }
        if (grp) {
          distinctPairs.get(cat).add(grp);
        }
      }
    }

    for (const [catName, groupsSet] of distinctPairs.entries()) {
      let cat = await prisma.category.findUnique({
        where: { name: catName },
        include: { groups: true },
      });

      if (!cat) {
        cat = await prisma.category.create({
          data: {
            name: catName,
            type: 'expense',
            description: 'Created during statement import',
          },
          include: { groups: true },
        });
      }

      if (groupsSet.size > 0 && cat) {
        const existingGroupNames = new Set(cat.groups.map((g) => g.name.toLowerCase()));
        const newGroupsToCreate = Array.from(groupsSet).filter(
          (g) => !existingGroupNames.has(g.toLowerCase())
        );

        if (newGroupsToCreate.length > 0) {
          await prisma.group.createMany({
            data: newGroupsToCreate.map((g) => ({
              name: g,
              categoryId: cat.id,
              description: 'Auto-categorized from narration',
            })),
          });
        }
      }
    }
  }

  // 2. High-speed insert with duplicate skipping
  const recordsToInsert = validItems.map((item) => ({
    date: item.date,
    description: item.description,
    remarks: item.rawRemarks || item.description,
    category: item.category || 'Needs review',
    group: item.group || null,
    amount: Number(item.amount),
    type: item.type,
    account: item.account || 'ICICI',
    reference: item.reference,
    balance: item.balance || null,
    needsReview: Boolean(item.needsReview),
    confidence: item.confidence || 'rule',
    matchedRuleId: item.matchedRuleId || null,
    isTransfer: Boolean(item.isTransfer),
    transferStatus: item.transferStatus || null,
    excludeFromReport: Boolean(item.excludeFromReport),
  }));

  const result = await prisma.transaction.createMany({
    data: recordsToInsert,
    skipDuplicates: true,
  });

  return {
    success: true,
    importedCount: result.count,
    totalReceived: validItems.length,
  };
};

export const importService = {
  parseToMatrix,
  detectColumns,
  generateReference,
  extractDetails,
  preview,
  confirmImport,
};
