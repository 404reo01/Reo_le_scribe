Scan the current file (or the files touched in the last task) and fix all cleanliness issues. Act as a strict linter.

## What to fix

### Hard rules (fix immediately, no discussion)
- **French comments** — remove or translate to English. Zero tolerance.
- **Unused imports** — delete them
- **Unused variables or parameters** — delete or prefix with `_` if intentionally unused
- **Dead code** — commented-out blocks, unreachable branches, stale TODOs older than the current phase

### Soft rules (flag but don't auto-fix unless obvious)
- Console.log statements left from debugging
- Overly verbose comments that restate the code
- Magic numbers/strings that should be constants

## Process
1. Read the target file(s)
2. Apply all hard-rule fixes directly via Edit
3. Report soft-rule findings as a short list
4. Run `npm run lint` in the relevant package and fix any remaining ESLint errors

## Output
- List of changes made (one line each)
- List of soft-rule findings (if any)
- Lint result (pass / errors remaining)
