/* ============================ SEED ============================ */
const localISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const todayISO = () => localISO(new Date());
export const daysFromNow = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return localISO(x); };
export const daysAgo = (d) => daysFromNow(-d);

export function seed() {
  return {
    profiles: [
      { id: "p1", name: "Personal", type: "personal", icon: "wallet" },
      { id: "p2", name: "Business", type: "business", icon: "building" },
    ],
    active: "p1",
    firstRun: true,
    data: {
      p1: {
        accounts: [
          { id: "a1", name: "BCA Tahapan", provider: "BCA", kind: "asset", opening: 12500000 },
          { id: "a2", name: "Jenius", provider: "Jenius", kind: "asset", opening: 4200000 },
          { id: "a3", name: "GoPay", provider: "GoPay", kind: "asset", opening: 850000 },
          { id: "a4", name: "Cash Wallet", provider: "Cash", kind: "asset", opening: 350000 },
          { id: "a5", name: "Bibit", provider: "Bibit", kind: "asset", opening: 0 },
          { id: "a6", name: "Pluang", provider: "Pluang", kind: "asset", opening: 0 },
          { id: "a7", name: "Binance", provider: "Binance", kind: "asset", opening: 0 },
          { id: "a8", name: "BCA Credit Card", provider: "BCA", kind: "liability", opening: 3850000 },
          { id: "a9", name: "ShopeePay Later", provider: "Shopee", kind: "liability", opening: 0 },
          { id: "a10", name: "ShopeePay", provider: "Shopee", kind: "asset", opening: 0 },
        ],
        budgets: [
          { id: "b1", cat: "Food", monthly: 3000000 },
          { id: "b2", cat: "Transport", monthly: 800000 },
          { id: "b3", cat: "Shopping", monthly: 2000000 },
          { id: "b4", cat: "Bills", monthly: 2500000 },
          { id: "b5", cat: "Entertainment", monthly: 600000 },
        ],
        goals: [
          { id: "g1", name: "Emergency fund", target: 100000000, deadline: "2026-12-31", kind: "save", linkedAccounts: ["Bibit"] },
          { id: "g2", name: "Apartment down payment", target: 250000000, deadline: "2027-06-30", kind: "save", linkedAccounts: ["Pluang", "Bibit"] },
          { id: "g3", name: "Pay off credit card", target: 3850000, deadline: "2026-08-31", kind: "debt", linkedAccounts: ["BCA Credit Card"] },
        ],
        categories: [
          { name: "Food", type: "expense" }, { name: "Transport", type: "expense" }, { name: "Bills", type: "expense" },
          { name: "Shopping", type: "expense" }, { name: "Subscriptions", type: "expense" }, { name: "Health", type: "expense" },
          { name: "Entertainment", type: "expense" }, { name: "Freelance", type: "income" }, { name: "Salary", type: "income" },
          { name: "AdSense", type: "income" }, { name: "Investment", type: "income" }, { name: "Gift", type: "income" }, { name: "Refund", type: "income" },
        ],
        transactions: [
          { id: "t1", type: "income", amount: 12000000, cat: "Freelance", acct: "BCA Tahapan", note: "Client project payment", date: daysAgo(2) },
          { id: "t2", type: "expense", amount: 285000, cat: "Food", acct: "GoPay", note: "GoFood dinner", date: daysAgo(1) },
          { id: "t3", type: "expense", amount: 1500000, cat: "Bills", acct: "BCA Tahapan", note: "Apartment rent share", date: daysAgo(3), recurring: "monthly" },
          { id: "t4", type: "expense", amount: 54990, cat: "Subscriptions", acct: "Jenius", note: "Spotify Premium", date: daysAgo(5) },
          { id: "t5", type: "income", amount: 3200000, cat: "AdSense", acct: "BCA Tahapan", note: "Ad revenue payout", date: daysAgo(8), recurring: "monthly" },
          { id: "t6", type: "expense", amount: 175000, cat: "Transport", acct: "GoPay", note: "Grab rides", date: daysAgo(6) },
          { id: "t7", type: "transfer", amount: 2000000, cat: "Transfer", acct: "BCA Tahapan", toAcct: "Jenius", note: "Top up Jenius", date: daysAgo(4) },
          { id: "t8", type: "expense", amount: 420000, cat: "Food", acct: "BCA Tahapan", note: "Groceries Superindo", date: daysAgo(7) },
          { id: "t9", type: "expense", amount: 95000, cat: "Food", acct: "GoPay", note: "Lunch", date: daysAgo(9) },
        ],
        subscriptions: [
          { id: "s1", merchant: "Spotify", amount: 54990, cycle: "monthly", next: daysFromNow(2), acct: "Jenius" },
          { id: "s2", merchant: "Netflix", amount: 186000, cycle: "monthly", next: daysFromNow(11), acct: "BCA Tahapan" },
          { id: "s3", merchant: "ChatGPT Plus", amount: 325000, cycle: "monthly", next: daysFromNow(18), acct: "Jenius" },
        ],
        holdings: [
          { id: "h1", platform: "Stockbit", ticker: "BBCA", type: "stock",       qty: 100,  avg: 9500,   price: 10200,  ccy: "IDR" },
          { id: "h2", platform: "Stockbit", ticker: "BREN", type: "stock",       qty: 200,  avg: 8900,   price: 7400,   ccy: "IDR" },
          { id: "h3", platform: "Bybit",    ticker: "BTC",  type: "crypto",      qty: 0.05, avg: 42000,  price: 95000,  ccy: "USD" },
          { id: "h4", platform: "Bybit",    ticker: "ETH",  type: "crypto",      qty: 1.2,  avg: 2800,   price: 3400,   ccy: "USD" },
          { id: "h5", platform: "Pluang",   ticker: "AAPL", type: "stock",       qty: 0.5,  avg: 155,    price: 210,    ccy: "USD" },
          { id: "h6", platform: "Pluang",   ticker: "GOLD", type: "gold",        qty: 3,    avg: 820000, price: 930000, ccy: "IDR" },
          { id: "h7", platform: "Bibit",    ticker: "RDPU", type: "mutual_fund", qty: 1500, avg: 1840,   price: 1968,   ccy: "IDR" },
          { id: "h8", platform: "Bibit",    ticker: "RDSH", type: "mutual_fund", qty: 800,  avg: 2150,   price: 2480,   ccy: "IDR" },
          { id: "h9", platform: "Binance",  ticker: "BNB",  type: "crypto",      qty: 0.8,  avg: 280,    price: 605,    ccy: "USD" },
          { id: "h10",platform: "Binance",  ticker: "SOL",  type: "crypto",      qty: 5,    avg: 25,     price: 165,    ccy: "USD" },
        ],
        investmentTransactions: [
          { id: "it1",  holdingId: "h1", type: "buy",      qty: 50,   price: 9300,  fees: 5000, date: daysAgo(180), note: "Initial position" },
          { id: "it2",  holdingId: "h1", type: "buy",      qty: 50,   price: 9700,  fees: 5000, date: daysAgo(60),  note: "Added on dip" },
          { id: "it3",  holdingId: "h2", type: "buy",      qty: 220,  price: 8900,  fees: 8000, date: daysAgo(150), note: "Initial position" },
          { id: "it4",  holdingId: "h2", type: "sell",     qty: 20,   price: 9500,  fees: 3000, date: daysAgo(40),  note: "Partial profit-take", realized: 9000 },
          { id: "it5",  holdingId: "h3", type: "buy",      qty: 0.05, price: 42000, fees: 0,    date: daysAgo(120), note: "DCA buy" },
          { id: "it6",  holdingId: "h4", type: "buy",      qty: 1.2,  price: 2800,  fees: 0,    date: daysAgo(100), note: "DCA buy" },
          { id: "it7",  holdingId: "h7", type: "buy",      qty: 1500, price: 1840,  fees: 0,    date: daysAgo(200), note: "Lump sum" },
          { id: "it8",  holdingId: "h7", type: "dividend", qty: 0,    price: 0,     fees: 0,    date: daysAgo(20),  note: "Distribution", realized: 35000 },
          { id: "it9",  holdingId: "h8", type: "buy",      qty: 800,  price: 2150,  fees: 0,    date: daysAgo(150), note: "Initial buy" },
          { id: "it10", holdingId: "h10",type: "buy",      qty: 5,    price: 25,    fees: 0,    date: daysAgo(220), note: "Early position" },
        ],
        history: [
          { m: "Jun", date: "2025-06-01", income: 8400000, expense: 5200000 },
          { m: "Jul", date: "2025-07-01", income: 7800000, expense: 6800000 },
          { m: "Aug", date: "2025-08-01", income: 11500000, expense: 7300000 },
          { m: "Sep", date: "2025-09-01", income: 9200000, expense: 5900000 },
          { m: "Oct", date: "2025-10-01", income: 13100000, expense: 8600000 },
          { m: "Nov", date: "2025-11-01", income: 8600000, expense: 4700000 },
          { m: "Dec", date: "2025-12-01", income: 9800000, expense: 6200000 },
          { m: "Jan", date: "2026-01-01", income: 11200000, expense: 7100000 },
          { m: "Feb", date: "2026-02-01", income: 8600000, expense: 5400000 },
          { m: "Mar", date: "2026-03-01", income: 14500000, expense: 8900000 },
          { m: "Apr", date: "2026-04-01", income: 10300000, expense: 6800000 },
          { m: "May", date: "2026-05-01", income: 15200000, expense: 2014990 },
        ],
      },
      p2: {
        accounts: [
          { id: "b1", name: "BCA Bisnis", provider: "BCA", kind: "asset", opening: 48000000 },
          { id: "b2", name: "BCA Savings", provider: "BCA", kind: "asset", opening: 22000000 },
          { id: "b3", name: "Kas Kecil", provider: "Cash", kind: "asset", opening: 2000000 },
          { id: "b4", name: "Kartu Kredit Bisnis", provider: "BCA", kind: "liability", opening: 8500000 },
        ],
        budgets: [
          { id: "bb1", cat: "Software", monthly: 5000000 },
          { id: "bb2", cat: "Marketing", monthly: 10000000 },
          { id: "bb3", cat: "Travel", monthly: 8000000 },
          { id: "bb4", cat: "Office", monthly: 3000000 },
        ],
        goals: [
          { id: "bg1", name: "Rainy day fund", target: 300000000, deadline: "2027-01-01", kind: "save", linkedAccounts: ["BCA Savings"] },
          { id: "bg2", name: "Pay off card", target: 8500000, deadline: "2026-09-30", kind: "debt", linkedAccounts: ["Kartu Kredit Bisnis"] },
        ],
        categories: [
          { name: "Revenue", type: "income" }, { name: "Client Payment", type: "income" },
          { name: "Grant", type: "income" }, { name: "Interest", type: "income" },
          { name: "Software", type: "expense" }, { name: "Marketing", type: "expense" },
          { name: "Travel", type: "expense" }, { name: "Salary", type: "expense" },
          { name: "Office", type: "expense" }, { name: "Taxes", type: "expense" },
          { name: "Equipment", type: "expense" }, { name: "Meals", type: "expense" },
        ],
        subscriptions: [
          { id: "bs1", merchant: "Vercel Pro",    amount: 240000,   cycle: "monthly", next: daysFromNow(12), acct: "Kartu Kredit Bisnis" },
          { id: "bs2", merchant: "Figma",         amount: 480000,   cycle: "monthly", next: daysFromNow(4),  acct: "Kartu Kredit Bisnis" },
          { id: "bs3", merchant: "Notion Team",   amount: 320000,   cycle: "monthly", next: daysFromNow(19), acct: "Kartu Kredit Bisnis" },
          { id: "bs4", merchant: "AWS",           amount: 2100000,  cycle: "monthly", next: daysFromNow(2),  acct: "BCA Bisnis" },
          { id: "bs5", merchant: "Slack",         amount: 410000,   cycle: "monthly", next: daysFromNow(27), acct: "Kartu Kredit Bisnis" },
          { id: "bs6", merchant: "GitHub Team",   amount: 550000,   cycle: "monthly", next: daysFromNow(14), acct: "Kartu Kredit Bisnis" },
        ],
        holdings: [],
        investmentTransactions: [],
        transactions: [
          { id: "bt1", type: "income",  amount: 45000000, cat: "Client Payment", acct: "BCA Bisnis",          note: "PT Maju Jaya — invoice #22", date: daysAgo(4) },
          { id: "bt2", type: "income",  amount: 28000000, cat: "Client Payment", acct: "BCA Bisnis",          note: "CV Kreasi — monthly retainer", date: daysAgo(8) },
          { id: "bt3", type: "expense", amount: 18500000, cat: "Salary",          acct: "BCA Bisnis",          note: "Payroll May — Ahmad",          date: daysAgo(3) },
          { id: "bt4", type: "expense", amount: 18500000, cat: "Salary",          acct: "BCA Bisnis",          note: "Payroll May — Desi",           date: daysAgo(3) },
          { id: "bt5", type: "expense", amount: 4200000,  cat: "Marketing",       acct: "Kartu Kredit Bisnis", note: "Google Ads May",               date: daysAgo(6) },
          { id: "bt6", type: "expense", amount: 2100000,  cat: "Software",        acct: "BCA Bisnis",          note: "AWS compute",                  date: daysAgo(2) },
          { id: "bt7", type: "expense", amount: 1850000,  cat: "Travel",          acct: "Kartu Kredit Bisnis", note: "Flight JKT–SBY client visit",  date: daysAgo(10) },
          { id: "bt8", type: "income",  amount: 12000000, cat: "Revenue",         acct: "BCA Bisnis",          note: "SaaS subscriptions May",       date: daysAgo(1) },
          { id: "bt9", type: "expense", amount: 3200000,  cat: "Office",          acct: "BCA Bisnis",          note: "Co-working May",               date: daysAgo(5) },
          { id: "bt10",type: "expense", amount: 890000,   cat: "Meals",           acct: "Kartu Kredit Bisnis", note: "Client lunch meeting",         date: daysAgo(9) },
        ],
        history: [
          { m: "Jan", date: "2026-01-01", income: 72000000, expense: 48000000 },
          { m: "Feb", date: "2026-02-01", income: 68000000, expense: 52000000 },
          { m: "Mar", date: "2026-03-01", income: 95000000, expense: 61000000 },
          { m: "Apr", date: "2026-04-01", income: 81000000, expense: 55000000 },
          { m: "May", date: "2026-05-01", income: 85000000, expense: 49040000 },
        ],
      },
    },
  };
}

const DEFAULT_CATEGORIES_PERSONAL = [
  { name: "Food", type: "expense" }, { name: "Transport", type: "expense" },
  { name: "Bills", type: "expense" }, { name: "Shopping", type: "expense" },
  { name: "Subscriptions", type: "expense" }, { name: "Health", type: "expense" },
  { name: "Entertainment", type: "expense" }, { name: "Salary", type: "income" },
  { name: "Freelance", type: "income" }, { name: "Investment", type: "income" },
  { name: "Gift", type: "income" }, { name: "Refund", type: "income" },
];

const DEFAULT_CATEGORIES_BUSINESS = [
  { name: "Revenue", type: "income" }, { name: "Client Payment", type: "income" },
  { name: "Interest", type: "income" }, { name: "Software", type: "expense" },
  { name: "Marketing", type: "expense" }, { name: "Travel", type: "expense" },
  { name: "Salary", type: "expense" }, { name: "Office", type: "expense" },
  { name: "Taxes", type: "expense" }, { name: "Equipment", type: "expense" },
];

const emptyProfile = (categories) => ({
  accounts: [],
  transactions: [],
  subscriptions: [],
  holdings: [],
  investmentTransactions: [],
  goals: [],
  budgets: [],
  history: [],
  categories,
});

export function blankState() {
  return {
    profiles: [
      { id: "p1", name: "Personal", type: "personal", icon: "wallet" },
      { id: "p2", name: "Business", type: "business", icon: "building" },
    ],
    active: "p1",
    firstRun: true,
    data: {
      p1: emptyProfile(DEFAULT_CATEGORIES_PERSONAL),
      p2: emptyProfile(DEFAULT_CATEGORIES_BUSINESS),
    },
  };
}
