# Workspace Rules for Ape Pin Potha

## Critical Rule: No Browser Subagent / No Screen Recording
- **DO NOT** use the `browser_subagent` tool under any circumstances.
- **DO NOT** perform automated browser testing or screen recordings.
- All testing and verifications must be done via node syntax checks, terminal commands, or by providing the live URL for the user to test manually.

## Git Push & Deployment Rules
- **ONLY push to `beta-origin` (`beta-origin beta:main`).**
- **NEVER push to `origin` (Live Server / Production)** unless the user explicitly requests to deploy to live after completing tests on Beta.

## Execution Autonomy
- Proactively perform file edits, syntax verifications, and git commands without asking conversational permission in chat.
- Provide the final outcome and summary directly.

