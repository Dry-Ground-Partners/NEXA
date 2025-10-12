# 🧭 SaaS Platform Specification — Draft 1.1

## Overview

This SaaS platform provides modular, AI-assisted workflows for organizational structuring, process analysis, solution generation, and visualization.  
The system integrates AI-generated schemas, markup-based documentation, and asynchronous visual generation, all inside a cohesive user experience.  

The core design goal is **seamless human–AI collaboration**, where users interact conversationally, and the AI manages logic, data structures, and background configuration invisibly.

---

## 🔧 General Platform Requirements

### UI & Interaction Framework
- **Right Sidebar:**  
  Every module includes a right-hand sidebar for contextual responses, AI interaction, and workflow status updates.

- **Tabs with Horizontal Scrolling:**  
  Implement horizontal scroll in all tab sections for better navigation across many elements.

- **Save/Delete Integrity:**  
  All “Save” and “Delete” functions must be tested thoroughly. Include confirmation prompts and rollback/undo capabilities.

- **Autosave (Temporary Table):**  
  Automatically save in-progress work to a temporary table. The system restores the session if the browser or app closes unexpectedly.

- **Preloading:**  
  Preload resources, schemas, and AI contexts for each workflow stage to minimize latency.

- **Auto-fill & Auto-naming:**  
  AI automatically fills in default names, labels, and metadata for all objects (projects, blueprints, diagrams, etc.).

- **AI Voice (Command Mode):**  
  Users can give **command-based voice inputs** using **OpenAI Whisper** for navigation, triggering actions, or editing fields.

---

## 🧩 Organization Preferences

### Functionality
- When a user logs in and no organization preferences exist, the system **prompts setup** automatically.  
- The user provides input conversationally, and the **AI generates a hidden schema** (JSON-based structure) representing organizational traits, preferences, and environment.  
- The schema:
  - **Is not visible or editable** by the user.
  - **Updates only when the user changes preferences conversationally.**
  - **Affects only new workflows.**  
  Existing projects remain unchanged unless the user revisits and edits them manually.

### AI Behavior
- The AI creates:
  1. A **hidden JSON schema**
  2. A **human-readable summary** of how the schema is structured and used (for internal reference).

### Data Flow
1. User login → Check preferences.  
2. If missing → Prompt → AI generates schema + summary → Store schema.  
3. Schema used for subsequent workflow customization.

---

## ⚙️ Structuring Workflow

### Purpose
Triggers two concurrent systems:
1. **Solution Generator**
2. **DMA Analysis** (Define, Measure, Analyze)

---

### 1. Solution Generator
- **Phase 1:** Identify pain points via user conversation or guided form.  
- **Phase 2:** AI generates a detailed proposed solution.  
- **Phase 3:** Pass solution into the **Blueprint module**.

#### Blueprint Module
- Builds a detailed, **layered implementation plan** using the organization’s schema.  
- Layers adjust dynamically depending on user type:
  - **Business User:** automation layer (e.g., Power Automate, Zapier).  
  - **Technical User:** full stack (frontend, backend, database, infrastructure).  
- Auto-fills a page with actionable steps and structured guidance.  
- Supports continuous back-and-forth refinement with the AI.

---

### 2. DMA Analysis
- Automatically triggers **Define, Measure, Analyze** phases.
- Once these are complete, **Improve** and **Control (IC)** are launched automatically.  
- All results are generated as:
  - `.md` file (markup-based documentation)
  - **PDF** (converted from markup for distribution or export)

#### Notes on Markup
- Use syntax-based markup (like structured plain text with HTTP-style headers or Markdown-like tokens).
- Simpler than HTML for AI to generate; easily transformed into HTML or PDF for display or export.

#### Data Storage
- Results are stored **per project**, not globally.
- Revisited projects will use the updated organization schema if re-edited.

---

## 🎨 Visuals Workflow

### Existing Workflow
Visuals flow includes **Ideation → Planning → Sketch → Diagram → Save Image.**

- **Ideation:** Describes how the solution should look or function.  
- **Planning:** Contains text on how to draw the diagram of that solution.  
- **Sketch:** Holds the actual DrawIO XML of the diagram.  
- **Diagram:** Displays the rendered visual output.  
- **Save Image:** Exports the diagram snapshot.

### Enhancements
- Make all arrow transitions (**Ideation → Planning → Sketch**) **asynchronous**, allowing multiple diagram generations simultaneously.  
- Add buttons to trigger **mass generation** of diagrams for multiple workflows in parallel.  
- Maintain **workflow notifications and animations** for each asynchronous event.

### Behavior Rules
- User cannot proceed to the next stage until the current step is marked as ready (all required data present).
- Each async operation updates the sidebar notification area with a visual cue (no external alerts).

---

## 🧠 Solutioning Workflow

### Logic
- **Structure Solution button** appears **only when all fields are empty.**  
  - Clicking it pre-fills suggested content automatically.  
- If **any field is non-empty**, the button hides and the process moves directly to **Step 2.**

### UI & Behavior
- The **“boat” button** (previously misread as “bone”) must be **restyled as a “laser” button** to match the Structure Solution button aesthetic.  
- The **HyperCanvas** must validate completeness before allowing the user to advance.  
- The user cannot progress unless **all fields are complete.**

---

## 📄 SOW (Statement of Work) Workflow

### Requirements
- Update button styling to match the unified “laser” design.  
- Enforce field-completion validation before proceeding to the next stage.

---

## 📊 LOE (Level of Effort) Workflow

### Requirements
- Same button styling updates as SOW and Solutioning.  
- Validation check ensures all fields are filled before progressing.

---

## 🚀 System-Wide Considerations

### Consistency
- Button design, autosave, sidebar layout, and completion validation rules are identical across all modules.

### Async Operations
- Use a central notification system to manage async status for diagram generation, schema creation, and blueprint population.
- Notifications are **in-app only**, with visual cues (no alerts, popups, or emails).

### Data Persistence
- **Temporary table:** For autosave and recovery.
- **Permanent storage:** Written when workflow is finalized or submitted.

### Access Control
- Role-based permissions for multi-organization support (Admin, Contributor, Viewer).

---

## ❓Q&A Section

1. **Schema Visibility:** Hidden; only modifiable via AI through conversational updates.  
2. **Schema Scope:** Affects new workflows only; old ones stay as-is unless edited.  
3. **Document Outputs:** `.md` + PDF, no `.red` file.  
4. **Markup Preference:** Use structured markup syntax (less token-heavy, easier for AI).  
5. **Blueprint Depth:** Layered detail (business → technical stack) based on user type and preferences.  
6. **Notifications:** In-app visual feedback only, not alert-based.  
7. **Voice Features:** Command-based AI control for editing and navigation.  

---

## ✅ Summary

This architecture defines a consistent, AI-driven platform that:
- Automates schema generation and personalization.
- Balances simplicity (markup-based docs) with professional output (PDF export).
- Supports complex asynchronous workflows (e.g., visuals).
- Ensures usability through validation, autosave, and consistent UI design.
- Keeps human interaction natural, while AI manages structure and schema invisibly.
