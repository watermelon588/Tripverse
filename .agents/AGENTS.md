# Agent Rules & Post-Session Workflows

## Mandatory Post-Session Documentation Protocol

After completing any development session or major task milestone, you MUST perform the following updates:

1. **Session Documentation File (`docs/sessions/SESSION_XX.md`)**:
   - Create a dedicated markdown file for the session (e.g. `SESSION_01.md`, `SESSION_02.md`).
   - Include:
     - **What We Built**: Detailed list of components, endpoints, schemas, and configurations created.
     - **How It Works**: High-level flow, data movement, and architectural behavior.
     - **Difficulties Faced & Resolutions**: Technical roadblocks, edge cases encountered, and how they were solved.
     - **Current State & Verification**: How the feature was tested and validated.
     - **Next Session Focus**: Target deliverables for the next session.

2. **Session-Wise Architecture Diagram (`docs/ARCHITECTURE_DIAGRAM.md`)**:
   - Update `docs/ARCHITECTURE_DIAGRAM.md` to add/expand the Mermaid system architecture diagram for the newly completed session.
   - Maintain the overall target architecture and the historical sequence of session diagrams.

3. **Global Trackers Update**:
   - Update `docs/CURRENT_STATE.md` with updated capabilities and current state.
   - Append an entry to `docs/DEVELOPMENT_LOG.md` summarizing the session.
