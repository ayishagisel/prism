# PRISM Parallel Build Instructions
**Date:** December 10, 2025
**Strategy:** 4 simultaneous Claude Code instances

---

## Instance 1: Demo Mode Route (THIS INSTANCE)
**Status:** READY TO START
**Priority:** HIGH
**Estimated Time:** 30-45 minutes

### Task:
Build the `/demo` route with agency/client view toggle for Dec 18 demo.

### Files to Create:
- `frontend/src/app/demo/page.tsx`
- `frontend/src/components/demo/ViewToggle.tsx`

### Requirements:
- Toggle between "Agency View" and "Client View"
- Pre-populated with AOPR demo data
- Show complete workflow (opportunities → client responses → tasks)
- Agency view: Full dashboard with opportunities, responses, tasks
- Client view: Client portal with 4 tabs (New/Interested/Accepted/Declined)
- No authentication required (demo only)
- Match Figma design aesthetic

### Demo Data Needed:
- 2 agencies (AOPR + Demo Agency)
- 6 clients per agency
- 12 opportunities total
- Mix of response states (pending, interested, accepted, declined)
- Sample Q&A chat messages
- Sample tasks

### Success Criteria:
- `/demo` route accessible
- Toggle switches between views smoothly
- Both views render with demo data
- Matches Figma design colors/styling

---

## Instance 2: Client Dashboard with Tabs (NEW TERMINAL)
**Priority:** HIGH
**Estimated Time:** 45-60 minutes

### Prompt for Instance 2:
```
I'm building the PRISM client portal dashboard as part of a parallel build.

Build the client dashboard with 4 tabs: New, Interested, Accepted, Declined.

Files to create:
- frontend/src/app/client/dashboard/page.tsx
- frontend/src/components/client/TabNavigation.tsx

Requirements:
1. Tab Navigation:
   - New (badge with count)
   - Interested (badge with count)
   - Accepted (badge with count)
   - Declined (badge with count)

2. Alert Banner:
   - Red background
   - Bell icon
   - "You have X new opportunities!"
   - Urgency message about deadlines

3. Tab Content:
   - New tab: Filter opportunities where response_state = 'pending'
   - Interested tab: Filter where response_state = 'interested'
   - Accepted tab: Filter where response_state = 'accepted'
   - Declined tab: Filter where response_state = 'declined'

4. State Management:
   - activeTab state (controls which tab is shown)
   - Controlled tabs with value={activeTab} and onValueChange={setActiveTab}
   - When "Ask Questions" clicked, auto-switch to 'interested' tab

5. Design:
   - Match Figma colors: Red (#E53E3E), Blue, Green, Purple
   - Clean, modern UI with soft shadows
   - Rounded cards

Success criteria:
- All 4 tabs render correctly
- Tab counts show accurate numbers
- Switching tabs works smoothly
- Alert banner shows when new opportunities exist
- Ready to receive OpportunityCard components from Instance 3

Note: OpportunityCard component will be built separately in Instance 3.
Use a placeholder for now like: <div>Opportunity cards will go here</div>
```

---

## Instance 3: Opportunity Card Component (NEW TERMINAL)
**Priority:** HIGH
**Estimated Time:** 45-60 minutes

### Prompt for Instance 3:
```
I'm building the OpportunityCard component for PRISM client portal as part of a parallel build.

Build the opportunity card component that displays differently based on which tab it's in.

Files to create:
- frontend/src/components/client/OpportunityCard.tsx

Requirements:
1. Card displays:
   - Title (e.g., "Essence: Feature on Women Founders")
   - Status badges: "PR" (purple), "New!" (yellow), "Interested" (blue), "Accepted" (green)
   - Description with "Read more" link (red)
   - Metadata:
     * Media Type: (e.g., "Feature Article")
     * Deadline: (calendar icon, red text)

2. Conditional buttons based on tab:
   - New tab: [Accept (green)] [Ask Questions (red outline)] [Decline (gray)]
   - Interested tab: [Accept Now (green)] + Q&A chat panel
   - Accepted tab: [Contact AOPR] button
   - Declined tab: [Request Restore] (only if deadline not passed)

3. Button Actions:
   - Accept: Update response_state to 'accepted'
   - Ask Questions: Update response_state to 'interested', switch to interested tab, open chat
   - Decline: Update response_state to 'declined'
   - Request Restore: Create restore_request record
   - Contact AOPR: Open chat panel

4. Props Interface:
   - opportunity: Opportunity object
   - responseState: 'pending' | 'interested' | 'accepted' | 'declined'
   - onStatusChange: callback function
   - onOpenChat: callback function

5. Design:
   - Match Figma design
   - Clean card with border and shadow
   - Proper spacing and typography
   - Color-coded badges

Success criteria:
- Card renders correctly for all 4 states
- Buttons show/hide based on state
- Clicking buttons triggers correct actions
- Ready to integrate into dashboard from Instance 2

Note: Dashboard is being built in Instance 2. This component should be standalone.
```

---

## Instance 4: Notification Services (NEW TERMINAL)
**Priority:** MEDIUM
**Estimated Time:** 60-90 minutes

### Prompt for Instance 4:
```
I'm building the notification services for PRISM as part of a parallel build.

Build both email and push notification services.

Files to create:
- backend/src/modules/notifications/email.service.ts
- backend/src/modules/notifications/push.service.ts
- backend/src/modules/notifications/notification.controller.ts
- backend/src/modules/notifications/templates/client-opportunity-alert.html

Requirements:

Email Service:
1. Send client opportunity alerts
2. Send restore request responses
3. Send AOPR notifications (client asked question, restore requested)
4. HTML email templates
5. Use existing backend email config (nodemailer already set up)

Push Notification Service:
1. Web Push API integration
2. Store push subscriptions in notification_preferences table
3. Send browser notifications when:
   - New opportunity assigned
   - AOPR responds to question
   - Restore request approved/denied
4. Handle subscription/unsubscription

Controller:
1. POST /api/notifications/subscribe (save push subscription)
2. POST /api/notifications/unsubscribe
3. POST /api/notifications/send (internal use for triggering notifications)
4. GET /api/notifications/preferences/:userId

Database:
- Use notification_preferences table (already created)
- Store email_enabled, push_enabled, push_subscription

Success criteria:
- Email service can send templated emails
- Push service can send browser notifications
- API endpoints work correctly
- Preferences are saved/retrieved correctly

Note: Frontend components are being built separately. These are backend services only.
```

---

## 📊 Coordination Strategy

### **Progress Tracking:**
Each instance should update this file when they complete milestones:

Create: `PARALLEL_BUILD_PROGRESS.md`
```markdown
# Parallel Build Progress

## Instance 1: Demo Mode
- [ ] Route created
- [ ] Toggle component built
- [ ] Agency view rendered
- [ ] Client view rendered
- [ ] Demo data populated
- [ ] Styling matches Figma

## Instance 2: Client Dashboard
- [ ] Page route created
- [ ] Tab navigation built
- [ ] Alert banner added
- [ ] State management working
- [ ] All 4 tabs rendering
- [ ] Styling complete

## Instance 3: Opportunity Cards
- [ ] Component created
- [ ] All 4 states implemented
- [ ] Buttons conditional on state
- [ ] Actions trigger correctly
- [ ] Styling matches Figma
- [ ] Ready for integration

## Instance 4: Notifications
- [ ] Email service created
- [ ] Email templates built
- [ ] Push service created
- [ ] Controller endpoints added
- [ ] Database integration working
- [ ] Tested successfully
```

### **Git Coordination:**
1. Each instance works on different files (no conflicts)
2. Commit frequently with descriptive messages
3. Pull before committing if needed
4. Don't merge/integrate until all instances are done

### **Communication:**
- Instance 1 (you) coordinates overall
- Check progress file periodically
- When all done, integrate components together

---

## 🎯 Expected Timeline

**Hour 1:**
- All instances set up and working
- Basic structure created for each component

**Hour 2:**
- Core functionality implemented
- Components mostly working

**Hour 3:**
- Styling and polish
- Testing and bug fixes

**Total:** ~3 hours for all 4 tracks to complete

---

## ✅ Integration Phase (After All Instances Complete)

**Step 1:** Verify all components built
**Step 2:** Integrate OpportunityCard into Dashboard
**Step 3:** Connect notification services to frontend
**Step 4:** Test complete flow
**Step 5:** Commit everything

---

## 🚨 If Something Goes Wrong

**File Conflicts:**
- Stop immediately
- Coordinate which instance should handle the file
- Other instance waits or pivots to different task

**Dependencies:**
- If one instance is blocked waiting for another, document it
- Move to next independent task or pause

**Unclear Requirements:**
- Refer to Figma screenshots in `/Users/ayishaoglivie/Desktop/AOPR - PRISM PROJECT/Figma/`
- Check PRISM_COMPLETE_FLOW_REQUIREMENTS.md
- Ask coordinating instance (Instance 1)

---

Ready to launch! 🚀
