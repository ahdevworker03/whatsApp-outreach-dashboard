# Graph Report - whatsApp-outreach-dashboard  (2026-09-12)

## Corpus Check
- Corpus is ~49,520 words - fits in a single context window. You may not need a graph.

## Summary
- 287 nodes · 366 edges · 21 communities (12 shown, 8 thin omitted)
- Extraction: 90% EXTRACTED · 9% INFERRED · 1% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.83)
- Token cost: 0 input · 232,203 output

## Community Hubs (Navigation)
- Backend Data Model & API Design
- Backend Package Dependencies
- Coding Skill Principles & Tech Choices
- Claude Code Skill Catalog
- Contract Scope & MVP Milestones
- Development Workflow & Contract Rules
- System Architecture & Tech Decisions
- WhatsApp Webhook Backend Code
- TypeScript Compiler Config
- M2 Backend Foundation Milestone
- M1 WhatsApp Integration Proof
- Meta API Client & Test Scripts
- MCP Context7 Server
- API Contract Compatibility Rule
- Backend Scope Rule
- Code Organization Rule
- Dependency Rule
- Error Handling Rule
- Maintainability Rule
- Naming Rule

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 14 edges
2. `WhatsApp Outreach Dashboard Contract` - 11 edges
3. `M1 WhatsApp Integration Proof Milestone Doc` - 10 edges
4. `WhatsApp Outreach Dashboard MVP Scope` - 10 edges
5. `Folder Architecture Skill` - 9 edges
6. `Prisma ORM Skill` - 9 edges
7. `System Architecture Doc` - 9 edges
8. `API Design Doc` - 9 edges
9. `M2 — Backend Foundation and Data Model` - 9 edges
10. `PostgreSQL Skill` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Validate Early Principle` --semantically_similar_to--> `API Access Control (Bearer Token)`  [INFERRED] [semantically similar]
  .claude/skills/validation/SKILL.md → docs/architecture/05-api-design.md
- `Project: Explicit Non-Goals` --semantically_similar_to--> `Contract: Explicitly Excluded Features (multi-tenant SaaS, AI replies, advanced CRM, etc.)`  [INFERRED] [semantically similar]
  docs/rules/project.md → docs/contract/WhatsApp Outreach Dashboard.pdf
- `PostgreSQL Database Choice` --conceptually_related_to--> `PostgreSQL Skill`  [INFERRED]
  docs/architecture/02-technology-decisions.md → .claude/skills/postgresql/SKILL.md
- `Prisma ORM Choice` --conceptually_related_to--> `Prisma ORM Skill`  [INFERRED]
  docs/architecture/02-technology-decisions.md → .claude/skills/prisma/SKILL.md
- `Rule Priority Ordering` --references--> `WhatsApp Outreach Dashboard Contract`  [EXTRACTED]
  CLAUDE.md → docs/contract/WhatsApp Outreach Dashboard.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **React Server-State Management via TanStack Query** — claude_skills_data_fetching_skill_data_fetching, claude_skills_folder_architecture_references_api_layer_api_layer, claude_skills_folder_architecture_references_state_management_state_management, concept_tanstack_query [INFERRED 0.85]
- **Express API Error Response Contract** — claude_skills_error_handling_skill_error_handling, claude_skills_express_skill_express, claude_skills_api_design_skill_api_design, concept_express_error_middleware [EXTRACTED 1.00]
- **Pull Request and CI Quality Gate Workflow** — claude_skills_git_skill_git, claude_skills_github_actions_skill_github_actions, claude_skills_code_review_skill_code_review [INFERRED 0.85]
- **Low-Complexity MVP Infrastructure Decision Set** — docs_architecture_01_system_architecture_simplicity_principle, docs_architecture_02_technology_decisions_rejected_approaches, docs_architecture_02_technology_decisions_node_cron_choice, docs_contract_whatsapp_outreach_dashboard_deployment_decision, docs_contract_whatsapp_outreach_dashboard_devops_learning_goal [INFERRED 0.85]
- **Backend Data Model to API Contract Alignment** — docs_architecture_04_database_design_leads_table, docs_architecture_04_database_design_campaigns_table, docs_architecture_04_database_design_messages_table, docs_architecture_04_database_design_conversations_table, docs_architecture_05_api_design_leads_endpoints, docs_architecture_05_api_design_campaign_endpoints [INFERRED 0.90]
- **WhatsApp Send/Receive Integration Proof Flow** — docs_development_milestones_01_step3_backend_send_proof, docs_development_milestones_01_step5_webhook_verification, docs_development_milestones_01_step6_inbound_webhook, docs_development_milestones_01_step7_status_events, docs_architecture_05_api_design_whatsapp_webhook [EXTRACTED 0.90]
- **MVP Milestone Delivery Pipeline (M1-M9)** — docs_planning_01_mvp_plan_m1_milestone, docs_planning_01_mvp_plan_m2_milestone, docs_planning_01_mvp_plan_m3_milestone, docs_planning_01_mvp_plan_m4_milestone, docs_planning_01_mvp_plan_m5_milestone, docs_planning_01_mvp_plan_m6_milestone, docs_planning_01_mvp_plan_m7_milestone, docs_planning_01_mvp_plan_m8_milestone, docs_planning_01_mvp_plan_m9_milestone [EXTRACTED 1.00]
- **Backend Layered Architecture (route/controller/service/repository) applied to webhook persistence** — docs_rules_backend_architecture_layer_flow, docs_rules_backend_module_structure, docs_rules_backend_layer_responsibilities, docs_development_milestones_02_backend_foundation_data_model_step5_webhook_persistence_incoming, docs_development_milestones_02_backend_foundation_data_model_step6_webhook_persistence_status [EXTRACTED 1.00]
- **Scope Traceability: Contract -> Source of Truth -> Milestone Plan** — docs_contract_whatsapp_outreach_dashboard_mvp_scope, docs_rules_project_source_of_truth, docs_planning_01_mvp_plan_m1_milestone, docs_rules_project_explicit_non_goals [EXTRACTED 1.00]

## Communities (21 total, 8 thin omitted)

### Community 0 - "Backend Data Model & API Design"
Cohesion: 0.08
Nodes (34): Validation Skill, Validate Early Principle, Zod Type Inference (z.infer), Backend Architecture Doc, Backend Environment Variables List, Global Error Handling Design, Backend Folder Structure (routes/services/jobs/webhooks/middleware/lib/prisma), Incoming Message Request Flow (+26 more)

### Community 1 - "Backend Package Dependencies"
Cohesion: 0.06
Nodes (32): dependencies, dotenv, express, prisma, @prisma/adapter-pg, @prisma/client, description, devDependencies (+24 more)

### Community 2 - "Coding Skill Principles & Tech Choices"
Cohesion: 0.07
Nodes (32): Repository CLAUDE.md Entry Point, Context7 MCP Requirement for Express/Prisma/PostgreSQL/node-cron/Meta Cloud API, Rule Priority Ordering, Migrations Skill, Prisma Migrate Workflow (dev/deploy/push), Zero-Downtime Migration Strategy, PostgreSQL Skill, Index With Purpose Principle (+24 more)

### Community 3 - "Claude Code Skill Catalog"
Cohesion: 0.10
Nodes (27): API Design Skill, Code Review Skill, Data Fetching Skill, Database Schema Design Skill, Debugging Skill, Environment Configuration Skill, Error Handling Skill, Express Skill (+19 more)

### Community 4 - "Contract Scope & MVP Milestones"
Cohesion: 0.10
Nodes (27): Contract: Approval Terms, Contract: Auto Reply Detection (best-effort, rules/patterns), Contract: Automatic Follow-ups (sequence, stop-on-human-reply), Contract: Campaign Feature (single active campaign, templates, daily limit), Contract: Dashboard Feature (basic statistics), Contract: Explicitly Excluded Features (multi-tenant SaaS, AI replies, advanced CRM, etc.), Contract: Final Delivery Terms, Contract: Inbox Feature (conversation history, manual reply) (+19 more)

### Community 5 - "Development Workflow & Contract Rules"
Cohesion: 0.08
Nodes (26): Agent Workflow Model Roles (planning vs implementation tiers), Agent Workflow Prompt Discipline, Agent Workflow Review Discipline, Agent Workflow Usage Budget Discipline, Agent Workflow Working Loop, API Contracts: Contract First, API Contracts: Generated Artifacts Policy, API Contracts: Shared Types (+18 more)

### Community 6 - "System Architecture & Tech Decisions"
Cohesion: 0.12
Nodes (24): System Architecture Doc, Express Backend Service, Meta Cloud API (External Dependency), Nginx Reverse Proxy, node-cron In-Process Scheduler, PostgreSQL Database Component, React Frontend Component, Risk-First Implementation Principle (+16 more)

### Community 7 - "WhatsApp Webhook Backend Code"
Cohesion: 0.21
Nodes (10): env, app, errorHandler(), receiveWebhookEvent(), verifyWebhook(), WhatsAppMessageEntry, WhatsAppStatusEntry, WhatsAppWebhookPayload (+2 more)

### Community 8 - "TypeScript Compiler Config"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir (+7 more)

### Community 9 - "M2 Backend Foundation Milestone"
Cohesion: 0.17
Nodes (16): M2 — Backend Foundation and Data Model, Step 1 — PostgreSQL Setup and Connection, Step 2 — Prisma Installation and Schema Definition, Step 3 — Initial Migration, Step 4 — Prisma Client Singleton, Step 5 — Webhook Persistence: Incoming Messages, Step 6 — Webhook Persistence: Status Updates, Step 7 — Basic API Structure Confirmation (+8 more)

### Community 10 - "M1 WhatsApp Integration Proof"
Cohesion: 0.25
Nodes (14): Backend README (M1 WhatsApp Integration Proof), backend/.env Working-Directory Resolution Issue, metaClient.ts (referenced), backend/src/config/env.ts (referenced), Step 1: Meta Developer App and Test Number Setup, Step 2: Outbound Send Proof (Dashboard), Step 3: Outbound Send Proof (Backend Code), Step 4: Fix Environment Variable Location (+6 more)

### Community 11 - "Meta API Client & Test Scripts"
Cohesion: 0.27
Nodes (8): main(), main(), MetaApiError, MetaApiErrorBody, MetaSendMessageResponse, sendTemplateMessage(), SendTemplateMessageInput, TemplateComponent

## Ambiguous Edges - Review These
- `Database: Multi-Tenancy Rules (organization_id)` → `Project: Explicit Non-Goals`  [AMBIGUOUS]
  docs/rules/database.md · relation: conceptually_related_to
- `Database: Safety for Destructive Operations` → `Project: Repository Structure (backend/, frontend/, docs/)`  [AMBIGUOUS]
  docs/rules/database.md · relation: conceptually_related_to

## Knowledge Gaps
- **84 isolated node(s):** `context7`, `name`, `version`, `private`, `description` (+79 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 116 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Database: Multi-Tenancy Rules (organization_id)` and `Project: Explicit Non-Goals`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Database: Safety for Destructive Operations` and `Project: Repository Structure (backend/, frontend/, docs/)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `WhatsApp Outreach Dashboard Contract` connect `System Architecture & Tech Decisions` to `Backend Data Model & API Design`, `Coding Skill Principles & Tech Choices`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `TypeScript Skill` connect `Coding Skill Principles & Tech Choices` to `Backend Data Model & API Design`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `M2 — Backend Foundation and Data Model` connect `M2 Backend Foundation Milestone` to `Contract Scope & MVP Milestones`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `context7`, `name`, `version` to the rest of the system?**
  _84 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Data Model & API Design` be split into smaller, more focused modules?**
  _Cohesion score 0.08021390374331551 - nodes in this community are weakly interconnected._