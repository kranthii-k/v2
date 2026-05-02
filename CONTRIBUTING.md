# Contributing to PFTUS

Thank you for your interest in contributing to the Blockchain-based Public Fund Tracking & Utilization System!

## Project Overview

This is an educational/seminar project demonstrating blockchain's application in governance and public fund transparency.

## Getting Started

1. Read the [README.md](README.md) for project overview
2. Follow [SETUP_GUIDE.md](SETUP_GUIDE.md) to set up development environment
3. Review the [PROJECT_OVERVIEW.md](cursor_project_rules/PROJECT_OVERVIEW.md) for architecture details

## Development Workflow

### Setting Up Your Development Environment

```bash
# Fork and clone the repository
git clone <your-fork-url>
cd Blockchain-based-Public-Fund-Tracking-Utilization-System

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Create your feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. **Smart Contracts** (`contracts/`):
   - Follow Solidity best practices
   - Use OpenZeppelin libraries where possible
   - Add comprehensive comments
   - Write tests for new functions

2. **Frontend** (`frontend/`):
   - Follow React best practices
   - Use TypeScript for type safety
   - Maintain consistent styling with Tailwind
   - Ensure responsive design

3. **Testing**:
   ```bash
   # Test smart contracts
   npm test
   
   # Test frontend
   cd frontend && npm test
   ```

4. **Code Style**:
   - Solidity: Follow style guide
   - TypeScript/React: Use consistent formatting
   - Add comments for complex logic

### Commit Guidelines

Use clear, descriptive commit messages:

```
feat: Add milestone resubmission feature
fix: Correct fund calculation in impact score
docs: Update setup guide with troubleshooting
style: Format contractor dashboard code
refactor: Optimize audit trail queries
test: Add tests for NFT minting
```

### Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Update CHANGELOG.md (if applicable)
4. Create pull request with clear description
5. Link related issues

## Code Review

- Be respectful and constructive
- Focus on code quality and functionality
- Suggest improvements, don't demand changes
- Acknowledge good work

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Environment details (OS, browser, network)

### Feature Requests

Include:
- Problem you're trying to solve
- Proposed solution
- Alternative approaches considered
- Impact on existing features

## Security

If you discover a security vulnerability:
- **DO NOT** open a public issue
- Email the maintainers directly
- Provide detailed description
- Allow time for patch before disclosure

## Questions?

- Check existing documentation first
- Search closed issues
- Ask in discussions/issues
- Be patient and respectful

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make PFTUS better! 🚀

