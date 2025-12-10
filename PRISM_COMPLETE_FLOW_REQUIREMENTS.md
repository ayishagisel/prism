# PRISM Complete System Flow & Requirements

**Date:** December 9, 2025
**Status:** Requirements Clarification - Ready for Implementation

---

## Core Vision

PRISM is a **two-sided AI-powered platform** that bridges PR agencies (AOPR) and their clients through intelligent opportunity management with built-in collaboration and quality control.

---

## Complete End-to-End Flow

### **STAGE 1: Opportunity Ingestion & Validation (Happens in PRISM)**

```
[1] Email arrives in Zoho Mail (newsroom alert)
         ↓
[PRISM Auto-Detection] → PRISM has real-time awareness via:
    • Email forwarding from Zoho
    • PRISM polls Zoho inbox for new emails (every 5 min)
    • Opportunity immediately available in PRISM system
         ↓
[2] PRISM Assessment & Validation
    • Parse email content
    • Extract: deadline, media type, outlet, requirements
    • Assess alignment with PRISM Opportunities framework
    • AI tags: topic, industry, media type, client fit indicators
         ↓
[3] Quality Gate - Human in Loop (INSIDE PRISM)
    ✓ If email is valid/complete → Auto-advance to next stage
    ⚠️ If issues detected (missing deadline, unclear requirements, etc.)
       → Flag for AOPR admin review & clarification
    ❌ If spam/irrelevant → Mark for discard
         ↓
[4] AOPR Admin Reviews & Routes
    • Reviews flagged issues (if any)
    • Selects which client(s) opportunity applies to
    • Can add notes/context for clients
    • Approves for client delivery
         ↓
[Status: "Ready for Client Alert"]
```

---

### **STAGE 2: Client Alert & Initial Response**

```
[5] PRISM Sends Real-Time Client Alert
    Via: Email OR In-App Notification OR Both
    Contains:
    • Opportunity title & description
    • Deadline & media type
    • Why it's relevant to THIS client
    • Quick response buttons: "Interested" / "Accept" / "Decline"
         ↓
[6] Client Initial Response
    Client clicks:
    • "Accept" → Move to Stage 3
    • "Interested" → Move to Stage 3
    • "Decline" → Mark complete (optional follow-up)
```

---

### **STAGE 3: Client Questions & Clarification (NEW - Two-Way Dialogue)**

```
[7] Client Has Questions/Concerns
    Client: "We're interested but have questions about..."
    • Chatbot captures the question
    • Question attached to opportunity
    • Routed to AOPR rep for review
         ↓
[8] AOPR Rep Reviews Client Question
    If AOPR can answer:
    • Responds directly to client
    • Answer appears in chat with opportunity
    • Client sees answer & can Accept/Decline

    If AOPR cannot answer:
    • Escalates question to opportunity originator
    • "Can you clarify requirement X for our client?"
    • Routes back to journalist/outlet
         ↓
[9] Opportunity Originator Responds
    • Provides clarification to AOPR
    • AOPR formats response for client
    • Sends updated answer back to client with opportunity
         ↓
[10] Client Makes Final Decision
     With updated information, client:
     • Accepts
     • Declines
     • Asks follow-up question (loop back to step 7)
```

---

### **STAGE 4: Task Management & Follow-Up**

```
[11] Auto-Generated Tasks (System Suggests)
     When client accepts → System suggests:
     • Schedule media training
     • Collect marketing assets
     • Prepare spokesperson
     • Coordinate scheduling

[12] Manual Task Creation (AOPR Control)
     AOPR rep can also:
     • Add custom tasks for specific opportunity
     • Assign tasks to specific clients
     • Set deadlines & priorities
     • Add task notes & context
         ↓
[13] Task Tracking & Execution
     • Tasks visible in AOPR dashboard
     • Status: Pending / In-Progress / Completed
     • Reminders & notifications
     • Track completion rates
```

---

### **STAGE 5: Dashboard & Analytics**

```
[14] AOPR Dashboard Shows:
     ✓ All opportunities & their status
     ✓ Client responses (Accept / Interested / Decline / Pending)
     ✓ Questions awaiting AOPR review
     ✓ Escalations to opportunity originators
     ✓ All related tasks & completion status
     ✓ Performance metrics: response rates, turnaround times, outcomes
         ↓
[15] Performance Insights
     • Which clients respond fastest?
     • Which opportunity types get highest acceptance?
     • Which deadlines get missed?
     • Which clients need follow-up reminders?
```

---

## Key System Components

### **1. Email Ingestion (STAGE 1: Already built)**
- ✅ PRISM polls Zoho Mail for new emails
- ✅ Option to manually upload/forward emails
- ✅ Real-time awareness when opportunities arrive

### **2. Opportunity Validation (STAGE 1: Needs implementation)**
- ❌ Parse email for required fields (deadline, outlet, requirements)
- ❌ AI assessment: alignment with framework
- ❌ Validation: flag incomplete/suspicious emails
- ❌ Quality gate: decide if valid or needs review

### **3. Client Routing (STAGE 1: Partially built)**
- ✅ AOPR admin selects clients
- ❌ Suggest which clients based on fit indicators
- ❌ Add context/notes for specific clients

### **4. Client Alert System (STAGE 2: NOT BUILT)**
- ❌ Email notification to clients with opportunity details
- ❌ In-app notification (if client portal exists)
- ❌ Quick response buttons (Interested/Accept/Decline)
- ❌ Deep link to full opportunity details

### **5. Question/Clarification System (STAGE 3: NOT BUILT - NEW)**
- ❌ Client chat interface for questions
- ❌ Chatbot to capture & route questions
- ❌ AOPR review queue for client questions
- ❌ Escalation to opportunity originator
- ❌ Answer workflow & notification back to client
- ❌ Multi-round Q&A attached to single opportunity

### **6. Task Management (STAGE 4: Partially built)**
- ✅ Auto-generate tasks on acceptance
- ❌ Manual task creation by AOPR
- ❌ Task assignment to specific clients/opportunities
- ✅ Task status tracking
- ❌ Task completion reminders

### **7. Dashboard & Analytics (STAGE 5: Partially built)**
- ✅ Opportunity list & client responses
- ❌ Question review queue
- ❌ Escalation tracking
- ❌ Performance metrics & insights

---

## What "Human in the Loop" Means

**NOT:** Filter emails before they enter PRISM
**NOT:** Require approval at every step

**YES:**
1. **Quality gate inside PRISM** - Flag emails with issues automatically
2. **Routing decision** - AOPR decides which clients get notified
3. **Question handling** - AOPR bridges client questions to originators
4. **Task oversight** - AOPR can manually add/manage tasks

The system automates everything it can. Humans step in only when:
- Email has validation issues
- Need to route to clients
- Client has a question AOPR can't auto-answer
- Manual tasks need to be created

---

## Critical Design Principles

### **Principle 1: Nothing Gets Missed**
- PRISM has real-time awareness of incoming opportunities
- No email needs human approval before entering PRISM
- Validation happens inside PRISM with alerts, not gatekeeping

### **Principle 2: AOPR Controls the Gate**
- AOPR decides which clients see which opportunities
- AOPR reviews flagged emails (not all emails)
- AOPR manages client communication

### **Principle 3: Clients Stay in the Loop**
- Clients can ask questions without accepting/declining
- Questions loop back to originators if needed
- Clients make decisions with complete information

### **Principle 4: System Suggests, AOPR Decides**
- Tasks auto-generate but AOPR can override/add
- Client fit suggested but AOPR picks final clients
- Task assignments auto but AOPR customizes

---

## Implementation Phases

### **Phase 2A (MVP - IMMEDIATE):**
- ✅ Email ingestion (we have this)
- ✅ Opportunity validation & flagging
- ✅ AOPR routing to clients
- ✅ Send client alerts (email)
- ✅ Client response collection (email + in-app)
- ✅ Task auto-generation
- ✅ Dashboard with responses

**This gets you the core flow working by Dec 18**

### **Phase 2B (Enhancement - Jan/Feb):**
- ❌ Client questions & clarification system
- ❌ Chatbot for question capture
- ❌ Escalation to opportunity originators
- ❌ Answer workflow
- ❌ Manual task creation UI
- ❌ Advanced analytics

**This completes the full collaboration loop**

---

## Why This Matters

**Current System (Without Q&A Loop):**
```
Client: "I'm interested but have questions"
        → Client never responds
        → Opportunity missed
```

**Complete System (With Q&A Loop):**
```
Client: "I'm interested but have questions"
        → Chat captures question
        → AOPR routes to journalist
        → Journalist answers
        → Client sees answer
        → Client accepts
        → Opportunity captured + tasks generated
```

**Difference:** You go from lost opportunities to captured ones.

---

## Next Steps

**Immediate (This week):**
1. ✅ Email ingestion complete & production-ready
2. Opportunity validation & flagging system
3. Client alert system (email delivery)
4. Dashboard update for client responses

**By Dec 18 Demo:**
- Full Stage 1-2 flow working
- Real clients can respond
- AOPR sees everything in dashboard

**Post-Demo (Jan/Feb):**
- Add Q&A/clarification system
- Add manual task creation
- Add advanced analytics

---

**Key Insight:** The system's value comes from **not missing opportunities**. Email ingestion alone doesn't do that. You need the full flow where:

1. Emails come in automatically ✓
2. AOPR routes them ✓
3. Clients are notified ✓
4. Clients can ask questions ✗ (missing)
5. Q&A gets answered ✗ (missing)
6. Clients decide with full info ✓
7. AOPR sees everything ✓

The Q&A loop is what converts "interested" into "accepted." Without it, you lose deals.

