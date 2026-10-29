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
  { name: 'Utilities', type: 'expense', description: 'Electricity, water, gas cylinder' },
  { name: 'Rent', type: 'expense', description: 'House rent & maintenance' },
  { name: 'Home', type: 'expense', description: 'Home improvements, supplies, repairs' },
  { name: 'Entertainment', type: 'expense', description: 'Movies, streaming, outings' },
  { name: 'Health', type: 'expense', description: 'Doctor visits, medicines, gym' },
  { name: 'Investment', type: 'expense', description: 'Stocks, mutual funds, trading' },
  { name: 'Salary', type: 'income', description: 'Monthly salary credits' },
  { name: 'Dividend', type: 'income', description: 'Stock & mutual fund dividend payouts' },
  { name: 'Refund', type: 'income', description: 'Refunds and cashbacks' },
  { name: 'Friends', type: 'expense', description: 'Shared expenses, friends & family' },
  { name: 'Transfer', type: 'transfer', description: 'Internal transfers between own bank accounts' },
  { name: 'Laptop', type: 'expense', description: 'Laptop, peripherals, hardware' },
  { name: 'Stationery', type: 'expense', description: 'Books, pens, stationery supplies' },
  { name: 'Others', type: 'expense', description: 'Miscellaneous expenses' },
];

export const INITIAL_RULES = [
  // 1. Transaction category or remarks prefixed with F, where applicable -> Friends (prefix matching, high priority)
  {
    pattern: 'f ',
    matchType: 'prefix',
    category: 'Friends',
    group: 'Friends & Split',
    priority: 100,
    bank: 'ALL',
    isActive: true,
  },
  // 2. Remarks beginning with home -> Home (prefix matching)
  {
    pattern: 'home',
    matchType: 'prefix',
    category: 'Home',
    group: 'Home Living',
    priority: 90,
    bank: 'ALL',
    isActive: true,
  },
  // 3. ZERODHA or ZERODHA BROKING LTD -> Investment
  {
    pattern: 'zerodha, zerodha broking, zerodha broking ltd, groww, upstox',
    matchType: 'contains',
    category: 'Investment',
    group: 'Securities',
    priority: 85,
    bank: 'ALL',
    isActive: true,
  },
  // 4. Recognized dividend transaction narration -> Dividend
  {
    pattern: 'dividend, div/, ach/dividend, cms/dividend, ach/div',
    matchType: 'contains',
    category: 'Dividend',
    group: 'Dividends',
    priority: 80,
    bank: 'ALL',
    isActive: true,
  },
  // 5. Recognized salary credit -> Salary
  {
    pattern: 'salary, payroll, salary credit, salary cr',
    matchType: 'contains',
    category: 'Salary',
    group: 'Monthly Salary',
    priority: 80,
    bank: 'ALL',
    isActive: true,
  },
  // 6. Recognized refund transaction -> Refund
  {
    pattern: 'refund, rfnd, cash back, cashback, reversal',
    matchType: 'contains',
    category: 'Refund',
    group: 'Refund',
    priority: 75,
    bank: 'ALL',
    isActive: true,
  },
  // 7. Stationery-related descriptions -> Stationery
  {
    pattern: 'stationery, stationary, book, books, pen, pens, notebook, xerox, printout',
    matchType: 'contains',
    category: 'Stationery',
    group: 'Stationery Supplies',
    priority: 70,
    bank: 'ALL',
    isActive: true,
  },
  // 8. Tea, coffee, snacks, juice -> Snacks
  {
    pattern: 'tea, coffee, snacks, juice, chai, samosa, puff, puffs, bakery, biscuit',
    matchType: 'contains',
    category: 'Snacks',
    group: 'Quick Bites',
    priority: 65,
    bank: 'ALL',
    isActive: true,
  },
  // 9. Grocery-related descriptions -> Groceries
  {
    pattern: 'grocery, groceries, vegetables, vegetable, fruits, milk, provisions, zepto, blinkit, instamart, swiggy instamart, super market, supermarket, dmart',
    matchType: 'contains',
    category: 'Groceries',
    group: 'Provisions',
    priority: 60,
    bank: 'ALL',
    isActive: true,
  },
  // 10. Petrol / Fuel
  {
    pattern: 'petrol, diesel, fuel, iocl, bpcl, hpcl, shell petrol, indian oil',
    matchType: 'contains',
    category: 'Petrol',
    group: 'Fuel',
    priority: 55,
    bank: 'ALL',
    isActive: true,
  },
  // 11. Recognized transfer between the user\'s own accounts -> Transfer
  {
    pattern: 'self transfer, sbi to icici, icici to sbi, own account, transfer to self, linked account',
    matchType: 'contains',
    category: 'Transfer',
    group: 'Internal Transfer',
    priority: 50,
    bank: 'ALL',
    isActive: true,
  },
  // 12. Transport
  {
    pattern: 'bmtc, metro, irctc, auto, cab, ola, uber, rapido, bus',
    matchType: 'contains',
    category: 'Transport',
    group: 'Daily Commute',
    priority: 45,
    bank: 'ALL',
    isActive: true,
  },
  // 13. Bills & Utilities
  {
    pattern: 'electricity, bescom, tneb, broadband, wifi, recharge, jio, airtel, water bill',
    matchType: 'contains',
    category: 'Bills',
    group: 'Utility Bills',
    priority: 40,
    bank: 'ALL',
    isActive: true,
  },
];

export const ensureInitialData = async () => {
  try {
    // 1. Seed Categories if missing
    for (const cat of INITIAL_CATEGORIES) {
      await prisma.category.upsert({
        where: { name: cat.name },
        update: { type: cat.type, description: cat.description },
        create: { name: cat.name, type: cat.type, description: cat.description },
      });
    }

    // 2. Seed Initial Rules if no rules exist
    const rulesCount = await prisma.categorizationRule.count();
    if (rulesCount === 0) {
      for (const rule of INITIAL_RULES) {
        await prisma.categorizationRule.create({
          data: rule,
        });
      }
      console.log(`✅ Seeded ${INITIAL_RULES.length} initial categorization rules.`);
    }
  } catch (err) {
    console.warn('Could not seed initial categories/rules:', err.message);
  }
};
