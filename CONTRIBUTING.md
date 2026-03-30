# Contributing to AI Agent Governance

We welcome contributions! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- No harassment or discrimination

## How to Contribute

### Reporting Issues

1. Check if the issue already exists
2. Provide a clear description
3. Include steps to reproduce (if applicable)
4. Attach logs or error messages

### Proposing Enhancements

1. Open an issue describing the feature
2. Explain the use case and expected behavior
3. Discuss implementation approach with maintainers

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Add tests if applicable
5. Commit with clear message: `git commit -m "Add feature X"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Open a Pull Request with description of changes

### Pull Request Guidelines

- One feature per PR
- Include tests for new functionality
- Update documentation
- Ensure all existing tests pass
- Follow existing code style
- Add Co-authored-by trailer if applicable

## Development Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/agent-governance.git
cd agent-governance

# Create virtual environment (for Python scripts)
python3 -m venv venv
source venv/bin/activate

# Install development dependencies
npm install --save-dev  # for dashboard testing

# Run tests
npm test  # if applicable
```

## File Structure

```
agent-governance/
├── bin/                      # CLI executables
│   ├── agent-sync           # Main CLI tool
│   ├── agent-log-result     # Learning logger
│   └── agent-suggest-improvements
├── config/                  # Configuration & schemas
│   ├── registry-schema.json
│   ├── registry-bootstrap.json
│   ├── learning-schema.json
│   ├── agent-governance.service
│   └── agent-governance.timer
├── dashboard/               # Web dashboard
│   ├── server.js           # Express.js backend
│   ├── package.json
│   └── public/index.html   # Dashboard UI
├── docs/                    # Documentation
│   ├── PHASES.md           # Architecture & phases
│   └── API.md              # API reference (if added)
├── README.md               # Main documentation
├── LICENSE                 # MIT License
├── CONTRIBUTING.md         # This file
└── INSTALLATION.md         # Setup guide
```

## Coding Standards

### Python/Bash
- Use clear variable names
- Add comments for complex logic
- Validate user input
- Handle errors gracefully

### JavaScript (Node.js)
- Use const/let (no var)
- Async/await preferred over callbacks
- Error handling with try/catch
- Follow Node.js best practices

### JSON
- Use 2-space indentation
- Validate against schema
- Include comments where applicable

## Testing

Before submitting changes:

```bash
# Test registry loading
node -e "console.log(require('./config/registry-bootstrap.json'))"

# Test learning schema
node -e "console.log(require('./config/learning-schema.json'))"

# Test CLI tools
./bin/agent-sync --help
./bin/agent-log-result --help
./bin/agent-suggest-improvements --help

# Test dashboard API (if running)
curl http://localhost:3000/api/stats
```

## Documentation

- Update README.md for user-facing changes
- Update PHASES.md for architectural changes
- Add comments to complex code
- Include examples for new features

## Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

Types: feat, fix, docs, style, refactor, test, chore

Example:
```
feat: Add agent voting dashboard

- Implements React-based voting interface
- Real-time consensus detection
- WebSocket support for live updates

Fixes #42
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open an issue or contact the maintainers for guidance.

Thank you for contributing! 🎉
