import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';

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

    // Check account number in metadata rows
    if (rowStr.includes('account number')) {
      const val = row.find((c) => c && !c.toLowerCase().includes('account number'));
      if (val) accountName = val;
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
 * Extract clean transaction identifier / reference to prevent duplicates
 */
export const generateReference = (date, remarks, amount, type, rowIdx) => {
  // Check if remarks contains UPI transaction ID (e.g. ICI47c11fb418b844aaba81bc4f6ca701c5 or ref digits)
  const upiMatch = remarks.match(/([A-Z0-9]{20,40}|\b\d{12}\b)/);
  if (upiMatch) {
    return upiMatch[0];
  }
  // Fallback to deterministic hash of (date + remarks + amount + type)
  return crypto
    .createHash('sha256')
    .update(`${date}_${remarks.trim().toLowerCase()}_${amount}_${type}`)
    .digest('hex')
    .slice(0, 32);
};

/**
 * Extract clean merchant/payee and group keyword from UPI/ACH narration
 */
export const extractDetails = (remarks) => {
  let cleanDesc = remarks;
  let detectedKeyword = '';

  if (remarks.startsWith('UPI/')) {
    const parts = remarks.split('/');
    // parts[1] is usually merchant/receiver (e.g. GEETHAPALA, MUTHUSAMY, Basappa)
    // parts[3] is user remarks / purpose (e.g. haircut, home seeds, snacks pan, tea, coffee, grocery)
    const merchant = parts[1] || '';
    const purpose = parts[3] || '';

    cleanDesc = merchant ? `${merchant} - ${purpose || 'UPI Payment'}` : remarks;
    detectedKeyword = purpose.toLowerCase().trim();
  } else if (remarks.startsWith('ACH/') || remarks.startsWith('CMS/')) {
    const parts = remarks.split('/');
    cleanDesc = parts[1] || remarks;
    detectedKeyword = 'dividend';
  }

  return { cleanDesc, detectedKeyword };
};

/**
 * Categorize transaction automatically based on database categories & groups and built-in rules
 */
export const matchCategoryAndGroup = async (remarks, detectedKeyword, type, dbCategories = []) => {
  const searchTarget = `${remarks} ${detectedKeyword}`.toLowerCase();

  // 1. Check exact or partial match with DB groups first
  for (const cat of dbCategories) {
    for (const grp of cat.groups) {
      const grpName = grp.name.toLowerCase();
      if (searchTarget.includes(grpName)) {
        return {
          category: cat.name,
          group: grp.name,
          isNewGroup: false,
          confidence: 'high',
        };
      }
    }
  }

  // 2. Check category name match
  for (const cat of dbCategories) {
    const catName = cat.name.toLowerCase();
    if (searchTarget.includes(catName)) {
      return {
        category: cat.name,
        group: detectedKeyword || null,
        isNewGroup: Boolean(detectedKeyword),
        confidence: 'medium',
      };
    }
  }

  // 3. Intelligent Banking Keyword Heuristics
  const rules = [
    { keywords: ['tea', 'chai', 'coffee', 'puff', 'puffs', 'snack', 'snacks', 'samosa', 'chaat', 'bakery', 'juice', 'ice'], category: 'Snacks', group: detectedKeyword || 'Snacks' },
    { keywords: ['grocery', 'vegetables', 'fruits', 'dairy', 'milk', 'eggs', 'zepto', 'blinkit', 'instamart', 'swiggy instamart'], category: 'Grocery', group: detectedKeyword || 'Provisions' },
    { keywords: ['haircut', 'salon', 'barber', 'shave', 'spa'], category: 'Personal Care', group: 'Haircut' },
    { keywords: ['bmtc', 'metro', 'train', 'irctc', 'transport', 'statetransport', 'travel', 'bus', 'fuel', 'cab', 'auto', 'ola', 'uber'], category: 'Travel', group: detectedKeyword || 'Commute' },
    { keywords: ['dinner', 'lunch', 'restaurant', 'hotel', 'swiggy', 'zomato', 'food', 'biryani'], category: 'Food & Dining', group: detectedKeyword || 'Meals' },
    { keywords: ['water', 'watercan', 'water can'], category: 'Home', group: 'Water' },
    { keywords: ['home seeds', 'plants', 'seeds'], category: 'Home', group: 'Home Garden' },
    { keywords: ['chicken', 'mutton', 'meat', 'fish'], category: 'Grocery', group: 'Meat & Poultry' },
    { keywords: ['dividend', 'ach/', 'cms/', 'zerodha', 'upstox', 'groww', 'mutual fund', 'share', 'securities'], category: 'Investment', group: type === 'income' ? 'Dividend' : 'Investment' },
    { keywords: ['salary', 'payroll', 'wages'], category: 'Salary', group: 'Salary' },
    { keywords: ['refund', 'rfnd'], category: 'Refund', group: 'Refund' },
    { keywords: ['self', 'transfer', 'ragu debt', 'friend'], category: 'Transfer', group: detectedKeyword || 'Transfer' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((k) => searchTarget.includes(k))) {
      // Check if category exists in DB, otherwise find matching type
      const matchedDbCat = dbCategories.find(
        (c) => c.name.toLowerCase() === rule.category.toLowerCase()
      );
      return {
        category: matchedDbCat ? matchedDbCat.name : rule.category,
        group: rule.group,
        isNewGroup: !dbCategories.some((c) =>
          c.groups.some((g) => g.name.toLowerCase() === rule.group?.toLowerCase())
        ),
        confidence: 'rule',
      };
    }
  }

  // Default fallback
  const fallbackCategory = type === 'income' ? 'Income' : 'Other';
  return {
    category: fallbackCategory,
    group: detectedKeyword || null,
    isNewGroup: Boolean(detectedKeyword),
    confidence: 'low',
  };
};

/**
 * Process and preview statement with automatic mapping, categorization, and duplicate checking
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

    // Extract raw cells
    const rawDate = detectedColumns.dateIdx >= 0 ? String(row[detectedColumns.dateIdx] ?? '').trim() : '';
    const rawRemarks = detectedColumns.remarksIdx >= 0 ? String(row[detectedColumns.remarksIdx] ?? '').trim() : '';
    const rawWithdrawal = detectedColumns.withdrawalIdx >= 0 ? String(row[detectedColumns.withdrawalIdx] ?? '').trim() : '';
    const rawDeposit = detectedColumns.depositIdx >= 0 ? String(row[detectedColumns.depositIdx] ?? '').trim() : '';
    const rawAmount = detectedColumns.amountIdx >= 0 ? String(row[detectedColumns.amountIdx] ?? '').trim() : '';
    const rawType = detectedColumns.typeIdx >= 0 ? String(row[detectedColumns.typeIdx] ?? '').trim().toLowerCase() : '';
    const rawBalance = detectedColumns.balanceIdx >= 0 ? String(row[detectedColumns.balanceIdx] ?? '').trim() : '';

    // Skip legends, headers or summary/footer rows
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

    // Must have some amount
    if (amount === 0) continue;

    // Robust Date parsing
    let formattedDate = '';
    // 1. Check Excel serial date number
    if (/^\d{5}(\.\d+)?$/.test(rawDate)) {
      const serial = parseFloat(rawDate);
      const excelDate = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!isNaN(excelDate.getTime())) {
        formattedDate = excelDate.toISOString().slice(0, 10);
      }
    }
    // 2. Standard DD/MM/YYYY, DD,MM,YYYY, DD-MM-YYYY
    if (!formattedDate) {
      const dateMatch = rawDate.match(/^(\d{1,2})[\/,\-\.\s]+(\d{1,2})[\/,\-\.\s]+(\d{2,4})/);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
        formattedDate = `${year}-${month}-${day}`;
      }
    }
    // 3. YYYY-MM-DD
    if (!formattedDate && /^\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2}/.test(rawDate)) {
      formattedDate = rawDate.replace(/\//g, '-').slice(0, 10);
    }
    // 4. Textual Date
    if (!formattedDate && rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        formattedDate = parsed.toISOString().slice(0, 10);
      }
    }
    // 5. Fallback
    if (!formattedDate) {
      formattedDate = new Date().toISOString().slice(0, 10);
    }

    const { cleanDesc, detectedKeyword } = extractDetails(rawRemarks);
    const reference = generateReference(formattedDate, rawRemarks, amount, type, i);

    referencesToCheck.push(reference);

    const cleanBalance = parseFloat(rawBalance.replace(/[^0-9.-]/g, '')) || null;

    parsedTransactions.push({
      tempId: `tmp_${i}_${Date.now()}`,
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

  // Duplicate detection in Database
  const existingTxns = await prisma.transaction.findMany({
    where: {
      reference: { in: referencesToCheck },
    },
    select: { reference: true, date: true, description: true },
  });

  const existingRefSet = new Set(existingTxns.map((t) => t.reference));
  const seenInFile = new Set();

  // Fetch DB categories once for rapid matching
  const dbCategories = await prisma.category.findMany({
    include: { groups: true },
  });

  // Categorize each and mark duplicates
  const finalTransactions = [];
  for (const t of parsedTransactions) {
    const isDbDuplicate = existingRefSet.has(t.reference);
    const isFileDuplicate = seenInFile.has(t.reference);
    const isDuplicate = isDbDuplicate || isFileDuplicate;

    seenInFile.add(t.reference);

    const catInfo = await matchCategoryAndGroup(t.rawRemarks, t.detectedKeyword, t.type, dbCategories);

    finalTransactions.push({
      ...t,
      category: catInfo.category,
      group: catInfo.group,
      isNewGroup: catInfo.isNewGroup,
      confidence: catInfo.confidence,
      isDuplicate,
    });
  }

  const duplicatesCount = finalTransactions.filter((t) => t.isDuplicate).length;
  const newItemsCount = finalTransactions.length - duplicatesCount;

  return {
    accountName,
    totalRows: finalTransactions.length,
    newItemsCount,
    duplicatesCount,
    detectedColumns,
    headerRowIndex,
    transactions: finalTransactions,
  };
};

/**
 * Confirm and save non-duplicate transactions into database (Batch Optimized)
 */
export const confirmImport = async (transactions, autoCreateGroups = true) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new Error('No transactions provided for import');
  }

  // Only import non-duplicate and selected items
  const validItems = transactions.filter((t) => t.selected && !t.isDuplicate);

  if (validItems.length === 0) {
    return { success: true, count: 0, message: 'All transactions were duplicates or unselected' };
  }

  // 1. If autoCreateGroups is true, batch-sync distinct categories and groups
  if (autoCreateGroups) {
    const distinctPairs = new Map();
    for (const item of validItems) {
      if (item.category) {
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
            description: 'Auto-created during statement import',
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
              description: 'Auto-categorized from bank narration',
            })),
          });
        }
      }
    }
  }

  // 2. High-speed batch insert into transactions table with duplicate skipping
  const recordsToInsert = validItems.map((item) => ({
    date: item.date,
    description: item.description,
    remarks: item.rawRemarks || item.description,
    category: item.category || 'Other',
    group: item.group || null,
    amount: Number(item.amount),
    type: item.type,
    account: item.account || 'ICICI',
    reference: item.reference,
    balance: item.balance || null,
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
  matchCategoryAndGroup,
  preview,
  confirmImport,
};
