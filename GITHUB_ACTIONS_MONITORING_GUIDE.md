# GitHub Actions CI/CD Monitoring Guide

**Purpose:** How to view, monitor, and debug your GitHub Actions CI/CD pipeline

**Date:** December 4, 2025

---

## 🚀 Quick Start: See Your CI/CD in Action

### Step 1: Push Code to GitHub
```bash
git push origin main
```
or push from a feature branch:
```bash
git push origin feature-branch
```

### Step 2: Go to GitHub Actions Tab
1. Open your repository on GitHub
2. Click the **"Actions"** tab at the top
3. You'll see your workflow run in progress

That's it! Your CI/CD is now running.

---

## 🔍 Viewing CI/CD Results

### Method 1: GitHub Web Interface (Easiest)

#### Navigate to Actions Tab
```
Your Repo → Actions Tab → Select Workflow Run
```

**URL Pattern:**
```
https://github.com/YOUR_USERNAME/prism/actions
```

Example for this project:
```
https://github.com/ayishagisel/prism/actions
```

#### What You'll See
- **Workflow Name** — CI or Deploy
- **Commit Message** — What triggered it
- **Status** — ✅ Passed or ❌ Failed
- **Duration** — How long it took
- **Author** — Who pushed the code
- **Time** — When it ran

#### View Detailed Logs
1. Click on the workflow run
2. Click the job name (e.g., "build-and-test")
3. Expand steps to see detailed logs

### Method 2: Command Line (For Quick Checks)

#### Using GitHub CLI
First, install GitHub CLI: https://cli.github.com/

```bash
# List recent workflow runs
gh run list --repo ayishagisel/prism

# View specific run details
gh run view RUN_ID --repo ayishagisel/prism

# Watch workflow run in real-time
gh run watch RUN_ID --repo ayishagisel/prism

# View logs for a specific job
gh run view RUN_ID --log --job build-and-test
```

#### Example Output
```
STATUS  TITLE                  BRANCH  EVENT  CONCLUSION  STARTED               ELAPSED
✓       Update AUDIT_REPORT    main    push   success     2025-12-04 15:30:00   45s
✗       Add Zoho Setup Guide   main    push   failure     2025-12-04 15:25:00   2m30s
✓       Fix type errors        main    push   success     2025-12-04 15:20:00   1m15s
```

---

## 📊 Understanding the Workflow Status

### Success (✅ Green Checkmark)
All jobs passed:
- ✅ Dependencies installed
- ✅ Backend built successfully
- ✅ Frontend built successfully
- ✅ Tests passed
- ✅ Type checking passed
- ✅ Linting passed
- ✅ Security scan passed

**What this means:** Your code is ready to merge and deploy!

### Failure (❌ Red X)
One or more jobs failed. Common reasons:

| Failure | Reason | How to Fix |
|---|---|---|
| **build-and-test fails** | TypeScript errors, build errors, or test failures | Check the logs, fix your code, push again |
| **code-quality fails** | Linting errors or type errors | Run `npm run lint -w frontend` locally, fix issues |
| **security-scan fails** | Vulnerability detected in dependencies | Update vulnerable packages with `npm audit fix` |
| **Notification fails** | Webhook configuration issue | Check GitHub notifications settings |

### Skipped (⊘ Gray)
Job didn't run. Reasons:
- A previous job failed (pipeline stops)
- Condition not met (e.g., deploy only on main branch)
- Manual skip

---

## 🔄 Your Workflows Explained

### 1. CI Workflow (`ci.yml`)

**Triggers:** Every push and pull request

**Jobs:**
```
┌─────────────────────────────────────────┐
│ Checkout Code                           │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ build-and-test                          │
│ • Install dependencies                  │
│ • Build backend (npm run build -w)       │
│ • Build frontend (npm run build -w)      │
│ • Run tests (npm run test -w backend)    │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ code-quality                            │
│ • TypeScript type check                 │
│ • Frontend linting                      │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ security-scan                           │
│ • npm audit (check vulnerabilities)     │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ notify-success / notify-failure         │
│ • Report status                         │
└─────────────────────────────────────────┘
```

**Duration:** 2-5 minutes

**View Results:**
```
GitHub → Actions → CI → Select Latest Run
```

### 2. Deploy Workflow (`deploy.yml`)

**Triggers:** Only when code merges to `main` branch

**Jobs:**
```
┌─────────────────────────────────────────┐
│ Checkout Code                           │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ build                                   │
│ • Build entire application              │
│ • Run full test suite                   │
│ • Prepare deployment artifacts          │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Report deployment readiness             │
└─────────────────────────────────────────┘
```

**Duration:** 3-6 minutes

**View Results:**
```
GitHub → Actions → Deploy → Select Latest Run
```

---

## 📱 Real-Time Monitoring

### Option 1: GitHub Web (Recommended)

**Watch In Real-Time:**
1. Go to Actions tab
2. Click the workflow run that's in progress
3. Expand job steps
4. Watch logs update live as the job runs

**Auto-Refresh:** GitHub auto-refreshes every few seconds

### Option 2: GitHub CLI (Terminal)

Watch in real-time from terminal:
```bash
gh run watch RUN_ID --repo ayishagisel/prism
```

Output updates every second as the job progresses.

### Option 3: GitHub Mobile App

Download GitHub Mobile app and:
1. Navigate to your repository
2. Tap "Actions"
3. Tap the workflow run
4. Watch logs in real-time

---

## 🔗 Direct Links to Your CI/CD

### GitHub Actions Dashboard
```
https://github.com/ayishagisel/prism/actions
```

### CI Workflow Runs
```
https://github.com/ayishagisel/prism/actions/workflows/ci.yml
```

### Deploy Workflow Runs
```
https://github.com/ayishagisel/prism/actions/workflows/deploy.yml
```

### Specific Run (replace RUN_ID with actual number)
```
https://github.com/ayishagisel/prism/actions/runs/RUN_ID
```

---

## 📋 Checking Specific Job Details

### Step-by-Step: View Full Logs

1. **Go to Actions tab**
   ```
   https://github.com/ayishagisel/prism/actions
   ```

2. **Click the workflow run**
   - Click the commit message or timestamp

3. **Click the job name**
   - Click "build-and-test" or "code-quality"

4. **Expand step details**
   - Click the arrow next to each step (Install Dependencies, Build Backend, etc.)

5. **Read the logs**
   - Full command output appears
   - Errors clearly highlighted in red
   - Click "Copy logs" to copy to clipboard

### Example: Debugging a Failed Build

**Failure shows:**
```
❌ build-and-test
  ├─ ✅ Checkout code
  ├─ ✅ Setup Node.js
  ├─ ✅ Install dependencies
  ├─ ❌ Build backend
  │  └─ Error: Cannot find module 'zoho'
  └─ ⊘ Build frontend (skipped)
```

**How to fix:**
1. Click the "Build backend" step
2. Read the error message
3. The error says "Cannot find module 'zoho'"
4. This means the `backend/src/config/zoho.ts` or `backend/src/modules/zoho/` is missing
5. Fix locally and push again
6. CI will re-run automatically

---

## 🎯 Workflow Status Checks on Pull Requests

### For Pull Requests (PRs)

When you create a PR:
1. GitHub automatically runs the CI workflow
2. Results show at the bottom of the PR

**What you see:**
```
All checks passed
✅ build-and-test
✅ code-quality
✅ security-scan
```

**If any check fails:**
```
Some checks were not successful
❌ build-and-test — 3 test failures
⚠️ code-quality — 5 linting errors
✅ security-scan
```

**Before merging:**
- All checks must be ✅ green
- Code must be reviewed
- No conflicts with main branch

---

## 🚨 Common Issues & Debugging

### Issue 1: Build Fails with "Cannot find module"

**What you see:**
```
Error: Cannot find module '@/lib/api'
```

**Why it happens:**
- File doesn't exist
- Import path is wrong
- Case sensitivity issue (Mac/Windows vs Linux)

**How to fix:**
```bash
# Locally, find the file
find . -name "api.ts"

# Check the import path matches exactly
# Then push the fix
git push origin feature-branch
```

### Issue 2: Tests Fail

**What you see:**
```
FAIL  auth.test.ts
  ✓ JWT token generation
  ✗ Password hashing
    Expected: ...
    Received: ...
```

**How to fix:**
```bash
# Run tests locally to debug
npm run test -w backend

# Fix the code
# Push again
git push origin feature-branch
```

### Issue 3: Linting Errors

**What you see:**
```
ESLint error in components/Button.tsx:24:5
  Unexpected var, use let or const instead
```

**How to fix:**
```bash
# Run linting locally
npm run lint -w frontend

# Fix automatically
npx eslint --fix frontend/src

# Or manually fix the error
# Then push
git push origin feature-branch
```

### Issue 4: Security Vulnerabilities

**What you see:**
```
npm audit
found 3 vulnerabilities (1 high, 2 moderate)
```

**How to fix:**
```bash
# Check vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Or manually update packages in package.json
# Then push
git push origin feature-branch
```

### Issue 5: Workflow Doesn't Run

**Possible reasons:**
- ❌ Pushing to wrong branch (CI runs on main and develop only)
- ❌ Workflow file syntax error
- ❌ GitHub Actions disabled in settings
- ❌ No changes detected (force push might be needed)

**How to fix:**
```bash
# Make sure you're on main or develop
git branch -a

# Or push to main
git push origin feature-branch:main

# Check workflow file syntax
yamllint .github/workflows/ci.yml
```

---

## 📊 Monitoring Dashboard

### Best GitHub Actions View

**For Development:**
```
https://github.com/ayishagisel/prism/actions/workflows/ci.yml
```
- See all CI runs
- Click any to see details
- Auto-refreshes

**For Production (Main Branch):**
```
https://github.com/ayishagisel/prism/actions/workflows/deploy.yml
```
- See all deploy runs
- Track deployment history
- See what version is live

---

## 💡 Pro Tips

### Tip 1: Add Status Badge to README
Shows CI status on your README:

```markdown
![CI/CD](https://github.com/ayishagisel/prism/actions/workflows/ci.yml/badge.svg)
```

This displays as a green checkmark if CI passes.

### Tip 2: Download Artifacts
If workflows produce artifacts (logs, builds):

1. Go to workflow run
2. Scroll to bottom
3. Click "Artifacts" section
4. Download the artifact

### Tip 3: Re-run Failed Workflows
If CI fails and you've fixed it:

1. Go to the failed workflow run
2. Click "Re-run all jobs" button
3. CI runs again without needing a new commit

### Tip 4: Schedule Regular Builds
You can set workflows to run on a schedule:

```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

### Tip 5: Notifications
Configure GitHub to notify you:

1. Settings → Notifications
2. Choose: Email, Web, Desktop
3. Select when to notify: Always, Failures only, etc.

---

## 🔐 Secrets in GitHub Actions

### Your CI/CD Uses Secrets For:
- Deploy credentials (when configured)
- AWS/API keys (when configured)
- Database URLs (when configured)

### View/Add Secrets:
1. Go to repo Settings
2. Click "Secrets and variables" → "Actions"
3. Add new secret: Click "New repository secret"
4. Name: `DEPLOY_KEY`
5. Value: [your secret value]

### Reference in Workflow:
```yaml
- name: Deploy
  env:
    DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
  run: ./deploy.sh
```

**Current Secrets (if any):**
```bash
# View secret names (not values) in Settings
# Go to: Settings → Secrets and variables → Actions
```

---

## 📅 Your CI/CD Timeline

### What Happens When You Push

```
1. You push code
   ↓ (GitHub detects push)
2. GitHub Actions triggered
   ↓ (Within seconds)
3. Workflow starts running
   ├─ Checkout code
   ├─ Setup Node.js
   ├─ Install dependencies (2-3 min with cache)
   ├─ Build backend (30-60 sec)
   ├─ Build frontend (1-2 min)
   ├─ Run tests (1-2 min)
   ├─ Type check (30-60 sec)
   ├─ Lint (30-60 sec)
   └─ Security scan (30-60 sec)
   ↓
4. Total time: ~5-10 minutes
   ↓
5. Status reported ✅ or ❌
   ↓
6. Result shows on your PR/commit
```

---

## 🎯 Your CI/CD Configuration Files

### CI Workflow
```
.github/workflows/ci.yml
```

### Deploy Workflow
```
.github/workflows/deploy.yml
```

### To View/Edit:
```bash
# View CI workflow
cat .github/workflows/ci.yml

# View Deploy workflow
cat .github/workflows/deploy.yml

# Edit (make changes and push)
# GitHub will automatically use the updated workflow
```

---

## ✅ Recommended Workflow

### For Every Code Change

1. **Make changes locally**
   ```bash
   git checkout -b feature/my-feature
   # Make your changes
   ```

2. **Test locally before pushing**
   ```bash
   npm run build
   npm run test -w backend
   npm run lint -w frontend
   ```

3. **Push to feature branch**
   ```bash
   git push origin feature/my-feature
   ```

4. **Watch CI run** (go to Actions tab)
   ```
   https://github.com/ayishagisel/prism/actions
   ```

5. **All checks pass?** → Create PR
   - Go to GitHub
   - Click "Create Pull Request"
   - GitHub will re-run CI on the PR

6. **All checks still pass?** → Merge to main
   - Click "Merge pull request"

7. **Deploy workflow runs automatically**
   - Triggered by merge to main
   - Builds and deploys (when configured)

---

## 📞 Quick Reference: Commands

```bash
# List recent runs
gh run list --repo ayishagisel/prism

# View specific run
gh run view RUN_ID

# Watch run in real-time
gh run watch RUN_ID

# View logs for a job
gh run view RUN_ID --log --job build-and-test

# Re-run failed workflow
gh run rerun RUN_ID

# Check local build before pushing
npm run build

# Check local tests before pushing
npm run test -w backend

# Check local linting before pushing
npm run lint -w frontend
```

---

## 🎓 Learning Resources

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **GitHub CLI Docs:** https://cli.github.com/
- **YAML Syntax:** https://yamllint.com/ (validate your workflows)
- **Cron Syntax:** https://crontab.guru/ (for scheduled workflows)

---

**Last Updated:** December 4, 2025
**Reference:** docs/CICD_README.md (your detailed CI/CD documentation)

