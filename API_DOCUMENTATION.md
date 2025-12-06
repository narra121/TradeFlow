# TradeFlow - API Documentation & UI Structure

This document provides a comprehensive overview of the TradeFlow trading journal application's UI structure, data models, and required API endpoints for backend development.

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Data Models](#data-models)
3. [Authentication](#authentication)
4. [Navigation Structure](#navigation-structure)
5. [Dashboard View](#dashboard-view)
6. [Accounts View](#accounts-view)
7. [Trade Log View](#trade-log-view)
8. [Analytics View](#analytics-view)
9. [Goals & Rules View](#goals--rules-view)
10. [Profile View](#profile-view)
11. [Settings View](#settings-view)
12. [Shared Components](#shared-components)
13. [API Endpoints Summary](#api-endpoints-summary)

---

## Application Overview

**TradeFlow** is a trading journal application that helps traders track, analyze, and improve their trading performance.

### Routes
| Route | Description |
|-------|-------------|
| `/` | Public landing page |
| `/login` | User login page |
| `/signup` | User registration page |
| `/app` | Main application (authenticated) |

### Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React hooks, React Query
- **Charts**: Recharts

---

## Data Models

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  subscription: {
    status: 'active' | 'inactive' | 'cancelled';
    plan: string;
    amount: number;
    billingCycle: 'monthly' | 'annual';
    nextBillingDate: Date;
  };
  preferences: {
    darkMode: boolean;
    currency: 'USD' | 'EUR' | 'GBP';
    timezone: string;
    notifications: {
      tradeReminders: boolean;
      weeklyReport: boolean;
      goalAlerts: boolean;
    };
  };
}
```

### Trading Account
```typescript
type AccountStatus = 'active' | 'breached' | 'passed' | 'withdrawn' | 'inactive';
type AccountType = 'prop_challenge' | 'prop_funded' | 'personal' | 'demo';

interface TradingAccount {
  id: string;
  userId: string;
  name: string;
  broker: string;
  type: AccountType;
  status: AccountStatus;
  balance: number;
  initialBalance: number;
  currency: string;
  createdAt: Date;
  notes?: string;
}
```

### Trade
```typescript
type TradeDirection = 'LONG' | 'SHORT';
type TradeStatus = 'OPEN' | 'CLOSED';

interface TradeImage {
  id: string;
  url: string;
  timeframe: string;
  description: string;
}

interface Trade {
  id: string;
  userId: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  entryDate: Date;          // Includes both date and time (ISO 8601 format: "2024-01-15T09:30:00Z")
  exitDate?: Date;          // Includes both date and time (ISO 8601 format: "2024-01-15T14:45:00Z")
  status: TradeStatus;
  pnl?: number;
  pnlPercent?: number;
  riskRewardRatio: number;
  notes?: string;
  setup?: string;
  strategy?: string;
  session?: string;
  marketCondition?: string;
  newsEvents?: string[];
  mistakes?: string[];
  keyLesson?: string;
  images?: TradeImage[];
  tags?: string[];
  emotions?: string;
  accountIds?: string[];      // Trade can belong to multiple accounts
  brokenRuleIds?: string[];   // References to TradingRule.id
}
```

### Goal
```typescript
interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;           // '$', '%', ' trades'
  period: 'weekly' | 'monthly';
  icon: string;           // Icon identifier
  color: string;          // CSS color class
  isInverse?: boolean;    // For goals like "max drawdown" where lower is better
  createdAt: Date;
  updatedAt: Date;
}
```

### Trading Rule
```typescript
interface TradingRule {
  id: string;
  userId: string;
  rule: string;
  completed: boolean;      // Daily completion status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Saved Options (for autocomplete/smart inputs)
```typescript
interface SavedOptions {
  userId: string;
  symbols: string[];
  strategies: string[];
  sessions: string[];
  marketConditions: string[];
  newsEvents: string[];
  mistakes: string[];
  lessons: string[];
  timeframes: string[];
}
```

### Portfolio Stats (Calculated)
```typescript
interface PortfolioStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  avgRiskReward: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}
```

### Daily Stats (Calculated)
```typescript
interface DailyStats {
  date: Date;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  winRate: number;
}
```

---

## Authentication

### UI Components
- **LoginPage** (`/login`): Email/password login form
- **SignupPage** (`/signup`): Registration form with password strength indicator
- **OTP Verification**: Email confirmation with 6-digit OTP input
- **Forgot Password**: Password reset flow

### Required APIs

#### `POST /api/auth/register`
Create a new user account.

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "user": { "id": "string", "name": "string", "email": "string" },
  "message": "Verification email sent"
}
```

---

#### `POST /api/auth/login`
Authenticate user.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "user": { "id": "string", "name": "string", "email": "string" },
  "token": "string",
  "refreshToken": "string"
}
```

---

#### `POST /api/auth/verify-email`
Verify email with OTP code.

**Request Body:**
```json
{
  "email": "string",
  "code": "string"
}
```

---

#### `POST /api/auth/forgot-password`
Request password reset.

**Request Body:**
```json
{
  "email": "string"
}
```

---

#### `POST /api/auth/reset-password`
Reset password with token.

**Request Body:**
```json
{
  "token": "string",
  "newPassword": "string"
}
```

---

#### `POST /api/auth/logout`
Logout user.

---

#### `GET /api/auth/me`
Get current authenticated user.

**Response:**
```json
{
  "user": { ...User }
}
```

---

## Navigation Structure

The main application (`/app`) has a sidebar with the following navigation items:

| Icon | Label | View ID | Description |
|------|-------|---------|-------------|
| LayoutDashboard | Dashboard | `dashboard` | Overview of trading performance |
| Building2 | Accounts | `accounts` | Manage trading accounts |
| BookOpen | Trade Log | `tradelog` | List and calendar view of trades |
| TrendingUp | Analytics | `analytics` | Detailed performance analytics |
| Target | Goals | `goals` | Goals and trading rules management |
| Settings | Settings | `settings` | Application preferences |
| User | Profile | `profile` | User profile and subscription |

---

## Dashboard View

### UI Components Displayed

1. **Header Section**
   - Title: "Dashboard"
   - Subtitle: "Track your trading performance"
   - Buttons: "Import" and "New Trade"

2. **Filters**
   - DateRangeFilter (Last 30/60/90 Days or Custom)
   - AccountFilter (filter by trading account)

3. **Stats Grid (4 cards)**
   - Total P&L (with trend indicator)
   - Win Rate (%)
   - Total Trades (count)
   - Open Positions (count)

4. **Performance Chart**
   - Line chart showing equity curve over time

5. **Win Rate Ring**
   - Circular progress showing win/loss ratio
   - Win count and Loss count

6. **Recent Trades List**
   - Shows last 5 trades
   - Columns: Symbol, Direction, Entry, Exit, P&L

7. **Quick Stats**
   - Average Win
   - Average Loss
   - Profit Factor
   - Best Trade
   - Worst Trade
   - Average R:R

### Data Required

```typescript
{
  trades: Trade[];                    // All trades for the user
  stats: PortfolioStats;              // Calculated portfolio statistics
  selectedAccountId?: string;         // Currently selected account filter
  dateRange: { from: Date, to: Date }; // Date filter range
}
```

### Required APIs

#### `GET /api/trades`
Fetch all trades with optional filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `accountId` | string | Filter by account |
| `startDate` | ISO date | Start of date range |
| `endDate` | ISO date | End of date range |
| `status` | 'OPEN' \| 'CLOSED' | Filter by status |
| `symbol` | string | Filter by symbol |

**Response:**
```json
{
  "trades": [Trade],
  "total": number
}
```

---

#### `GET /api/stats`
Get portfolio statistics.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `accountId` | string | Filter by account |
| `startDate` | ISO date | Start of date range |
| `endDate` | ISO date | End of date range |

**Response:**
```json
{
  "stats": PortfolioStats
}
```

---

#### `GET /api/stats/daily`
Get daily P&L data for chart.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `accountId` | string | Filter by account |
| `startDate` | ISO date | Start of date range |
| `endDate` | ISO date | End of date range |

**Response:**
```json
{
  "dailyStats": [DailyStats]
}
```

---

## Accounts View

### UI Components Displayed

1. **Header**
   - Title: "Accounts"
   - "Add Account" button

2. **Summary Cards (3 cards)**
   - Total Accounts (count)
   - Combined Balance (sum of all account balances)
   - Total P&L (sum of all account P&L)

3. **Account Cards Grid**
   - Each card shows:
     - Account name
     - Broker name
     - Account type badge (Prop Challenge, Funded, Personal, Demo)
     - Status badge (Active, Breached, Passed, Withdrawn, Inactive)
     - Current balance
     - Initial balance
     - P&L (balance - initialBalance)
     - Currency
     - Notes (if any)
   - Actions: Edit, Delete, Change Status

4. **Add New Account Button** (large card style)

5. **AddAccountModal**
   - Form fields: Name, Broker, Type, Status, Initial Balance, Current Balance, Currency, Notes

### Data Required

```typescript
{
  accounts: TradingAccount[];
  totalBalance: number;          // Sum of all balances
  totalPnl: number;              // Sum of all (balance - initialBalance)
}
```

### Required APIs

#### `GET /api/accounts`
Fetch all accounts for the user.

**Response:**
```json
{
  "accounts": [TradingAccount]
}
```

---

#### `POST /api/accounts`
Create a new account.

**Request Body:**
```json
{
  "name": "string",
  "broker": "string",
  "type": "prop_challenge" | "prop_funded" | "personal" | "demo",
  "status": "active" | "breached" | "passed" | "withdrawn" | "inactive",
  "balance": number,
  "initialBalance": number,
  "currency": "string",
  "notes": "string"
}
```

**Response:**
```json
{
  "account": TradingAccount
}
```

---

#### `PUT /api/accounts/:id`
Update an existing account.

**Request Body:**
```json
{
  "name": "string",
  "broker": "string",
  "type": "string",
  "status": "string",
  "balance": number,
  "initialBalance": number,
  "currency": "string",
  "notes": "string"
}
```

---

#### `PATCH /api/accounts/:id/status`
Update account status only.

**Request Body:**
```json
{
  "status": "active" | "breached" | "passed" | "withdrawn" | "inactive"
}
```

---

#### `DELETE /api/accounts/:id`
Delete an account.

---

## Trade Log View

### UI Components Displayed

1. **Header**
   - Title: "Trade Log"
   - Subtitle: "Track and analyze your trading history"
   - Buttons: "Import" and "New Trade"

2. **Filters**
   - DateRangeFilter (with custom date picker)
   - AccountFilter

3. **Tab Navigation**
   - "Trades" tab (table view)
   - "Calendar" tab (calendar view)

### Trades Tab (Table View)

4. **Search & Status Filter**
   - Search input (filter by symbol)
   - Status buttons: All, Open, Closed

5. **Trades Table**
   - Columns: Symbol, Direction, Entry (price + date), Exit (price + date), Size, R:R, Status, P&L
   - Row actions: View, Edit, Close (if open), Delete

6. **TradeDetailModal**
   - Shows full trade details
   - Previous/Next navigation through filtered trades
   - Displays: All trade fields, images with descriptions, broken rules

### Calendar Tab

7. **Monthly Calendar**
   - Navigation: Previous/Next month
   - Each day cell shows:
     - Number of trades
     - Daily P&L (colored green/red)
   - Clicking a day opens CalendarTradeModal

8. **Weekly Stats Column**
   - For each week: Total trades, Win rate, Weekly P&L

9. **CalendarTradeModal**
   - Shows all trades for selected day
   - Previous/Next day navigation (only trading days)
   - Day summary: Total trades, Wins, Losses, Net P&L, Win rate

### Data Required

```typescript
{
  trades: Trade[];
  selectedAccountId?: string;
  dateRange: { from: Date, to: Date };
  searchQuery: string;
  statusFilter: 'ALL' | 'OPEN' | 'CLOSED';
}
```

### Required APIs

#### `POST /api/trades`
Create a new trade.

**Request Body:**
```json
{
  "symbol": "string",
  "direction": "LONG" | "SHORT",
  "entryPrice": number,
  "exitPrice": number | null,
  "stopLoss": number,
  "takeProfit": number,
  "size": number,
  "entryDate": "ISO date",
  "exitDate": "ISO date | null",
  "status": "OPEN" | "CLOSED",
  "pnl": number | null,
  "pnlPercent": number | null,
  "riskRewardRatio": number,
  "notes": "string",
  "strategy": "string",
  "session": "string",
  "marketCondition": "string",
  "newsEvents": ["string"],
  "mistakes": ["string"],
  "keyLesson": "string",
  "accountIds": ["string"],
  "brokenRuleIds": ["string"]
}
```

**Response:**
```json
{
  "trade": Trade
}
```

---

#### `PUT /api/trades/:id`
Update an existing trade.

**Request Body:** Same as POST

---

#### `PATCH /api/trades/:id/close`
Close an open trade.

**Request Body:**
```json
{
  "exitPrice": number,
  "exitDate": "ISO date",
  "pnl": number,
  "pnlPercent": number
}
```

---

#### `DELETE /api/trades/:id`
Delete a trade.

---

#### `POST /api/trades/import`
Bulk import trades from CSV.

**Request Body:**
```json
{
  "trades": [Trade],
  "accountId": "string"
}
```

**Response:**
```json
{
  "imported": number,
  "failed": number,
  "errors": [{ "row": number, "error": "string" }]
}
```

---

#### `POST /api/trades/:id/images`
Upload images for a trade.

**Request Body:** `multipart/form-data`
- `images`: File[]
- `timeframe`: string
- `description`: string

---

#### `DELETE /api/trades/:id/images/:imageId`
Delete an image from a trade.

---

## Analytics View

### UI Components Displayed

1. **Header**
   - Title: "Analytics"
   - Subtitle: "Deep dive into your trading performance"

2. **Filters**
   - DateRangeFilter

3. **Metrics Grid (8 cards)**
   - Total Trades
   - Win Rate
   - Profit Factor
   - Total P&L
   - Avg Win
   - Avg Loss
   - Best Trade
   - Worst Trade

4. **Charts Row 1**
   - Performance Chart (equity curve)
   - Daily P&L Bar Chart (green for profit, red for loss)

5. **Charts Row 2**
   - Hourly Win Rate Bar Chart (performance by hour of day)
   - Daily Win Rate Bar Chart (performance by day of week)

6. **Trade Duration Section**
   - Stats: Max Duration, Min Duration, Avg Duration
   - Stacked Bar Chart: Duration distribution (wins vs losses)

7. **Distribution Charts**
   - Symbol Distribution (Pie Chart)
   - Strategy Distribution (Pie Chart)
   - Performance by Session (table or chart)

### Data Required

```typescript
{
  trades: Trade[];
  stats: PortfolioStats;
  dateRange: { from: Date, to: Date };
  
  // Calculated data for charts
  dailyPnL: Array<{ date: string, pnl: number }>;
  hourlyStats: Array<{ hour: number, winRate: number, trades: number }>;
  dailyWinRate: Array<{ day: string, winRate: number, fullDay: string }>;
  symbolDistribution: Array<{ symbol: string, count: number, pnl: number }>;
  strategyDistribution: Array<{ strategy: string, count: number, pnl: number }>;
  durationData: Array<{ range: string, wins: number, losses: number }>;
}
```

### Required APIs

#### `GET /api/analytics/hourly`
Get performance breakdown by hour.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `accountId` | string | Filter by account |
| `startDate` | ISO date | Start of date range |
| `endDate` | ISO date | End of date range |

**Response:**
```json
{
  "hourlyStats": [
    { "hour": 0, "winRate": 65.5, "trades": 12, "pnl": 450 },
    ...
  ]
}
```

---

#### `GET /api/analytics/daily-win-rate`
Get win rate by day of week.

**Response:**
```json
{
  "dailyWinRate": [
    { "day": "Mon", "fullDay": "Monday", "winRate": 72, "trades": 15 },
    ...
  ]
}
```

---

#### `GET /api/analytics/symbol-distribution`
Get trade distribution by symbol.

**Response:**
```json
{
  "distribution": [
    { "symbol": "EURUSD", "count": 45, "pnl": 1200, "winRate": 68 },
    ...
  ]
}
```

---

#### `GET /api/analytics/strategy-distribution`
Get trade distribution by strategy.

**Response:**
```json
{
  "distribution": [
    { "strategy": "Breakout", "count": 30, "pnl": 800, "winRate": 65 },
    ...
  ]
}
```

---

#### `GET /api/analytics/duration`
Get trade duration statistics.

**Response:**
```json
{
  "maxDuration": 480,      // minutes
  "minDuration": 5,
  "avgDuration": 45,
  "distribution": [
    { "range": "< 1h", "wins": 20, "losses": 8 },
    { "range": "1-4h", "wins": 35, "losses": 15 },
    { "range": "4-24h", "wins": 12, "losses": 10 },
    { "range": "> 24h", "wins": 5, "losses": 3 }
  ]
}
```

---

## Goals & Rules View

### UI Components Displayed

1. **Header**
   - Title: "Goals & Rules"
   - Subtitle: "Track your trading objectives"
   - Period filter tabs: All, Weekly, Monthly

2. **Goals Grid (4 cards max)**
   - Each goal card shows:
     - Icon
     - Title
     - Description
     - Period badge (Weekly/Monthly)
     - Current value / Target value
     - Progress bar
     - Completion status (checkmark if completed)
   - Edit button to modify target

3. **Trading Rules Checklist**
   - Header: "Trading Rules" with count "X/Y followed today"
   - Add Rule button
   - Grid of rule cards:
     - Checkbox (toggleable)
     - Rule text
     - Edit button
     - Delete button

### Data Required

```typescript
{
  goals: Goal[];
  rules: TradingRule[];
  periodFilter: 'all' | 'weekly' | 'monthly';
}
```

### Required APIs

#### `GET /api/goals`
Fetch all goals for the user.

**Response:**
```json
{
  "goals": [Goal]
}
```

---

#### `PUT /api/goals/:id`
Update a goal (mainly target value).

**Request Body:**
```json
{
  "target": number,
  "title": "string",
  "description": "string"
}
```

---

#### `GET /api/rules`
Fetch all trading rules.

**Response:**
```json
{
  "rules": [TradingRule]
}
```

---

#### `POST /api/rules`
Create a new trading rule.

**Request Body:**
```json
{
  "rule": "string"
}
```

**Response:**
```json
{
  "rule": TradingRule
}
```

---

#### `PUT /api/rules/:id`
Update a trading rule.

**Request Body:**
```json
{
  "rule": "string"
}
```

---

#### `PATCH /api/rules/:id/toggle`
Toggle rule completion status for today.

**Response:**
```json
{
  "rule": TradingRule
}
```

---

#### `DELETE /api/rules/:id`
Delete a trading rule.

---

## Profile View

### UI Components Displayed

1. **Header**
   - Title: "Profile"
   - Subtitle: "Manage your account and subscription"

2. **User Profile Card**
   - Avatar (with upload button when editing)
   - Display name
   - Member since date
   - Form fields: Full Name, Email
   - Edit/Save button

3. **Current Subscription Card**
   - Current plan amount
   - Status badge (active/inactive)
   - Next billing date

4. **Support TradeFlow Section**
   - Billing cycle toggle: Monthly / Annual
   - **Monthly Tiers:**
     - $1/month - Basic (Cover hosting costs)
     - $3/month - Supporter (Help us grow)
     - $5/month - Champion (Fuel new features)
     - Custom amount (min $1)
   - **Annual Tiers:**
     - $12/year - Basic
     - $36/year - Supporter
     - $60/year - Champion
     - Custom amount (min $12)
   - Subscribe button
   - Features list (8 items)

### Data Required

```typescript
{
  user: User;
  subscription: {
    status: string;
    plan: string;
    amount: number;
    nextBilling: Date;
  };
}
```

### Required APIs

#### `PUT /api/user/profile`
Update user profile.

**Request Body:**
```json
{
  "name": "string",
  "email": "string"
}
```

---

#### `POST /api/user/avatar`
Upload user avatar.

**Request Body:** `multipart/form-data`
- `avatar`: File

**Response:**
```json
{
  "avatarUrl": "string"
}
```

---

#### `POST /api/subscriptions`
Create or update subscription.

**Request Body:**
```json
{
  "amount": number,
  "billingCycle": "monthly" | "annual"
}
```

**Response:**
```json
{
  "subscription": {
    "id": "string",
    "status": "active",
    "amount": number,
    "billingCycle": "string",
    "nextBillingDate": "ISO date"
  },
  "paymentUrl": "string"    // Redirect URL for payment processor
}
```

---

#### `GET /api/subscriptions`
Get current subscription details.

---

#### `DELETE /api/subscriptions`
Cancel subscription.

---

## Settings View

### UI Components Displayed

1. **Header**
   - Title: "Settings"
   - Subtitle: "Customize your trading journal"

2. **Profile Section**
   - Display Name input
   - Email input
   - "Update Profile" button

3. **Preferences Section**
   - Dark Mode toggle switch
   - Currency select (USD, EUR, GBP)
   - Timezone select (UTC, EST, PST, CET)

4. **Notifications Section**
   - Trade Reminders toggle
   - Weekly Report toggle
   - Goal Alerts toggle

5. **Data Management Section**
   - Export Data button (download as CSV)
   - Delete All Data button (destructive)

### Data Required

```typescript
{
  user: {
    name: string;
    email: string;
    preferences: {
      darkMode: boolean;
      currency: string;
      timezone: string;
      notifications: {
        tradeReminders: boolean;
        weeklyReport: boolean;
        goalAlerts: boolean;
      };
    };
  };
}
```

### Required APIs

#### `PUT /api/user/preferences`
Update user preferences.

**Request Body:**
```json
{
  "darkMode": boolean,
  "currency": "USD" | "EUR" | "GBP",
  "timezone": "string"
}
```

---

#### `PUT /api/user/notifications`
Update notification preferences.

**Request Body:**
```json
{
  "tradeReminders": boolean,
  "weeklyReport": boolean,
  "goalAlerts": boolean
}
```

---

#### `GET /api/export/trades`
Export all trades as CSV.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `accountId` | string | Filter by account (optional) |
| `format` | 'csv' \| 'json' | Export format |

**Response:** File download

---

#### `DELETE /api/user/data`
Delete all user data (trades, accounts, goals, rules).

**Request Body:**
```json
{
  "confirmPassword": "string"
}
```

---

## Shared Components

### DateRangeFilter
Used in: Dashboard, Trade Log, Analytics

**Presets:**
- Last 30 Days
- Last 60 Days
- Last 90 Days
- Custom (date picker)

### AccountFilter
Used in: Dashboard, Trade Log

Dropdown to filter by trading account or show "All Accounts".

### AddTradeModal
Modal form for creating/editing trades with fields organized into:
1. **Core Trade Details**: Symbol, Direction, Entry/Exit prices, Position size, Net P&L
2. **Trade Context**: Strategy, Session, Market condition
3. **Analysis**: News/Events, Mistakes, Key lessons
4. **Visual Evidence**: Image uploads with timeframes and descriptions

### ImportTradesModal
Modal for bulk importing trades from CSV files.

### Saved Options API

For autocomplete functionality in trade entry forms:

#### `GET /api/options`
Get all saved options for smart inputs.

**Response:**
```json
{
  "symbols": ["EURUSD", "GBPUSD", ...],
  "strategies": ["Breakout", "Pullback", ...],
  "sessions": ["London", "New York", ...],
  "marketConditions": ["Trending", "Ranging", ...],
  "newsEvents": ["NFP", "FOMC", ...],
  "mistakes": ["FOMO", "Overtrading", ...],
  "lessons": ["Wait for confirmation", ...],
  "timeframes": ["1H", "4H", "Daily", ...]
}
```

---

#### `POST /api/options/:category`
Add a new option to a category.

**Request Body:**
```json
{
  "value": "string"
}
```

---

## API Endpoints Summary

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/verify-email` | Verify email with OTP |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List all accounts |
| POST | `/api/accounts` | Create account |
| PUT | `/api/accounts/:id` | Update account |
| PATCH | `/api/accounts/:id/status` | Update status only |
| DELETE | `/api/accounts/:id` | Delete account |

### Trades
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trades` | List trades (with filters) |
| POST | `/api/trades` | Create trade |
| PUT | `/api/trades/:id` | Update trade |
| PATCH | `/api/trades/:id/close` | Close open trade |
| DELETE | `/api/trades/:id` | Delete trade |
| POST | `/api/trades/import` | Bulk import trades |
| POST | `/api/trades/:id/images` | Upload trade images |
| DELETE | `/api/trades/:id/images/:imageId` | Delete trade image |

### Statistics & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get portfolio stats |
| GET | `/api/stats/daily` | Get daily P&L data |
| GET | `/api/analytics/hourly` | Hourly performance |
| GET | `/api/analytics/daily-win-rate` | Daily win rate |
| GET | `/api/analytics/symbol-distribution` | Symbol distribution |
| GET | `/api/analytics/strategy-distribution` | Strategy distribution |
| GET | `/api/analytics/duration` | Trade duration stats |

### Goals & Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals` | List goals |
| PUT | `/api/goals/:id` | Update goal |
| GET | `/api/rules` | List rules |
| POST | `/api/rules` | Create rule |
| PUT | `/api/rules/:id` | Update rule |
| PATCH | `/api/rules/:id/toggle` | Toggle rule completion |
| DELETE | `/api/rules/:id` | Delete rule |

### User & Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/user/profile` | Update profile |
| POST | `/api/user/avatar` | Upload avatar |
| PUT | `/api/user/preferences` | Update preferences |
| PUT | `/api/user/notifications` | Update notifications |
| DELETE | `/api/user/data` | Delete all user data |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions` | Get subscription |
| POST | `/api/subscriptions` | Create/update subscription |
| DELETE | `/api/subscriptions` | Cancel subscription |

### Saved Options
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/options` | Get all saved options |
| POST | `/api/options/:category` | Add new option |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/trades` | Export trades as CSV/JSON |

---

## Notes for Backend Development

1. **Authentication**: All `/api/*` endpoints (except auth) require authentication via JWT token in the Authorization header.

2. **User Isolation**: All data operations must be scoped to the authenticated user's ID.

3. **Date Handling**: All dates should be stored in UTC and returned in ISO 8601 format.

4. **Pagination**: List endpoints should support pagination with `page` and `limit` query parameters.

5. **Error Responses**: Use consistent error format:
   ```json
   {
     "error": {
       "code": "ERROR_CODE",
       "message": "Human readable message"
     }
   }
   ```

6. **File Uploads**: Use presigned URLs or direct upload to cloud storage (S3, Cloudinary, etc.).

7. **Real-time Updates**: Consider WebSocket support for live trade updates and notifications.

8. **Rate Limiting**: Implement rate limiting on authentication and import endpoints.

---

*Document Version: 1.0*
*Last Updated: December 2024*
