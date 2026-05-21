const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3456;

const DATA_DIR  = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'portfolio.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');

// ── Bootstrap ────────────────────────────────────────────────────────────────

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Persistent JWT secret — env var takes priority (for Vercel), then file, then random
let JWT_SECRET;
if (process.env.JWT_SECRET) {
  JWT_SECRET = process.env.JWT_SECRET;
} else if (fs.existsSync(SECRET_FILE)) {
  JWT_SECRET = fs.readFileSync(SECRET_FILE, 'utf8').trim();
} else {
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  try { fs.writeFileSync(SECRET_FILE, JWT_SECRET); } catch { /* read-only env */ }
}

// Default admin credentials (created once, skipped silently on read-only filesystems)
if (!fs.existsSync(ADMIN_FILE)) {
  const passwordHash = bcrypt.hashSync('Admin@123', 10);
  try {
    fs.writeFileSync(ADMIN_FILE, JSON.stringify({ email: 'kumawatamit28@gmail.com', passwordHash }, null, 2));
    console.log('\n  Admin account created:');
    console.log('  Email   : kumawatamit28@gmail.com');
    console.log('  Password: Admin@123');
    console.log('  (change these in /admin → Settings)\n');
  } catch { /* read-only env — CMS auth unavailable */ }
}

// Seed portfolio data from defaults if missing
if (!fs.existsSync(DATA_FILE)) {
  const defaultPath = path.join(DATA_DIR, 'default-portfolio.json');
  if (fs.existsSync(defaultPath)) {
    try { fs.copyFileSync(defaultPath, DATA_FILE); } catch { /* read-only env */ }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const readData  = () => {
  if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'default-portfolio.json'), 'utf8'));
};
const writeData = (d) => {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { throw new Error('Data persistence is not available in this environment. Run the CMS locally.'); }
};
const readAdmin = () => {
  if (fs.existsSync(ADMIN_FILE)) return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
  return null;
};

const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' });
  }
};

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '4mb' }));

// ── Auth routes ───────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const admin = readAdmin();
  if (!admin) return res.status(503).json({ error: 'CMS not available in this environment.' });
  if (email !== admin.email || !bcrypt.compareSync(password, admin.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, email });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const admin = readAdmin();
  if (!bcrypt.compareSync(currentPassword, admin.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  admin.passwordHash = bcrypt.hashSync(newPassword, 10);
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
  res.json({ ok: true });
});

app.post('/api/auth/change-email', requireAuth, (req, res) => {
  const { newEmail, password } = req.body || {};
  if (!newEmail || !password) return res.status(400).json({ error: 'New email and password required' });

  const admin = readAdmin();
  if (!bcrypt.compareSync(password, admin.passwordHash)) {
    return res.status(401).json({ error: 'Password incorrect' });
  }

  admin.email = newEmail;
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
  res.json({ ok: true });
});

// ── CMS data routes ───────────────────────────────────────────────────────────

app.get('/api/cms/data', requireAuth, (req, res) => res.json(readData()));

app.put('/api/cms/data', requireAuth, (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid payload' });
  try { writeData(req.body); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

// Granular section endpoints
app.put('/api/cms/identity', requireAuth, (req, res) => {
  try { const d = readData(); d.identity = { ...d.identity, ...req.body }; writeData(d); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

app.put('/api/cms/suggestions', requireAuth, (req, res) => {
  try { const d = readData(); d.suggestions = req.body; writeData(d); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

app.put('/api/cms/conversations', requireAuth, (req, res) => {
  try { const d = readData(); d.conversations = req.body; writeData(d); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

app.put('/api/cms/projects', requireAuth, (req, res) => {
  try { const d = readData(); d.projects = req.body; writeData(d); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

app.put('/api/cms/responses', requireAuth, (req, res) => {
  try { const d = readData(); d.responses = req.body; writeData(d); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

// ── Dynamic data.js (replaces static file) ───────────────────────────────────

app.get('/data.js', (req, res) => {
  const data = readData();
  res.type('application/javascript');
  res.send(`window.PORTFOLIO_DATA = ${JSON.stringify(data)};`);
});

// ── Admin panel ───────────────────────────────────────────────────────────────

app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/admin/', (_req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

// ── Static files (data.js route above takes priority) ────────────────────────

app.use(express.static(__dirname, { index: 'Portfolio.html' }));

// ── Start ─────────────────────────────────────────────────────────────────────

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Portfolio  →  http://localhost:${PORT}`);
    console.log(`  Admin CMS  →  http://localhost:${PORT}/admin\n`);
  });
}

module.exports = app;
