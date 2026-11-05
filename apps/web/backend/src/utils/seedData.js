import { prisma } from '../config/prisma.js';

export const INITIAL_CATEGORIES = [
  { name: 'Food', type: 'expense', description: 'Meals and restaurants' },
  { name: 'Snacks', type: 'expense', description: 'Tea, coffee, quick bites, juice' },
  { name: 'Groceries', type: 'expense', description: 'Household provisions, fruits, vegetables' },
  { name: 'Shopping', type: 'expense', description: 'Apparel, electronics, personal shopping' },
  { name: 'Travel', type: 'expense', description: 'Flights, train, hotels, vacation' },
  { name: 'Transport', type: 'expense', description: 'Bus, metro, cab, auto' },
  { name: 'Petrol', type: 'expense', description: 'Vehicle fuel and gas' },
  { name: 'Bills', type: 'expense', description: 'Mobile, broadband, credit cards' },
  { name: 'Utilities', type: 'expense', description: 'Electricity, water bill, gas cylinder, internet & broadband' },
  { name: 'Monthly', type: 'expense', description: 'Monthly expenses: haircut, water can, personal essentials' },
  { name: 'Rent', type: 'expense', description: 'Room rent, house rent, flat rent & maintenance' },
  { name: 'Home', type: 'expense', description: 'Home improvements, supplies, repairs' },
  { name: 'Entertainment', type: 'expense', description: 'Movies, streaming, outings' },
  { name: 'Health', type: 'expense', description: 'Doctor visits, medicines, gym' },
  { name: 'Investment', type: 'expense', description: 'Stocks, mutual funds, trading' },
  { name: 'Salary', type: 'income', description: 'Monthly salary credits' },
  { name: 'Dividend', type: 'income', description: 'Stock & mutual fund dividend payouts' },
  { name: 'Refund', type: 'income', description: 'Refunds and cashbacks' },
  { name: 'Friends', type: 'expense', description: 'Shared expenses, friends & family' },
  { name: 'Shared Expense', type: 'expense', description: 'Expenses shared with other people' },
  { name: 'Transfer', type: 'transfer', description: 'Internal transfers between own bank accounts' },
  { name: 'Laptop', type: 'expense', description: 'Laptop, peripherals, hardware' },
  { name: 'Stationery', type: 'expense', description: 'Books, pens, stationery supplies' },
  { name: 'Debt', type: 'expense', description: 'Debt repayments, loans, EMI, credit card bill payments' },
  { name: 'Others', type: 'expense', description: 'Miscellaneous expenses' },
];

export const INITIAL_RULES = [
  // 1. Transaction category or remarks prefixed with F -> Friends (prefix matching, highest priority)
  {
    pattern: 'f ',
    matchType: 'prefix',
    category: 'Friends',
    group: 'Friends & Split',
    priority: 100,
    bank: 'ALL',
    isActive: true,
  },
  // 2. Rent (including room rent, house rent, flat rent, pg rent, room maintenance, landlord) -> Rent
  {
    pattern: 'room rent, rent, house rent, flat rent, pg rent, room maintenance, landlord',
    matchType: 'contains',
    category: 'Rent',
    group: 'Housing & Rent',
    priority: 95,
    bank: 'ALL',
    isActive: true,
  },
  // 3. Remarks or description beginning with home (e.g. "home seeds") -> Home
  {
    pattern: 'home',
    matchType: 'prefix',
    category: 'Home',
    group: 'Home Living',
    priority: 90,
    bank: 'ALL',
    isActive: true,
  },
  // 4. Investment
  {
    pattern: 'zerodha, zerodha broking, zerodha broking ltd, groww, upstox',
    matchType: 'contains',
    category: 'Investment',
    group: 'Securities',
    priority: 85,
    bank: 'ALL',
    isActive: true,
  },
  // 5. Debt & Loan Repayments (debt, emi, loan, credit card payment)
  {
    pattern: 'debt, emi, loan, credit card payment, cc payment, debt repayment, loan repayment, personal loan, home loan',
    matchType: 'contains',
    category: 'Debt',
    group: 'Loan & EMI',
    priority: 92,
    bank: 'ALL',
    isActive: true,
  },
  // 5. Recognized dividend transaction narration -> Dividend
  {
    pattern: 'dividend, div, ach, cms, ach/, cms/, ach/dividend, cms/dividend, ach/div, dividend payout, interim dividend, final dividend',
    matchType: 'contains',
    category: 'Dividend',
    group: 'Dividends',
    priority: 80,
    bank: 'ALL',
    isActive: true,
  },
  // 6. Recognized salary credit -> Salary
  {
    pattern: 'salary, payroll, salary credit, salary cr',
    matchType: 'contains',
    category: 'Salary',
    group: 'Monthly Salary',
    priority: 80,
    bank: 'ALL',
    isActive: true,
  },
  // 7. Utilities (Electricity, water, gas, and internet bills like BSNL BILLD, ACT, ATRIA CONV)
  {
    pattern: 'bsnl billd, bsnl, act, atria conv, atria convergence, internet bill, broadband bill, wifi bill, broadband, wifi, internet, fiber, act fibernet, jiofiber, airtel xstream, electricity bill, electric bill, electricity, current bill, power bill, eb bill, bescom, tneb, upcl, electricity payment, water bill, gas cylinder',
    matchType: 'contains',
    category: 'Utilities',
    group: 'Utility & Internet Bills',
    priority: 78,
    bank: 'ALL',
    isActive: true,
  },
  // 8. Travel (BMTC, IRCTC, State Transport, bus, train, flights)
  {
    pattern: 'bmtc, irctc, state tran, state trans, statetransport, state transport, ksrtc, setc, apsrtc, tsrtc, msrtc, train, flight, travel, redbus, abhibus, makemytrip',
    matchType: 'contains',
    category: 'Travel',
    group: 'Bus & Train',
    priority: 76,
    bank: 'ALL',
    isActive: true,
  },
  // 9. Recognized refund transaction -> Refund
  {
    pattern: 'refund, rfnd, cash back, cashback, reversal',
    matchType: 'contains',
    category: 'Refund',
    group: 'Refund',
    priority: 75,
    bank: 'ALL',
    isActive: true,
  },
  // 10. Monthly recurring essentials (haircut, water can) -> Monthly
  {
    pattern: 'haircut, hair cut, salon, water can, watercan, 20l water, bubble top',
    matchType: 'contains',
    category: 'Monthly',
    group: 'Monthly Essentials',
    priority: 72,
    bank: 'ALL',
    isActive: true,
  },
  // 11. Stationery-related descriptions -> Stationery
  {
    pattern: 'stationery, stationary, books, bookstore, notebook, pen, pens, xerox, printout',
    matchType: 'contains',
    category: 'Stationery',
    group: 'Stationery Supplies',
    priority: 70,
    bank: 'ALL',
    isActive: true,
  },
  // 11. Tea, coffee, snacks, juice -> Snacks
  {
    pattern: 'tea, coffee, snacks, juice, chai, samosa, puff, puffs, bakery, biscuit',
    matchType: 'contains',
    category: 'Snacks',
    group: 'Quick Bites',
    priority: 65,
    bank: 'ALL',
    isActive: true,
  },
  // 12. Grocery-related descriptions -> Groceries
  {
    pattern: 'grocery, groceries, vegetables, vegetable, fruits, milk, provisions, zepto, blinkit, instamart, swiggy instamart, super market, supermarket, dmart',
    matchType: 'contains',
    category: 'Groceries',
    group: 'Provisions',
    priority: 60,
    bank: 'ALL',
    isActive: true,
  },
  // 13. Petrol / Fuel
  {
    pattern: 'petrol, diesel, fuel, iocl, bpcl, hpcl, shell petrol, indian oil',
    matchType: 'contains',
    category: 'Petrol',
    group: 'Fuel',
    priority: 55,
    bank: 'ALL',
    isActive: true,
  },
  // 14. Recognized transfer between the user's own accounts -> Transfer (Self)
  {
    pattern: 'self, self transfer, sbi to icici, icici to sbi, own account, transfer to self, linked account',
    matchType: 'contains',
    category: 'Transfer',
    group: 'Internal Transfer',
    priority: 88,
    bank: 'ALL',
    isActive: true,
  },
  // 15. Transport (Local commute: metro, cabs, autos)
  {
    pattern: 'metro, auto, cab, ola, uber, rapido, namma yatri, taxi',
    matchType: 'contains',
    category: 'Transport',
    group: 'Daily Commute',
    priority: 45,
    bank: 'ALL',
    isActive: true,
  },
  // 16. Bills & Recharges
  {
    pattern: 'mobile recharge, jio recharge, airtel recharge, vi recharge, bill payment',
    matchType: 'contains',
    category: 'Bills',
    group: 'Recharges & Bills',
    priority: 40,
    bank: 'ALL',
    isActive: true,
  },
];

export const ensureInitialData = async (userId) => {
  if (!userId) throw new Error('A user is required to seed personal categories and rules');
  try {
    // 1. Remove duplicate 'Room Rent' category & rules to keep only 'Rent'
    await prisma.transaction.updateMany({
      where: { category: 'Room Rent' },
      data: { category: 'Rent' },
    });
    await prisma.categorizationRule.updateMany({
      where: { category: 'Room Rent' },
      data: { category: 'Rent', group: 'Housing & Rent' },
    });
    await prisma.category.deleteMany({ where: { name: 'Room Rent' } });

    // 2. Remove duplicate 'Utility' category & rules to keep only 'Utilities'
    await prisma.categorizationRule.deleteMany({ where: { category: 'Utility' } });
    await prisma.transaction.updateMany({
      where: { category: 'Utility' },
      data: { category: 'Utilities' },
    });
    await prisma.category.deleteMany({ where: { name: 'Utility' } });

    // 2. Seed Categories if missing
    for (const cat of INITIAL_CATEGORIES) {
      await prisma.category.upsert({
        where: { userId_name: { userId, name: cat.name } },
        update: {},
        create: { name: cat.name, type: cat.type, description: cat.description },
      });
    }

    // 3. Synchronize Initial Rules
    for (const rule of INITIAL_RULES) {
      const existing = await prisma.categorizationRule.findFirst({
        where: {
          category: rule.category,
          matchType: rule.matchType,
          isUserCreated: false,
        },
      });

      if (!existing) {
        await prisma.categorizationRule.create({
          data: rule,
        });
      }
    }
    console.log(`✅ Synchronized initial categories and categorization rules (Utilities consolidated).`);
  } catch (err) {
    console.warn('Could not seed initial categories/rules:', err.message);
    throw err;
  }
};
