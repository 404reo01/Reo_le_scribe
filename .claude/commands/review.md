Perform a thorough review of the current file or the files relevant to the last task completed. Act as a strict Reviewer persona.

## What to check

### Logic & Performance
- Identify any logical flaws, edge cases not handled, or inefficient patterns
- Flag any N+1 queries, unnecessary re-renders, or blocking async operations

### Security
- Check for OWASP Top 10 vulnerabilities (injection, XSS, improper auth, etc.)
- Ensure no secrets or credentials are hardcoded
- Validate all inputs that come from outside the system boundary

### Code Quality
- English-only comments — flag any French or other language comments immediately
- No unused imports, variables, or dead code
- No over-abstraction or speculative generalization

### Mediasoup-specific (when applicable)
- Transport creation/cleanup is symmetric (no leaked transports)
- Producer/consumer lifecycle is correctly managed
- RTP port range is not exceeded

## Quality Gate (Pre-Flight Checklist)
Before marking this review as complete, confirm:
- [ ] Linter passes (`npm run lint` in the relevant package)
- [ ] UI components are mobile-first (smallest breakpoint first, then scale up)
- [ ] Mediasoup RTP port range in docker-compose matches `.env` values

## Output format
1. **Critical** issues (must fix before proceeding)
2. **Warnings** (should fix soon)
3. **Suggestions** (optional improvements)

Be concise. No praise, no filler. If nothing is wrong, say so in one line.
