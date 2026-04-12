# REO LE SCRIBE - Project Manifest

## Project Overview
Reo le Scribe is a private, lightweight communication tool (Discord/Meet style) designed for small teams (max 10 users). It features real-time voice, video, and screen sharing.
**The "X-Factor":** A "Bookmark" feature (Bouton "À l'affût") that triggers a targeted transcription and summary of key moments using AI, rather than recording everything.

## Core Tech Stack
- **Frontend:** React (Vite), Tailwind CSS.
- **Backend:** Node.js (TypeScript), Mediasoup (SFU for WebRTC).
- **Database:** PostgreSQL.
- **Containerization:** Docker & Docker Compose.
- **AI Integration:** OpenRouter API (Whisper for STT, OpenAI for summarization).

## Critical Development Rules
1. **Step-by-Step Execution:** Never proceed to the next feature or generate code for a future stage without explicit user validation.
2. **Code Comments:** Strictly English. Keep them minimal and high-level (no prose).
3. **Token Efficiency:** - Be concise. 
    - Do not read large lockfiles or binary assets.
    - Focus only on the files relevant to the current task.
5. **Authentication:** Simple "Pseudo + Room Name" logic. No complex OAuth/Auth systems for now.
6. **SFU Logic:** Mediasoup handles all media routing. Audio extraction for AI happens server-side.

## Project Structure (Target)
- `/src/frontend`: React application.
- `/src/backend`: Node.js/Mediasoup server.
- `/docker`: Dockerfiles and environment configurations.
- `/shared`: Shared types/interfaces between Front and Back.

## Agentic Workflow & Automation

### 1. Roles & Personas
- **Orchestrator:** High-level planning, task breakdown, and cross-module consistency.
- **Architect:** Designs Mediasoup SFU logic and DB schema.
- **Developer:** Writes clean, minimal with good practices.
- **Reviewer:** Checks for security, best practices, and English-only comments.
- **tester**: Do the tests.

### 2. Custom Commands & Skills
The assistant should create and use the following "pseudo-commands" to optimize workflow:
- `/review`: Analyze the current file for performance and logic flaws.
- `/test`: Generate Vitest/Playwright scripts for the current feature.
- `/docs`: Update the technical README as the project evolves.
- `/clean`: Check for unused imports or French comments (strictly forbidden).

### 3. Quality Gate (Pre-Flight)
Before validating any task:
1. Run a linter check.
2. Verify "Mobile-First" responsiveness for UI.
3. Ensure Mediasoup port ranges are correctly mapped in Docker.



## Current Phase
- **Phase 0:** Initialization. Setting up folder structure and Docker infrastructure.