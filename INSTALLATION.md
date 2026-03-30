# Phase 4 & 5 Installation Guide

## Phase 4: Automated Systemd Review & Updates

### Prerequisites
- systemd installed (standard on Linux)
- agent-sync CLI installed at `/usr/local/bin/agent-sync`
- Root access for systemd service installation

### Installation

```bash
# 1. Copy systemd files
sudo cp config/agent-governance.service /etc/systemd/system/
sudo cp config/agent-governance.timer /etc/systemd/system/

# 2. Reload systemd daemon
sudo systemctl daemon-reload

# 3. Enable the timer (runs weekly on Sunday at 02:00 UTC)
sudo systemctl enable agent-governance.timer

# 4. Start the timer
sudo systemctl start agent-governance.timer

# 5. Check status
sudo systemctl status agent-governance.timer
sudo systemctl list-timers agent-governance.timer
```

### Verify Installation

```bash
# Check if timer is active
systemctl is-active agent-governance.timer

# View next scheduled run
systemctl list-timers agent-governance.timer

# View service logs
journalctl -u agent-governance.service -n 50
journalctl -u agent-governance.timer -n 20

# Manually trigger sync (for testing)
sudo systemctl start agent-governance.service
```

### Customizing the Schedule

Edit the `OnCalendar` line in `/etc/systemd/system/agent-governance.timer`:

```
# Weekly on Sunday at 02:00 (default)
OnCalendar=Sun *-*-* 02:00:00

# Daily at midnight
OnCalendar=*-*-* 00:00:00

# Every 6 hours
OnCalendar=*-*-* 00,06,12,18:00:00

# Every Monday and Friday at 10:00
OnCalendar=Mon,Fri *-*-* 10:00:00
```

Then reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart agent-governance.timer
```

## Phase 5: Web Dashboard

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager
- Express.js backend running (server.js)

### Installation

```bash
# 1. Install dashboard dependencies
cd dashboard
npm install

# 2. Build static assets (if using build tools)
# Currently, we use plain HTML with vanilla JS—no build needed

# 3. Ensure Express backend is running
node server.js
# or with pm2:
pm2 start server.js --name "agent-governance-api"

# 4. Access dashboard in browser
# http://localhost:3000 (if server.js runs on default port)
```

### Dashboard Features

- **Real-time Stats**: Total instructions, learnings, pending/approved counts
- **Agent Contributions**: Bar chart showing learnings per agent (Gemini, Claude, Codex, Copilot, Paperclip)
- **Recent Learnings Feed**: Last 20 learnings with voting status and agent attribution
- **Confidence Scoring**: Visual indicator of learning confidence (0-100%)
- **Vote Tracking**: Per-agent voting on proposals with consensus threshold (3/5)
- **Auto-refresh**: Updates every 30 seconds via polling

### API Endpoints (Backend)

The dashboard relies on these Express.js endpoints:

```
GET /api/stats                 → stats object (instructions, learnings, agent breakdown)
GET /api/instructions          → array of all instructions with versions
GET /api/learnings             → array of all learnings with voting data
GET /api/learnings?status=     → filter by status (pending/approved/rejected)
GET /api/learnings/:id         → specific learning detail
POST /api/vote                 → record an agent's vote { learning_id, agent, vote }
GET /api/timeline              → instruction history timeline
POST /api/rollback             → revert to previous instruction version
GET /health                    → API health check (returns { status: "ok" })
```

### Deployment Options

#### Option 1: Single Server (Development)
```bash
# Terminal 1: Run API backend
cd dashboard
node server.js

# Terminal 2: Serve static HTML
python3 -m http.server 8000 --directory public
# Access: http://localhost:8000
```

#### Option 2: PM2 Managed (Production)
```bash
# Install PM2
npm install -g pm2

# Start backend with PM2
pm2 start dashboard/server.js --name "agent-gov-api"
pm2 start "python3 -m http.server 8000 --directory dashboard/public" --name "agent-gov-ui"

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 logs agent-gov-api
```

#### Option 3: Docker Container
```bash
# Build image
docker build -t agent-governance-dashboard .

# Run container
docker run -d \
  -p 3000:3000 \
  -p 8000:8000 \
  -v ~/.config/ai-agents:/root/.config/ai-agents:ro \
  agent-governance-dashboard

# Access: http://localhost:8000
```

### Dashboard Customization

Modify `dashboard/public/index.html` to change:

- **Colors**: Edit CSS gradient values (currently: dark blue/cyan theme)
- **Refresh Rate**: Change interval from 30000ms to desired value
- **Max Learnings**: Modify `.slice(0, 20)` to show more/fewer items
- **Layout**: Grid columns, stat card sizing, section spacing

## Full Integration Checklist

- [x] Phase 1: Registry + Learning schemas
- [x] Phase 2: agent-sync CLI tool with voting
- [x] Phase 3: Learning capture (agent-log-result, agent-suggest-improvements)
- [x] Phase 4: Systemd automation (service + timer)
- [x] Phase 5: Web dashboard (HTML + API)
- [ ] GitHub: Deploy repo (see next section)

## Next: GitHub Deployment

See main README.md for GitHub setup and open-source release instructions.
