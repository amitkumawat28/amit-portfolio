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
const writeData = async (d) => {
  // On Vercel: commit via GitHub API so changes persist across deploys
  if (process.env.VERCEL && process.env.GITHUB_TOKEN) {
    const repo    = process.env.GITHUB_REPO || 'amitkumawat28/amit-portfolio';
    const filePath = 'data/portfolio.json';
    const content  = Buffer.from(JSON.stringify(d, null, 2)).toString('base64');
    const headers  = {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    // Get current file SHA
    const getRes  = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, { headers });
    const getJson = await getRes.json();
    // Commit updated file
    const putRes  = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ message: 'Update portfolio data via CMS', content, sha: getJson.sha })
    });
    if (!putRes.ok) { const e = await putRes.json(); throw new Error(e.message || 'GitHub write failed'); }
    return;
  }
  // Local: write to file directly
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { throw new Error('Data persistence unavailable. Add GITHUB_TOKEN to Vercel env vars.'); }
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

app.put('/api/cms/data', requireAuth, async (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid payload' });
  try { await writeData(req.body); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

// Granular section endpoints
app.put('/api/cms/identity', requireAuth, async (req, res) => {
  try { const d = readData(); d.identity = { ...d.identity, ...req.body }; await writeData(d); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

app.put('/api/cms/suggestions', requireAuth, async (req, res) => {
  try { const d = readData(); d.suggestions = req.body; await writeData(d); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

app.put('/api/cms/conversations', requireAuth, async (req, res) => {
  try { const d = readData(); d.conversations = req.body; await writeData(d); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

app.put('/api/cms/projects', requireAuth, async (req, res) => {
  try { const d = readData(); d.projects = req.body; await writeData(d); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

app.put('/api/cms/responses', requireAuth, async (req, res) => {
  try { const d = readData(); d.responses = req.body; await writeData(d); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

// ── AI chat ───────────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI not configured. Add GEMINI_API_KEY to environment.' });

  const data = readData();
  const systemPrompt = `You are an AI assistant on ${data.identity.name}'s portfolio website. Answer questions about ${data.identity.name} based only on the portfolio information below. Be concise, friendly, and conversational. Use **bold** sparingly for emphasis. If asked something not in the data, say you don't have that info.

${JSON.stringify(data)}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.7 }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.write(`data: ${JSON.stringify({ error: `Gemini error ${geminiRes.status}: ${errText.slice(0, 200)}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const json = JSON.parse(raw);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
        } catch {}
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
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
