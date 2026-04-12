Update the technical README to reflect the current state of the project. Act as an Architect persona writing for developers joining the project.

## Process
1. Read the current `README.md` (create it if it doesn't exist)
2. Read `Claude.md` to understand the current phase and stack
3. Scan recent changes to understand what was just implemented
4. Update or create the relevant sections below

## README sections to maintain

### Project Overview
One paragraph. What it is, who it's for, the X-Factor (À l'affût bookmark feature).

### Tech Stack
Bullet list. Keep in sync with `Claude.md`.

### Project Structure
Directory tree with one-line descriptions. Reflect actual current structure.

### Getting Started
```bash
# exact commands to get running locally
cp .env.example .env
# fill in .env values...
cd src/backend && npm install
cd src/frontend && npm install
docker-compose up
```

### Environment Variables
Table of all vars from `.env.example` with descriptions.

### Current Phase & What's Working
What is implemented and functional right now. Be honest — don't document things that aren't built yet.

### What's Next
The next planned phase (from `Claude.md` or last conversation context).

## Rules
- No future-tense marketing. Only document what exists.
- Keep it under 200 lines total.
- English only.
