-- One club per deployment (id is always 1). Money is integer cents. Times are UTC unix seconds.
CREATE TABLE club (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  code_on INTEGER NOT NULL DEFAULT 1,
  need_approval INTEGER NOT NULL DEFAULT 0,
  season INTEGER NOT NULL DEFAULT 1,
  settings TEXT NOT NULL DEFAULT '{}',
  created INTEGER NOT NULL
);
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','removed')),
  created INTEGER NOT NULL
);
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,           -- HMAC of the cookie value, never the raw cookie
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE TABLE invites (token TEXT PRIMARY KEY, used_by INTEGER, created INTEGER NOT NULL);
CREATE TABLE portfolios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- NULL = the class portfolio
  season INTEGER NOT NULL,
  cash_cents INTEGER NOT NULL,
  start_cents INTEGER NOT NULL
);
CREATE TABLE positions (
  portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  shares REAL NOT NULL,
  cost_cents INTEGER NOT NULL,      -- total cost basis; average cost = cost_cents / shares
  PRIMARY KEY (portfolio_id, symbol)
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  request_id INTEGER,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  shares REAL NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('market','limit')),
  limit_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','filled','cancelled','rejected')),
  fill_cents INTEGER,
  note TEXT,
  created INTEGER NOT NULL,
  filled INTEGER
);
CREATE INDEX orders_open ON orders(status);
CREATE TABLE requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  shares REAL,                      -- either shares ...
  amount_cents INTEGER,             -- ... or a dollar amount
  type TEXT NOT NULL CHECK (type IN ('market','limit')),
  limit_cents INTEGER,
  thesis TEXT NOT NULL,
  risk TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved','rejected','executed','expired')),
  decided_by INTEGER,
  note TEXT,
  created INTEGER NOT NULL,
  vote_ends INTEGER,                -- NULL in admin-approval mode
  expires INTEGER NOT NULL,
  fill_cents INTEGER,
  executed INTEGER
);
CREATE TABLE votes (
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  value INTEGER NOT NULL CHECK (value IN (-1,1)),
  PRIMARY KEY (request_id, user_id)
);
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE TABLE snapshots (
  portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  day TEXT NOT NULL,                -- YYYY-MM-DD in New York time
  equity_cents INTEGER NOT NULL,
  spy_cents INTEGER,
  PRIMARY KEY (portfolio_id, day)
);
CREATE TABLE activity (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, season INTEGER NOT NULL, text TEXT NOT NULL);
