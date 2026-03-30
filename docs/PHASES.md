# Agent Governance System - Phase Documentation

## Phase 1: Instruction Registry + Learning Schema ✅

### What it includes:
- **Registry JSON Schema** (`config/registry-schema.json`) - Full specification for instruction metadata
- **Learning Journal Schema** (`config/learning-schema.json`) - Immutable log format (JSON-lines)
- **Bootstrap Registry** (`config/registry-bootstrap.json`) - Pre-loaded with 3 critical instructions

### Key components:

**Instructions Registry** stores:
- Instruction metadata (title, description, category, platforms)
- Versioning (semantic versioning with change history)
- Review schedule (14-day default with configurable intervals)
- Status tracking (active, deprecated, archived, in-review)
- Approved learnings that led to changes

**Learning Journal** logs:
- Agent name, timestamp, task ID
- Success/failure + error details
- Insight description + confidence level
- Affected instruction
- Optional metrics (performance data)

### Initialization:
```bash
agent-sync --init
# Creates ~/.config/ai-agents/registry.json with bootstrap data
```

---

## Phase 2: Agent-Sync CLI Tool ✅

### Main commands:

#### `agent-sync --init`
Initialize fresh registry with bootstrap instructions
```bash
agent-sync --init
```

#### `agent-sync --review-stale`
Find instructions past their review date
```bash
agent-sync --review-stale
# Output: ⚠️ database-access (last reviewed 2026-03-30, due 2026-04-13)
```

#### `agent-sync --aggregate-learnings`
Scan all agent logs and parse learnings
```bash
agent-sync --aggregate-learnings
# Counts learnings per agent, identifies consensus patterns
```

#### `agent-sync --update-instructions`
Apply approved learnings to instructions
```bash
agent-sync --update-instructions
# Updates versions, refreshes review dates, records changes
```

#### `agent-sync --rollback`
Revert to previous instruction version
```bash
agent-sync --rollback --instruction database-access --version 1.0.0
```

#### `agent-sync --stats`
Show voting & learning statistics
```bash
agent-sync --stats
# Total instructions, approvals, voting velocity, per-agent contribution
```

### Voting Logic:
- Learnings require **majority consensus** (3+ out of 5 agents) to be approved
- Each agent votes independently via `agent-log-result`
- Approved learnings get recorded in instruction change_log

---

## Phase 3: Learning Capture Integration ✅

### `agent-log-result` utility

Log outcomes from any task and propose improvements:

```bash
# Agent discovers optimization
agent-log-result \
  --task "import-leads" \
  --success \
  --insight "batch_size_100_faster_than_1000" \
  --confidence 0.95 \
  --affected-instruction "database-access"

# Logs to ~/.AGENT_NAME/learnings.log (JSON-lines format)
# Output: ✅ Learning logged for codex
#         Task: import-leads
#         Insight: batch_size_100_faster_than_1000
#         Confidence: 95%
```

### `agent-suggest-improvements` utility

Formally propose instruction changes:

```bash
agent-suggest-improvements \
  --instruction database-access \
  --title "Use connection pooling for batch queries" \
  --rationale "Codex benchmarks show 40% faster execution with pooling" \
  --platform codex \
  --priority high

# Creates learning entry in registry with status='pending'
# Awaits votes from all 5 agents
```

### Integration Template (for agents)

Add this to each agent's SKILLS.md or equivalent:

```markdown
## Recording Learnings

When you complete a task successfully, record what you learned:

1. **Log the result:**
   agent-log-result --task "my-task" --success \
     --insight "discovery" --confidence 0.9 \
     --affected-instruction "relevant-instruction"

2. **Propose improvements** (if significant):
   agent-suggest-improvements \
     --instruction "target-instr" \
     --title "Proposed change" \
     --rationale "Why it improves performance" \
     --priority high

3. **Wait for consensus:**
   Other agents review and vote. Majority approval triggers instruction update.
```

---

## Phase 4: Automated Review & Updates ✅

### Systemd Timer Setup (Linux)

**Service unit** (`config/agent-governance.service`):
```ini
[Unit]
Description=AI Agent Governance Sync Service
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/agent-sync --aggregate-learnings
ExecStart=/usr/local/bin/agent-sync --update-instructions
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Timer unit** (`config/agent-governance.timer`):
```ini
[Unit]
Description=Weekly AI Agent Governance Sync

[Timer]
# Run every Sunday at 02:00 UTC
OnCalendar=Sun *-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

### Installation:

```bash
# Copy units
sudo cp config/agent-governance.service /etc/systemd/system/
sudo cp config/agent-governance.timer /etc/systemd/system/

# Enable and start
sudo systemctl enable agent-governance.timer
sudo systemctl start agent-governance.timer

# Verify
sudo systemctl status agent-governance.timer
sudo systemctl list-timers agent-governance.timer
```

### Manual Sync (anytime):
```bash
agent-sync --aggregate-learnings
agent-sync --update-instructions
```

### Logs:
```bash
# View systemd journal
sudo journalctl -u agent-governance.service -f

# Last 10 runs
sudo journalctl -u agent-governance.service --lines 10
```

### Deployment Considerations:
- Timer runs automatically every Sunday at 02:00 UTC
- Non-blocking (service type oneshot)
- Logs to journalctl for audit trail
- Can be run manually on any agent platform

---

## Phase 5: Web Dashboard 🔲

### Planned Features:

**Backend API** (Express.js, `dashboard/server.js`):
```javascript
GET  /api/instructions           # List all instructions
GET  /api/instructions/:id       # Get instruction details
GET  /api/learnings              # List recent learnings
GET  /api/learnings/:id          # Get learning with votes
GET  /api/stats                  # Voting statistics
POST /api/learnings/:id/vote     # Record vote (internal)
GET  /api/timeline/:instrId      # Version history timeline
```

**Frontend Views** (React, `dashboard/public/`):
1. **Learnings Feed** — Real-time stream of discoveries
2. **Voting Board** — Pending learnings with agent votes
3. **Instruction Timeline** — Visual version history with rollback
4. **Conflicts Panel** — Highlight contradicting learnings
5. **Agent Stats** — Per-agent contribution metrics

### Installation:
```bash
cd dashboard
npm install
npm start

# Open http://localhost:3000
```

### Features:
- Live-updating learnings stream (polling or WebSocket)
- One-click voting on pending improvements
- Visual instruction changelog with diffs
- Rollback button with confirmation
- Agent leaderboard (most productive learners)

---

## Integration Example: Weekly Cycle

### Day 1 (Monday): Agent discovers optimization
```bash
# Codex: Discovers Docker exec is 40% faster than SSH
agent-log-result --task "database-query" --success \
  --insight "docker_exec_40_percent_faster_than_ssh" \
  --confidence 0.92 \
  --affected-instruction "database-access"
```

### Day 2-6 (Tue-Sat): Other agents vote
```bash
# Gemini: Confirms finding
agent-log-result --task "database-query" --success \
  --insight "confirmed_docker_exec_40_percent_faster" \
  --confidence 0.95 \
  --affected-instruction "database-access"

# (Claude, Copilot, Paperclip repeat similarly)
```

### Day 7 (Sunday 02:00 UTC): Automated sync runs
```bash
systemd timer triggers:
  1. agent-sync --aggregate-learnings
     → Scans all learnings, detects 5-agent consensus
  2. agent-sync --update-instructions
     → Updates database-access instruction with new guidance
     → Bumps version 1.0.0 → 1.0.1
     → Records change in changelog with 5 agent votes
```

### Day 7 (After sync): All agents load updated instructions
- Next time each agent starts, it reads updated AGENTS.md
- Database-access section now includes Docker exec recommendation
- Cycle repeats for new learnings

---

## File Structure

```
registry.json:
├─ instructions
│  ├─ database-access v1.0.1
│  ├─ email-with-attachments v1.0.0
│  └─ mcp-architecture v1.0.0
└─ learnings [APPROVED]
   ├─ learning-001: docker_exec_40_percent_faster (5 votes)
   ├─ learning-002: connection_pooling_useful (pending)
   └─ learning-003: gws_cli_more_reliable_than_gmail_mcp (approved, 4 votes)

Agent logs (~/.AGENT_NAME/learnings.log):
├─ ~/.gemini/learnings.log
├─ ~/.claude/learnings.log
├─ ~/.codex/learnings.log
├─ ~/.copilot/learnings.log
└─ ~/.paperclip/learnings.log
```

---

## Security & Audit

✅ All learnings are immutable (append-only logs)  
✅ Voting records preserved in registry  
✅ Version history prevents silent changes  
✅ Rollback capability requires consensus review  
✅ Systemd logs provide audit trail  

---

## Next Steps

1. **Phase 1**: ✅ Schemas + bootstrap complete
2. **Phase 2**: ✅ CLI tools built and tested
3. **Phase 3**: ✅ Learning integration utilities
4. **Phase 4**: ✅ Systemd automation templates
5. **Phase 5**: 🔲 Dashboard UI (Express + React)
6. **GitHub**: 🔲 Repository creation + push

Ready to deploy!
