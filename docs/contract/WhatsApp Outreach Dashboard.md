# Project

WhatsApp Outreach Dashboard — MVP

This is my first custom software project for a client/friend.

Client location: Jordan.
Developer location: Lebanon.

Agreed development price:

- Total: $90
- First payment: $45
- Remaining payment: $45 before final handover

The first $45 payment has been agreed as the upfront payment before development begins.

---

# Product goal

Build a simple single-user WhatsApp outreach dashboard using the official WhatsApp Business Platform.

The client already has a separate tool that extracts business information from Google Maps and exports it to Excel/CSV.

That Google Maps extraction tool is outside this project.

Our system begins from the Excel/CSV file.

Workflow:

Google Maps tool
→ Excel/CSV
→ WhatsApp Outreach Dashboard
→ WhatsApp Business Platform
→ Leads

---

# Core MVP workflow

1. Import leads from Excel/CSV.
2. Store and display leads.
3. Configure one active campaign.
4. Send an initial approved WhatsApp template.
5. If there is no real reply, send Follow-up #1 after a configured delay.
6. If there is still no real reply, send Follow-up #2 after another configured delay.
7. If a normal/human reply arrives, stop the remaining automatic follow-ups.
8. If a known/detected automatic reply arrives, do not treat it as a real reply.
9. Show incoming conversations in an Inbox.
10. Allow manual replies from the dashboard.
11. Show basic message status and statistics.

---

# WhatsApp number rules

The MVP supports:

- one active WhatsApp Business number at a time
- replacing the active number later with another properly registered Meta/WhatsApp number

The MVP does not support:

- multiple active WhatsApp numbers simultaneously

Messages can only be sent from a number that is properly registered/configured on the WhatsApp Business Platform.

The client asked whether one number could be connected to Meta while sending from another number. The answer is no unless the sending number is also properly registered with Meta.

Replacing a blocked/restricted number does not guarantee that Meta restrictions disappear if the restriction applies to the Business Account or results from policy violations.

---

# Meta setup responsibility

The developer will handle the technical setup of the provided WhatsApp number with Meta/WhatsApp Business Platform.

The client remains the owner of:

- the WhatsApp number
- the Meta Business Account
- business data

The client must provide:

- verification codes
- required approvals
- business verification information
- required account access

The developer should not own the client's Meta Business Account.

---

# Auto-reply requirement

The client clarified that automated replies should not count as a real reply.

Example:

Initial Message
→ automatic greeting/away reply
→ continue the follow-up sequence

Normal human reply
→ stop remaining automatic follow-ups
→ move/show conversation in Inbox

Important limitation:

Automatic-reply detection is best-effort.

Do not promise 100% accurate detection.

For the MVP, prefer simple configurable rules/patterns rather than AI classification.

---

# Campaign scope

The MVP has one active campaign at a time.

Configuration includes:

- Initial Message Template
- Follow-up #1 Template
- Follow-up #1 delay
- Follow-up #2 Template
- Follow-up #2 delay
- Daily Sending Limit, approximately 150 messages/day as requested

Do not assume that the daily limit makes non-compliant outreach acceptable.

---

# Compliance

The official WhatsApp Business Platform must be used.

The client is responsible for:

- source of leads
- required opt-in/consent
- legality of outreach
- compliance with WhatsApp policies
- WhatsApp/Meta fees

Publicly available Google Maps phone numbers should not automatically be treated as opted-in WhatsApp contacts.

The application does not guarantee:

- Meta account approval
- template approval
- account verification
- continued access if policies are violated

---

# MVP pages

Keep the UI small.

Main pages:

- Dashboard
- Leads
- Campaign
- Inbox
- Settings

Do not build a generic CRM or workflow builder.

---

# Basic MVP capabilities

Leads:

- Excel/CSV import
- basic validation
- duplicate handling
- phone normalization
- lead status

Campaign:

- one active campaign
- initial template
- two follow-ups
- configurable delays
- daily limit

WhatsApp:

- outbound templates
- incoming webhooks
- basic statuses
- incoming replies

Automation:

- schedule follow-ups
- stop on normal reply
- continue on detected auto-reply
- complete sequence after final follow-up

Inbox:

- conversation list
- history
- manual reply

Dashboard:

- Total Leads
- Contacted
- Replied
- Waiting for Follow-up
- Completed
- Failed Messages

---

# Explicit exclusions

Not included in the $90 MVP:

- Google Maps scraping
- modification of the existing extraction tool
- Google Sheets sync
- multiple active WhatsApp numbers
- multiple users
- employee accounts
- roles/permissions
- multi-tenant SaaS
- AI replies
- AI sales agent
- advanced CRM
- drag-and-drop workflow builder
- unlimited custom workflows
- advanced analytics
- billing/subscriptions
- SMS/email integrations
- advanced lead segmentation
- hosting costs
- domain costs
- Meta/WhatsApp fees
- third-party service fees
- ongoing maintenance beyond agreed support

New functionality outside this list must be treated as additional work.

---

# Support

Agreed support:

1 month of bug-fix support after final delivery.

This includes only problems in the agreed MVP functionality.

It does not include:

- new features
- modifications
- Meta/WhatsApp problems
- third-party service changes
- ongoing maintenance

---

# Expected delivery

Approximately 10–14 days after:

- scope approval
- upfront payment
- required Meta/WhatsApp access
- required information/setup

Third-party delays such as:

- Meta verification
- number registration
- template approval

do not count as developer delays.

---

# Deployment decision

The project will use a small VPS.

Reason:

The backend must stay online for:

- WhatsApp webhooks
- Express API
- PostgreSQL
- scheduled follow-ups

The project is small:

- one user
- approximately 150 outbound messages/day
- small database
- low traffic

A small VPS is enough.

The developer wants to manage the VPS manually partly to gain practical DevOps experience.

Avoid overpowered infrastructure.

Likely production setup:

Internet
→ Nginx
→ Express API
→ PostgreSQL

WhatsApp Webhook
→ Nginx
→ Express

Scheduler
→ follow-up jobs

Possible frontend:

- React frontend can be served from the VPS or separately depending on the final deployment decision.

---

# DevOps learning goal

Use this project to learn practical deployment fundamentals:

- Linux VPS provisioning
- SSH
- non-root users
- UFW/firewall
- Node.js runtime
- PostgreSQL administration
- environment variables/secrets
- Nginx reverse proxy
- HTTPS/Let's Encrypt
- systemd/process management
- logs
- deployment updates
- database backups
- DNS if needed
- webhook deployment
- scheduled/background jobs

Do not turn this project into a Kubernetes/Terraform/complex infrastructure exercise.

---

# Recommended implementation order

Do not start with frontend design.

Use risk-first implementation:

1. Meta/WhatsApp setup and API proof
2. Backend foundation
3. Real outbound WhatsApp message test
4. Webhook/incoming message proof
5. Database and message persistence
6. Lead/campaign state model
7. Follow-up automation
8. Auto-reply detection
9. Excel/CSV import
10. Inbox backend
11. Frontend
12. End-to-end verification
13. VPS deployment
14. Final acceptance

The first technical milestone should prove:

Backend
→ Meta
→ WhatsApp message

and:

Recipient reply
→ Meta webhook
→ Backend

before spending significant time on UI.
