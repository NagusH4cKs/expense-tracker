# Personal Expense Tracker

## 1. Project Overview

The Personal Expense Tracker is a web and mobile application for managing personal finances. Its target capabilities include importing bank statements, automatically categorizing transactions, tracking income and expenses, and presenting financial activity through dashboards and reports.

The application is intended primarily for personal use, with a focus on accuracy, privacy, low operating costs, and ease of use. It should support multiple financial accounts, including bank accounts, meal cards, and other payment sources. The primary goal is to reduce manual tracking by importing Excel statements and classifying transactions with configurable rules.

This README distinguishes the **target requirements and roadmap** from the **current implementation**. Features in the roadmap are not necessarily available yet.

## 2. Project Objectives

- Build a responsive web application with React and TypeScript.
- Build a mobile application with React Native and Expo.
- Support local development and testing before backend integration.
- Import banking statements from Excel and CSV files.
- Categorize transactions automatically using descriptions, remarks, and custom rules.
- Let users review and correct assigned categories.
- Detect duplicate transactions across repeated imports.
- Track income, expenses, transfers, refunds, and investments.
- Provide dashboards, summaries, filters, and reports.
- Integrate Supabase for authentication, database storage, and synchronization.
- Deploy the web app using free or low-cost hosting where practical.
- Keep personal usage within service free-tier limits where possible.

## 3. Technology Stack

| Component | Technology |
| --- | --- |
| Web frontend | React |
| Programming language | TypeScript |
| Web build tool | Vite |
| Mobile application | React Native with Expo |
| Backend and database | Supabase and PostgreSQL |
| Authentication | Supabase Auth |
| Icons | Lucide React (web) |
| Web hosting | Netlify or another suitable provider |
| Version control | Git and GitHub |
| Statement processing | Excel and CSV parsing libraries |

The initial development phase uses local data and browser/device storage as appropriate. Supabase should be introduced after local application workflows are functional and tested.

## 4. Supported Financial Accounts

The application should support multiple accounts, each with its own transaction history. Initial accounts are:

- ICICI Bank
- State Bank of India (SBI)
- Pluxee/Sodexo meal card

Users should be able to add accounts in the future. Each account should support an account name, account type, institution/provider, opening balance when available, imported transaction history, and a calculated current balance where the available data permits.

Supported account types should include bank accounts, meal cards, cash, wallets, credit cards, investment accounts, and custom account types.

## 5. Functional Requirements

### 5.1 Dashboard

The dashboard should display:

- Total income, total expenses, and net cash flow.
- Current balances by account.
- Recent transactions.
- Spending by category.
- Monthly income and expense summaries.
- Trends over time.
- Investment-related transactions.
- Transactions that need categorization or review.

Users should be able to filter dashboard information by date range and account.

### 5.2 Transaction Management

Users should be able to view transactions in a table or list; add, edit, and delete transactions; search by description, remarks, account, or category; filter by date, account, category, and transaction type; view debit and credit transactions separately; mark transactions as reviewed; and correct automatically assigned categories.

Each transaction should support:

- Transaction date.
- Description and original bank remarks/narration.
- Amount and debit/credit indicator.
- Account and category.
- Transaction source and import reference.
- Review status.
- Duplicate-detection reference, where available.

Amounts should be stored consistently, with transaction type identifying money received versus money spent.

### 5.3 Excel Bank Statement Import

The application must support `.xlsx` and, where supported by the selected parser, `.xls` statements. CSV may also be supported. The import flow should:

1. Let the user select the financial account.
2. Accept a statement file upload.
3. Identify or let the user select the statement format and bank.
4. Read the file and extract transaction rows.
5. Map source columns to the common transaction fields.
6. Preview the extracted transactions.
7. Detect possible duplicates.
8. Assign categories automatically when configured rules match.
9. Flag uncertain or unmatched transactions for review.
10. Let the user correct categories before import.
11. Save only accepted transactions.
12. Show an import summary.

The summary should report total rows detected, successfully imported transactions, duplicates skipped, invalid/skipped rows, and transactions requiring manual review. Malformed data must not be silently imported, and possible duplicates must be disclosed.

### 5.4 Automatic Transaction Categorization

Categorization should use a configurable rule-based engine and should not require an external AI service for the initial implementation. The engine should read descriptions and original remarks, normalize match text while preserving the original narration, apply bank-specific parsing where needed, evaluate configured rules, assign a category only when a reliable rule matches, flag ambiguous or unmatched transactions for review, and allow category corrections. Optionally, a user-approved pattern can be saved as a reusable rule.

Rules should support configurable patterns, priorities, and matching types such as exact, contains, or prefix.

Initial categories:

- Food
- Snacks
- Groceries
- Shopping
- Travel
- Transport
- Petrol
- Bills
- Utilities
- Rent
- Home
- Entertainment
- Health
- Investment
- Salary
- Dividend
- Refund
- Friends
- Transfer
- Laptop
- Others

Users should be able to add, rename, and manage categories. Initial rule examples:

| Pattern or condition | Category/action |
| --- | --- |
| Tea, coffee, snacks, or juice | Snacks |
| Transaction category or remarks prefixed with `F `, where applicable | Friends |
| Remarks beginning with `home` | Home |
| Grocery-related descriptions | Groceries |
| Stationery-related descriptions | Stationery or the configured stationery category |
| `ZERODHA` or `ZERODHA BROKING LTD` | Investment |
| Recognized dividend narration | Dividend |
| Recognized salary credit | Salary |
| Recognized refund narration | Refund |
| Transfer between the user's own accounts | Transfer or exclude from spending reports |
| Unmatched transaction | Needs review |

Bank-specific rules must be configurable because narration formats vary. If a transaction cannot be confidently categorized, preserve its original remarks and flag it for review instead of assigning an arbitrary category.

### 5.5 Duplicate Detection

Repeated imports must not silently create duplicate transactions. Duplicate detection should consider account, transaction date, amount, debit/credit indicator, bank reference number, and description/remarks. Prefer bank reference numbers when present; otherwise use a reliable combination of transaction fields. Distinguish confirmed duplicates from possible duplicates that need review.

### 5.6 Transfers Between Own Accounts

Transfers between the user's own accounts must be distinguishable from regular income and expenses. For example, an SBI-to-ICICI transfer must not be counted as new income or genuine spending in consolidated reports.

The application should identify transfers between linked accounts, link debit and credit sides, exclude internal transfers from income/expense totals, handle cases where only one side is imported, and allow manual correction. Users should be able to choose whether personal transfers are excluded from reports or retained for reconciliation.

### 5.7 Financial Reports

Provide monthly income/expense reports, category spending, account summaries, savings and cash-flow trends, refund and transfer summaries, investment summaries, unreviewed-transaction reports, and exportable transaction data. Reports should support date-range and account filters.

## 6. Development Roadmap

Development proceeds in phases. Complete and test local workflows before introducing backend dependencies.

### Phase 1: Local Web Application

**Goal:** Complete the main web workflows using local data.

1. Set up React, TypeScript, and Vite.
2. Create the dashboard and transaction list.
3. Implement search and filtering.
4. Implement manual transaction creation, editing, and deletion.
5. Create category management.
6. Add account selection and management.
7. Implement local persistence.
8. Add income and expense summaries.
9. Test with sample transactions.

**Completion criteria:** The web app manages and displays transactions locally without requiring Supabase.

### Phase 2: Local Mobile Application

**Goal:** Build the mobile application and validate essential workflows.

1. Set up Expo and navigation.
2. Build dashboard, transaction list, and transaction details screens.
3. Implement manual transaction entry.
4. Add category and account selection, search, and filtering.
5. Implement local persistence.
6. Reuse transaction and categorization logic where practical.
7. Test on an emulator or physical device.

**Completion criteria:** The mobile app manages transactions locally and is usable on mobile devices.

### Phase 3: Local Excel Import and Categorization

**Goal:** Complete statement processing before connecting a database.

1. Add Excel and CSV parsing.
2. Support initial ICICI, SBI, and Pluxee/Sodexo statement formats.
3. Map source columns to a common transaction structure.
4. Preserve original narration and reference information.
5. Implement account-specific parsing and rule-based categorization.
6. Add duplicate detection, import preview, and confirmation.
7. Allow category corrections and report import errors.
8. Test representative statement files and verify dashboard totals.

**Completion criteria:** Supported statements can be uploaded, reviewed, categorized, and imported locally without Supabase.

### Phase 4: Supabase Backend Integration

**Goal:** Replace local-only persistence with secure database-backed storage.

1. Configure Supabase and environment variables.
2. Create and verify database tables.
3. Configure Supabase Auth, user profiles, and account ownership.
4. Connect the web application and load accounts/categories.
5. Store and retrieve transactions, import history, and categorization rules.
6. Configure and verify Row Level Security (RLS).
7. Test reads, inserts, updates, and deletes.

The database design should support tables such as `profiles`, `accounts`, `categories`, `transactions`, `imports`, and `categorization_rules`.

**Completion criteria:** Authenticated users can manage associated records, and verified access restrictions prevent access to another user's private data.

### Phase 5: Web Import Integration

**Goal:** Connect the tested local import workflow to Supabase.

1. Validate uploaded statement files and show a preview.
2. Check for duplicates against existing transactions.
3. Apply categorization rules and allow corrections.
4. Save accepted transactions and record import results.
5. Handle partial failures safely.
6. Refresh the dashboard and transaction list after import.
7. Test repeated imports and overlapping statement periods.

**Completion criteria:** Imports persist correctly without unwanted duplicate transactions.

### Phase 6: Mobile and Web Synchronization

**Goal:** Make user data available across devices.

1. Connect mobile to Supabase and implement authentication.
2. Fetch the user's accounts, categories, and transactions.
3. Save manual transactions and synchronize changes.
4. Implement loading, error, retry, and network-interruption behavior.
5. Decide how local changes reconcile after reconnection.
6. Test simultaneous changes from multiple devices.

**Completion criteria:** The same account and transaction data is consistently accessible on web and mobile.

### Phase 7: Reports and Final Improvements

1. Complete monthly and category reports.
2. Improve transaction review workflows.
3. Add account reconciliation where statement data permits.
4. Improve import validation and error messages.
5. Add export and backup options.
6. Optimize queries and performance.
7. Improve responsive layouts and accessibility.
8. Verify database security policies.
9. Test larger statement files.
10. Document setup, usage, and recovery procedures.

### Phase 8: Deployment

1. Prepare the production build and configure hosting.
2. Set production environment variables and Supabase URL/keys.
3. Deploy the web app and test production authentication/database access.
4. Configure mobile builds when needed.
5. Verify private data protection.
6. Document updates and maintenance.

Prefer free or low-cost services where practical, subject to their current usage limits and terms.

## 7. Data Storage and Security Requirements

- Keep Supabase credentials in environment variables.
- Never expose a Supabase service-role key in frontend code; use only the publishable/anon key with correctly configured RLS.
- Require authentication for private financial records and apply RLS to every relevant private table.
- Do not store bank login credentials, PINs, or OTPs.
- Avoid unnecessarily logging complete statements or sensitive transaction details.
- Validate uploaded files and provide clear import errors.
- Retain original transaction data for audit and correction.
- Provide transaction export or backup.
- Treat statements and transaction data as confidential financial information.

## 8. Local Development Requirements

Development should work on Windows using Git Bash. Prerequisites:

- Node.js and npm.
- Git and an editor such as Visual Studio Code.
- A web browser.
- Expo Go or an appropriate emulator for mobile testing.

The repository has separate applications under `apps/`. Run commands from the repository root unless noted.

### Web

```sh
cd apps/web
npm install
npm run dev
```

Open the local URL printed by Vite. Build and preview with `npm run build` and `npm run preview` from `apps/web`.

The current web code reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. For the existing category lookup, create a root `.env.local` and provide a Supabase project with a readable `categories` table containing a `name` column:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Never use a service-role key in frontend environment variables. During local-only phases, app workflows should remain testable without live backend access.

### Mobile

```sh
cd apps/mobile
npm install
npx expo start
```

Follow Expo's terminal instructions to open the app on a simulator or device. The package also provides `npm run android` and `npm run ios` scripts.

### Web deployment

For Netlify, use base directory `apps/web`, build command `npm run build`, and publish directory `dist`. Set the Supabase environment variables in the hosting provider and allow the deployed origin in the project's access configuration. Hosting providers and free-tier limits may change.

## 9. Testing Requirements

Test with manually created transactions, debit/credit entries, multiple accounts, empty and malformed statements, unexpected Excel columns, duplicate statements, overlapping periods, missing descriptions, refunds, internal transfers, unknown narrations, incorrect category assignments, and large files. Also test database failures, unauthorized access, interrupted imports, and network failures. Verify financial totals against source statements wherever possible.

## 10. Initial Acceptance Criteria

The first complete version should satisfy all of the following:

- Web and mobile applications run locally.
- Transactions can be created, edited, deleted, searched, and filtered.
- Multiple accounts and managed categories are supported.
- Excel statements can be uploaded and supported formats parse correctly.
- Configured categorization rules work; unmatched transactions can be reviewed.
- Duplicate imports are detected.
- Internal transfers are handled correctly in consolidated reports.
- Dashboard totals match underlying transactions.
- Supabase authentication and persistence work.
- Web and mobile share the same user's data.
- RLS protects private financial records.
- The web application can be deployed successfully.

## 11. Implementation Principles

1. Build one phase at a time and keep both applications working.
2. Complete and test local workflows before introducing backend dependencies.
3. Reuse shared TypeScript types and business logic where practical.
4. Keep statement parsing, categorization, duplicate detection, and persistence in distinct modules.
5. Never discard original bank narration during categorization.
6. Do not silently classify uncertain transactions.
7. Do not count internal transfers as genuine income or expenses in consolidated reports.
8. Validate calculations against actual statement totals.
9. Prefer free-tier services and avoid unnecessary paid APIs.
10. Test changes before committing and pushing to GitHub.
11. Maintain documentation as the project evolves.

## 12. Current Development Status

The repository currently contains a React web app, an Expo mobile starter, a Supabase client module, and an existing category lookup. The web app currently supports a dashboard, totals, recent/all transaction lists, manual transaction creation, deletion, search, category filtering, basic CSV import, and browser `localStorage` persistence. Categories are requested from Supabase. Transaction records are not currently stored in Supabase.

The mobile app currently displays hard-coded sample dashboard data. Its transaction controls, local persistence, authentication, and synchronization are not implemented. The current web import is a lightweight CSV importer; Excel statement parsing, import preview, bank-specific mapping, categorization rules, and robust duplicate detection remain roadmap work. Authentication, account/category management, full reporting, and cross-device synchronization also remain to be implemented.

A successful production build confirms that the code compiles; it does not by itself confirm database connectivity, authentication, imports, or synchronization. Verify those independently as they are implemented.

## Project Outcome

A private, low-cost personal finance application for web and mobile that imports banking statements, categorizes transactions with reviewable rules, and provides a consolidated view of income, expenses, accounts, transfers, and investments.
