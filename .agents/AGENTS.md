# TripVerse — AI Agent Entry Point & Post-Session Protocol

Welcome to **TripVerse**. All AI coding agents operating on this repository must follow the multi-agent operating contract.

---

## 🚀 Quick Agent Onboarding Protocol

Before touching any code or making architectural changes, you MUST:

1. **Read Master Contract**: Read [`docs/agents/AGENTS.md`](file:///c:/Users/Rohit%20Maity/Desktop/coding/Webdev/project/TripVerse/docs/agents/AGENTS.md).
2. **Read Current State**: Read [`docs/CURRENT_STATE.md`](file:///c:/Users/Rohit%20Maity/Desktop/coding/Webdev/project/TripVerse/docs/CURRENT_STATE.md).
3. **Determine Your Ownership**:
   - **Cursor** (Frontend / UI / Figma / GSAP) → Read [`docs/agents/CURSOR.md`](file:///c:/Users/Rohit%20Maity/Desktop/coding/Webdev/project/TripVerse/docs/agents/CURSOR.md) and operate inside `frontend/`.
   - **Antigravity** (Backend / LangGraph / Database / Architecture) → Read [`docs/agents/ANTIGRAVITY.md`](file:///c:/Users/Rohit%20Maity/Desktop/coding/Webdev/project/TripVerse/docs/agents/ANTIGRAVITY.md) and operate inside `backend/`.
4. **Read Domain Guides**: Read domain-specific docs in [`docs/architecture/`](file:///c:/Users/Rohit%20Maity/Desktop/coding/Webdev/project/TripVerse/docs/architecture/) or [`docs/design/`](file:///c:/Users/Rohit%20Maity/Desktop/coding/Webdev/project/TripVerse/docs/design/).
5. **Inspect Existing Code**: Never rewrite or replace code without inspecting the current implementation first.
6. **Work Within Boundaries**: Never modify another agent's owned directory unless explicitly instructed by the user.

---

## 📝 Mandatory Post-Session Protocol

After completing any development session or major task milestone, you MUST perform the following documentation updates:

1. **Session Log File (`docs/sessions/SESSION_XX.md`)**:
   - Create a dedicated session file (e.g. `SESSION_01.md`, `SESSION_02.md`).
   - Include:
     - **What We Built**: Detailed list of components, endpoints, schemas, and configurations created.
     - **How It Works**: High-level data movement and architectural behavior.
     - **Difficulties Faced & Resolutions**: Roadblocks and how they were solved.
     - **Current State & Verification**: How the feature was tested and validated.
     - **Next Session Focus**: Target deliverables for the next session.

2. **System Architecture Diagram (`docs/architecture/SYSTEM_DESIGN.md`)**:
   - Update `docs/architecture/SYSTEM_DESIGN.md` to add or expand the Mermaid architecture diagram for the newly completed session.

3. **Global Trackers Update**:
   - Update [`docs/CURRENT_STATE.md`](file:///c:/Users/Rohit%20Maity/Desktop/coding/Webdev/project/TripVerse/docs/CURRENT_STATE.md) with updated capabilities and current status.
   - Append a session entry to [`docs/DEVELOPMENT_LOG.md`](file:///c:/Users/Rohit%20Maity/Desktop/coding/Webdev/project/TripVerse/docs/DEVELOPMENT_LOG.md).
