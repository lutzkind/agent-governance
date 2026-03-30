#!/usr/bin/env node

/**
 * AI Agent Governance Dashboard Server
 * 
 * Express.js API for registry, learnings, voting, and stats
 * Serves React frontend on /
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const CONFIG_DIR = path.join(os.homedir(), '.config', 'ai-agents');
const REGISTRY_PATH = path.join(CONFIG_DIR, 'registry.json');
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Load registry
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return { instructions: [], learnings: [] };
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

// Helper: Save registry
function saveRegistry(data) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2));
}

// ========== API Routes ==========

// Get all instructions
app.get('/api/instructions', (req, res) => {
  const registry = loadRegistry();
  res.json(registry.instructions || []);
});

// Get single instruction
app.get('/api/instructions/:id', (req, res) => {
  const registry = loadRegistry();
  const instr = (registry.instructions || []).find(i => i.id === req.params.id);
  if (!instr) return res.status(404).json({ error: 'Not found' });
  res.json(instr);
});

// Get all learnings
app.get('/api/learnings', (req, res) => {
  const registry = loadRegistry();
  const learnings = registry.learnings || [];
  
  // Optional filtering
  const status = req.query.status; // pending, approved, rejected
  const instrId = req.query.instruction;
  
  let filtered = learnings;
  if (status) filtered = filtered.filter(l => l.status === status);
  if (instrId) filtered = filtered.filter(l => l.affects_instruction === instrId);
  
  // Sort by date (newest first)
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
  const { agent, vote } = req.body; // vote: 'approve', 'reject', 'abstain'
  
  if (!agent || !vote) {
    return res.status(400).json({ error: 'Missing agent or vote' });
  }
  
  const registry = loadRegistry();
  const learning = (registry.learnings || []).find(l => l.id === req.params.id);
  if (!learning) return res.status(404).json({ error: 'Not found' });
  
  // Record vote
  if (!learning.votes) learning.votes = {};
  learning.votes[agent] = vote;
  
  // Check if we reached majority consensus (3+ approvals)
  const approvals = Object.values(learning.votes).filter(v => v === 'approve').length;
  if (approvals >= 3) {
    learning.status = 'approved';
  }
  
  saveRegistry(registry);
  res.json(learning);
});

// Get statistics
app.get('/api/stats', (req, res) => {
  const registry = loadRegistry();
  const instructions = registry.instructions || [];
  const learnings = registry.learnings || [];
  
  const stats = {
    total_instructions: instructions.length,
    total_learnings: learnings.length,
    learnings_pending: learnings.filter(l => l.status === 'pending').length,
    learnings_approved: learnings.filter(l => l.status === 'approved').length,
    learnings_rejected: learnings.filter(l => l.status === 'rejected').length,
    agent_contributions: {},
    voting_velocity: learnings.filter(l => l.status === 'approved').length,
    last_updated: new Date().toISOString()
  };
  
  // Count per-agent learnings
  learnings.forEach(l => {
    const agent = l.origin_agent || 'unknown';
    if (!stats.agent_contributions[agent]) {
      stats.agent_contributions[agent] = 0;
    }
    stats.agent_contributions[agent]++;
  });
  
  res.json(stats);
});

// Get instruction version timeline
app.get('/api/timeline/:instrId', (req, res) => {
  const registry = loadRegistry();
  const instr = (registry.instructions || []).find(i => i.id === req.params.instrId);
  if (!instr) return res.status(404).json({ error: 'Not found' });
  
  // Return version history and related learnings
  const timeline = {
    instruction: instr.id,
    versions: instr.versions || [],
    changes: instr.changelog || [],
    related_learnings: (registry.learnings || [])
      .filter(l => l.affects_instruction === instr.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  };
  
  res.json(timeline);
});

// Rollback instruction to previous version
app.post('/api/instructions/:id/rollback', (req, res) => {
  const { targetVersion } = req.body;
  
  const registry = loadRegistry();
  const instr = (registry.instructions || []).find(i => i.id === req.params.id);
  if (!instr) return res.status(404).json({ error: 'Instruction not found' });
  
  if (!instr.versions || !instr.versions[targetVersion]) {
    return res.status(400).json({ error: 'Version not found' });
  }
  
  // Revert content
  const target = instr.versions[targetVersion];
  instr.content = target.content;
  
  // Record rollback in changelog
  if (!instr.changelog) instr.changelog = [];
  instr.changelog.push({
    type: 'rollback',
    from_version: instr.version,
    to_version: targetVersion,
    date: new Date().toISOString(),
    reason: 'Manual rollback via dashboard'
  });
  
  instr.version = targetVersion;
  
  saveRegistry(registry);
  res.json({ success: true, instruction: instr });
});

// Get global agent instruction files
app.get('/api/global-instructions', (req, res) => {
  const files = [
    { agent: 'Claude', file: path.join(os.homedir(), '.claude', 'CLAUDE.md') },
    { agent: 'Gemini', file: path.join(os.homedir(), '.gemini', 'GEMINI.md') },
    { agent: 'Codex', file: '/root/AGENTS.md' },
  ];

  const result = files.map(f => ({
    agent: f.agent,
    path: f.file,
    content: fs.existsSync(f.file) ? fs.readFileSync(f.file, 'utf8') : null
  }));

  res.json(result);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    registry_exists: fs.existsSync(REGISTRY_PATH),
    timestamp: new Date().toISOString()
  });
});

// Default route: serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  AI Agent Governance Dashboard         ║
╚════════════════════════════════════════╝

Server running on http://localhost:${PORT}

API Endpoints:
  GET    /api/instructions
  GET    /api/instructions/:id
  GET    /api/learnings
  GET    /api/learnings/:id
  POST   /api/learnings/:id/vote
  GET    /api/stats
  GET    /api/timeline/:instrId
  POST   /api/instructions/:id/rollback
  GET    /api/health

Registry: ${REGISTRY_PATH}

Press Ctrl+C to stop.
`);
});

process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
