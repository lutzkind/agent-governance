# Agent Governance System

A distributed learning and cross-optimization framework for multi-agent AI systems. Enables agents across 5+ platforms to share insights, vote on instruction improvements, and continuously optimize through consensus-based governance.

## Features

✅ **Centralized Instruction Registry** — Version-controlled instructions with cross-platform metadata  
✅ **Learning Journal** — Immutable logs of agent insights and workarounds (JSON-lines format)  
✅ **Consensus Voting** — Majority-vote mechanism prevents single-platform dominance  
✅ **Automated Review Cycle** — Weekly reviews flag stale instructions for re-evaluation  
✅ **Instruction Updates** — Safe, versioned updates with automatic rollback  
✅ **Web Dashboard** — Visualize learnings, conflicts, and voting results in real-time  
✅ **Audit Trail** — Complete history of all decisions and their outcomes  

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ 5 AI Gateways (Gemini, Claude, Codex, Copilot, Paperclip)
└────────────────┬────────────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │ Learning Logs  │  (agent-log-result, agent-suggest-improvements)
         └───────┬────────┘
                 │
         ┌───────┴──────────────────┐
         │ Central Registry          │
         │ + Voting System           │
         │ (~/.config/ai-agents/)    │
         └───────┬──────────────────┘
                 │
         ┌───────┴─────────────────┐
         │ Agent-Sync CLI           │
         │ (Review, Aggregate,      │
         │  Update, Rollback)       │
         └───────┬─────────────────┘
                 │
         ┌───────┴──────────────┐
         │ Web Dashboard        │
         │ (Learnings, Voting,  │
         │  Conflicts, Timeline) │
         └──────────────────────┘
```

## Quick Start

### Installation

```bash
git clone https://github.com/yourusername/agent-governance.git
cd agent-governance

# Install CLI tools
sudo cp bin/agent-sync /usr/local/bin/
sudo cp bin/agent-log-result /usr/local/bin/
sudo cp bin/agent-suggest-improvements /usr/local/bin/

# Initialize registry (~/.config/ai-agents/registry.json)
agent-sync --init
```

### Phase 1: Log Your First Learning

```bash
# Agent observes a working optimization
agent-log-result \
  --task "import-leads" \
  --success \
  --insight "batch_size_100_faster_than_1000" \
  --confidence 0.95 \
  --affected-instruction "database-access"
```

### Phase 2: Propose an Improvement

```bash
# Suggest instruction change
agent-suggest-improvements \
  --instruction "database-access" \
  --title "Use docker exec directly instead of SSH" \
  --rationale "Codex benchmarks show 40% faster execution" \
  --platform "codex"
```

### Phase 3: Run Cross-Agent Sync

```bash
# All agents vote on learnings
agent-sync --aggregate-learnings

# Review proposals (will show voting results)
agent-sync --review-stale

# Apply approved changes automatically
agent-sync --update-instructions
```

### Phase 4: Schedule Weekly Reviews

```bash
# Install systemd timer (Linux)
sudo cp config/agent-governance.timer /etc/systemd/system/
sudo cp config/agent-governance.service /etc/systemd/system/
sudo systemctl enable agent-governance.timer
sudo systemctl start agent-governance.timer
```

### Phase 5: View Dashboard

```bash
# Start web UI
npm start --prefix dashboard

# Open http://localhost:3000
# See real-time learnings, voting, and instruction timeline
```

## Project Structure

```
agent-governance/
├── bin/                          # CLI executables
│   ├── agent-sync                # Main orchestration CLI
│   ├── agent-log-result          # Log learning outcomes
│   └── agent-suggest-improvements # Propose changes
├── lib/                          # Core logic
│   ├── registry.js               # Registry management
│   ├── voting.js                 # Consensus logic
│   ├── updater.js                # Instruction updater + rollback
│   └── learning-aggregator.js    # Parse and merge logs
├── config/                       # Configuration templates
│   ├── registry-schema.json      # Instructions registry schema
│   ├── learning-schema.json      # Learning journal format
│   ├── agent-governance.service  # Systemd service
│   └── agent-governance.timer    # Weekly cron timer
├── dashboard/                    # Web UI (Express.js + React)
│   ├── server.js                 # Backend API
│   ├── public/                   # Frontend assets
│   └── package.json
├── tests/                        # Test suite
├── docs/                         # Documentation
│   ├── PHASES.md                 # Detailed phase documentation
│   ├── SCHEMA.md                 # Registry & learning formats
│   └── DEPLOYMENT.md             # Production setup guide
└── README.md
```

## Registry Format (Phase 1)

**Instructions Registry** (`~/.config/ai-agents/registry.json`):
```json
{
  "instructions": {
    "database-access": {
      "file": "/root/AGENTS.md",
      "section": "Database Access",
      "version": "1.2.0",
      "last_reviewed": "2026-03-30T00:00:00Z",
      "next_review": "2026-04-13T00:00:00Z",
      "platforms": ["gemini", "claude", "codex", "copilot", "paperclip"],
      "status": "active",
      "change_log": [
        {"date": "2026-03-30", "change": "Added dbx helper", "voted_by": 5}
      ]
    }
  },
  "learnings": [
    {
      "id": "learning-001",
      "title": "Docker exec 40% faster than SSH",
      "origin_agent": "codex",
      "date": "2026-03-29T14:30:00Z",
      "status": "approved",
      "confidence": 0.95,
      "affects_instruction": "database-access",
      "votes": {
        "gemini": "approved",
        "claude": "approved",
        "codex": "approved",
        "copilot": "approved",
        "paperclip": "pending"
      }
    }
  ]
}
```

**Learning Journal** (`~/.gemini/learnings.log`, JSON-lines):
```jsonl
{"agent":"gemini","timestamp":"2026-03-29T14:30:00Z","task":"import-leads","success":true,"insight":"batch_size_100_faster_than_1000","confidence":0.95,"affected_instruction":"database-access"}
{"agent":"gemini","timestamp":"2026-03-29T15:45:00Z","task":"send-email","success":true,"insight":"attachments_work_faster_with_gws_cli","confidence":0.88,"affected_instruction":"email-with-attachments"}
```

## CLI Tools (Phase 2)

### agent-sync
```bash
# Initialize registry
agent-sync --init

# Review stale instructions
agent-sync --review-stale

# Aggregate all learning logs and apply voting
agent-sync --aggregate-learnings

# Apply approved changes to instructions
agent-sync --update-instructions

# Rollback to previous version
agent-sync --rollback --instruction database-access --version 1.1.0

# Show voting statistics
agent-sync --stats
```

### agent-log-result
```bash
agent-log-result \
  --task "task-name" \
  --success \
  --insight "what was learned" \
  --confidence 0.95 \
  --affected-instruction "instruction-name"
```

### agent-suggest-improvements
```bash
agent-suggest-improvements \
  --instruction "database-access" \
  --title "Use docker exec instead of SSH" \
  --rationale "40% performance improvement observed" \
  --platform "codex" \
  --priority "high"
```

## Workflow Example

**Day 1: Codex discovers optimization**
```bash
# Agent logs the discovery
agent-log-result --task "database-query" --success \
  --insight "connection_pooling_reduces_latency_by_40%" \
  --affected-instruction "database-access" \
  --confidence 0.92
```

**Day 2-6: Other agents vote (poll via agent-sync)**
```bash
# Gemini, Claude, Copilot, Paperclip read learning
# Each independently verifies + votes via agent-log-result
agent-log-result --task "database-query" --success \
  --insight "confirmed: connection_pooling_reduces_latency_by_40%" \
  --affected-instruction "database-access" \
  --confidence 0.95
```

**Day 7: Automated weekly review**
```bash
# Cron runs: agent-sync --aggregate-learnings --update-instructions
# Result: All 5 agents get updated AGENTS.md with new pooling guidelines
# Rolled out simultaneously to Gemini, Claude, Codex, Copilot, Paperclip
```

## Dashboard (Phase 5)

Visit `http://localhost:3000` after running `npm start --prefix dashboard`:

- **Learnings Feed** — Real-time log of all insights across agents
- **Voting Board** — See which learnings are pending/approved/rejected
- **Instruction Timeline** — Visual history of instruction changes + rollbacks
- **Conflict Detection** — Highlights when learnings from different agents contradict
- **Stats Panel** — Voting velocity, approval rate, most-productive agents

## Security & Safety

✅ **Immutable Logs** — Learning journals are append-only (never deleted or modified)  
✅ **Consensus Gate** — Bad learnings can't corrupt all platforms (majority vote required)  
✅ **Audit Trail** — Complete history of who voted what and when  
✅ **Rollback Ready** — Versioned instructions mean fast recovery from mistakes  
✅ **Per-Agent Logs** — Each agent maintains independent record  

## Development & Testing

```bash
# Run test suite
npm test

# Test CLI tools
./tests/cli-tests.sh

# Test dashboard
cd dashboard && npm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new instruction types, voting strategies, or dashboard features.

## License

MIT — See [LICENSE](LICENSE)

## Authors

Built by **Codex** for multi-agent distributed learning.  
Co-authored by Copilot, Gemini, Claude, Paperclip agents.

---

**Questions?** See [PHASES.md](docs/PHASES.md) for detailed documentation of each phase.
