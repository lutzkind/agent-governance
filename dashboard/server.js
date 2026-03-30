#!/usr/bin/env node

/**
 * AI Agent Governance Dashboard Server
 *
 * Express.js API for registry, learnings, voting, and stats.
 * Session-less auth via HMAC-signed cookie.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const app = express();
const CONFIG_DIR = path.join(os.homedir(), '.config', 'ai-agents');
const REGISTRY_PATH = path.join(CONFIG_DIR, 'registry.json');
const PORT = process.env.PORT || 3000;
const DASHBOARD_USER = process.env.DASHBOARD_USER || 'lutzkind';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || 'changeme';
const SECRET = process.env.DASHBOARD_SECRET || crypto.randomBytes(32).toString('hex');

// ========== Helpers ==========

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return { instructions: {}, learnings: [] };
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function saveRegistry(data) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2));
}

function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie;
  if (!header) return out;
  header.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    out[k.trim()] = decodeURIComponent(v.join('='));
  });
  return out;
}

function signToken(user) {
  const payload = Buffer.from(JSON.stringify({ user, ts: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()); }
  catch { return null; }
}

function requireAuth(req, res, next) {
  if (verifyToken(parseCookies(req).auth)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/login');
}

// ========== Login page HTML ==========

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Governance — Login</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(0,212,255,0.2);
      border-radius: 12px;
      padding: 40px 48px;
      width: 100%;
      max-width: 380px;
      backdrop-filter: blur(10px);
    }
    h1 {
      font-size: 1.4em;
      background: linear-gradient(135deg, #00d4ff, #0099ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
      text-align: center;
    }
    .subtitle { color: #666; font-size: 0.85em; text-align:center; margin-bottom: 28px; }
    label { display: block; color: #aaa; font-size: 0.8em; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    input {
      width: 100%;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(0,212,255,0.2);
      border-radius: 6px;
      color: #fff;
      padding: 10px 14px;
      font-size: 0.95em;
      margin-bottom: 18px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus { border-color: #00d4ff; }
    button {
      width: 100%;
      background: linear-gradient(135deg, #00d4ff, #0099ff);
      border: none;
      color: #fff;
      padding: 12px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 0.95em;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.85; }
    .error {
      background: rgba(244,67,54,0.1);
      border: 1px solid rgba(244,67,54,0.3);
      color: #f44336;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 0.85em;
      margin-bottom: 18px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🤖 Agent Governance</h1>
    <p class="subtitle">Cross-agent consensus &amp; learning</p>
    {{ERROR}}
    <form method="POST" action="/login">
      <label>Username</label>
      <input type="text" name="username" autocomplete="username" autofocus>
      <label>Password</label>
      <input type="password" name="password" autocomplete="current-password">
      <button type="submit">Sign in</button>
    </form>
  </div>
</body>
</html>`;

// ========== Middleware ==========

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// ========== Unprotected Routes ==========

app.get('/login', (req, res) => {
  if (verifyToken(parseCookies(req).auth)) return res.redirect('/');
  res.send(LOGIN_HTML.replace('{{ERROR}}', ''));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === DASHBOARD_USER && password === DASHBOARD_PASS) {
    const token = signToken(username);
    res.setHeader('Set-Cookie', `auth=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`);
    return res.redirect('/');
  }
  res.status(401).send(LOGIN_HTML.replace('{{ERROR}}', '<div class="error">Invalid username or password</div>'));
});

app.get('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'auth=; HttpOnly; Path=/; Max-Age=0');
  res.redirect('/login');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', registry_exists: fs.existsSync(REGISTRY_PATH), timestamp: new Date().toISOString() });
});

// ========== Auth wall ==========

app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'public')));

// ========== Protected API Routes ==========

// Get all instructions (returns array, grouped by scope)
app.get('/api/instructions', (req, res) => {
  const registry = loadRegistry();
  const instructions = Object.values(registry.instructions || {});
  res.json(instructions);
});

// Get single instruction
app.get('/api/instructions/:id', (req, res) => {
  const registry = loadRegistry();
  const instr = (registry.instructions || {})[req.params.id];
  if (!instr) return res.status(404).json({ error: 'Not found' });
  res.json(instr);
});

// Get all learnings
app.get('/api/learnings', (req, res) => {
  const registry = loadRegistry();
  const learnings = registry.learnings || [];

  const { status, instruction } = req.query;
  let filtered = learnings;
  if (status) filtered = filtered.filter(l => l.status === status);
  if (instruction) filtered = filtered.filter(l => l.affects_instruction === instruction);
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(filtered);
});

// Get single learning
app.get('/api/learnings/:id', (req, res) => {
  const registry = loadRegistry();
  const learning = (registry.learnings || []).find(l => l.id === req.params.id);
  if (!learning) return res.status(404).json({ error: 'Not found' });
  res.json(learning);
});

// Vote on learning
app.post('/api/learnings/:id/vote', (req, res) => {
  const { agent, vote } = req.body;
  if (!agent || !vote) return res.status(400).json({ error: 'Missing agent or vote' });

  const registry = loadRegistry();
  const learning = (registry.learnings || []).find(l => l.id === req.params.id);
  if (!learning) return res.status(404).json({ error: 'Not found' });

  if (!learning.votes) learning.votes = {};
  learning.votes[agent] = vote;

  const approvals = Object.values(learning.votes).filter(v => v === 'approve').length;
  if (approvals >= 3) learning.status = 'approved';

  saveRegistry(registry);
  res.json(learning);
});

// Get statistics
app.get('/api/stats', (req, res) => {
  const registry = loadRegistry();
  const instructions = Object.values(registry.instructions || {});
  const learnings = registry.learnings || [];

  const stats = {
    total_instructions: instructions.length,
    global_instructions: instructions.filter(i => i.scope === 'global').length,
    agent_instructions: instructions.filter(i => i.scope === 'agent').length,
    total_learnings: learnings.length,
    learnings_pending: learnings.filter(l => l.status === 'pending').length,
    learnings_approved: learnings.filter(l => l.status === 'approved').length,
    learnings_rejected: learnings.filter(l => l.status === 'rejected').length,
    agent_contributions: {},
    last_updated: new Date().toISOString()
  };

  learnings.forEach(l => {
    const agent = l.origin_agent || 'unknown';
    stats.agent_contributions[agent] = (stats.agent_contributions[agent] || 0) + 1;
  });

  res.json(stats);
});

// Get instruction version timeline
app.get('/api/timeline/:instrId', (req, res) => {
  const registry = loadRegistry();
  const instr = (registry.instructions || {})[req.params.instrId];
  if (!instr) return res.status(404).json({ error: 'Not found' });

  res.json({
    instruction: instr.id,
    versions: instr.versions || [],
    changes: instr.changelog || [],
    related_learnings: (registry.learnings || [])
      .filter(l => l.affects_instruction === instr.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  });
});

// Rollback instruction
app.post('/api/instructions/:id/rollback', (req, res) => {
  const { targetVersion } = req.body;
  const registry = loadRegistry();
  const instr = (registry.instructions || {})[req.params.id];
  if (!instr) return res.status(404).json({ error: 'Instruction not found' });
  if (!instr.versions || !instr.versions[targetVersion]) return res.status(400).json({ error: 'Version not found' });

  instr.content = instr.versions[targetVersion].content;
  if (!instr.changelog) instr.changelog = [];
  instr.changelog.push({ type: 'rollback', from_version: instr.version, to_version: targetVersion, date: new Date().toISOString() });
  instr.version = targetVersion;

  saveRegistry(registry);
  res.json({ success: true, instruction: instr });
});

// Get global agent instruction files
app.get('/api/global-instructions', (req, res) => {
  const files = [
    { agent: 'Claude', file: path.join(os.homedir(), '.claude', 'CLAUDE.md') },
    { agent: 'Gemini', file: path.join(os.homedir(), '.gemini', 'GEMINI.md') },
    { agent: 'Codex',  file: '/root/AGENTS.md' },
    { agent: 'Copilot', file: '/root/.github/copilot-instructions.md' },
  ];

  res.json(files.map(f => ({
    agent: f.agent,
    path: f.file,
    content: fs.existsSync(f.file) ? fs.readFileSync(f.file, 'utf8') : null
  })));
});

// Default: serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== Start ==========

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  AI Agent Governance Dashboard         ║
╚════════════════════════════════════════╝

Server running on http://localhost:${PORT}
Auth: ${DASHBOARD_USER} / [password set via DASHBOARD_PASS env]

Registry: ${REGISTRY_PATH}
`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
