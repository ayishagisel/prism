# CI/CD Pipeline Documentation

## Overview

The PRISM platform uses GitHub Actions to automate testing, building, and deployment. The pipeline ensures code quality and consistency across all commits.

## Workflows

### 1. CI Pipeline (`ci.yml`)
Runs on every push to `main` or `develop` branches and on all pull requests.

**Jobs:**
- **build-and-test**: Installs dependencies, builds backend and frontend, runs tests
- **code-quality**: Validates TypeScript types and linting
- **security-scan**: Runs npm audit for security vulnerabilities
- **notify-success/notify-failure**: Reports pipeline status

**What it checks:**
✅ Backend compiles without errors
✅ Frontend builds successfully
✅ All backend tests pass (Jest)
✅ TypeScript has no type errors
✅ Frontend linting passes
✅ No known security vulnerabilities

### 2. Deploy Workflow (`deploy.yml`)
Runs when code is merged to `main` branch.

**What it does:**
- Builds entire application
- Runs full test suite
- Prepares deployment artifacts
- Logs deployment readiness

## How to Use

### For Developers

**Push your code:**
```bash
git push origin feature-branch
```

**GitHub Actions automatically:**
1. Checks out your code
2. Installs dependencies (with caching)
3. Builds both backend and frontend
4. Runs all tests
5. Reports results

**If CI fails:**
- Check the workflow logs in GitHub
- Common issues:
  - `npm run build` errors → TypeScript compilation issues
  - `npm run test` errors → Test failures
  - Linting errors → Run `npm run lint -w frontend` locally

**Before merging to main:**
- All CI checks must pass ✅
- Code review approved
- No conflicts with main branch

### Local Testing

Test locally before pushing to match CI environment:

```bash
# Install dependencies
npm install

# Build everything
npm run build

# Run tests
npm run test -w backend

# Check types
npx tsc --noEmit
```

## GitHub Secrets (Optional)

If you need to add deployment credentials later:

1. Go to repo Settings → Secrets and variables → Actions
2. Add secrets like:
   - `DEPLOY_KEY` (SSH key for server)
   - `DATABASE_URL` (for staging)
   - `AWS_CREDENTIALS` (for email/storage)

Reference in workflows as `${{ secrets.SECRET_NAME }}`

## Customization

### Add more tests
Edit `npm run test` commands in workflows

### Add linting for backend
```yaml
- name: Lint backend
  run: npm run lint -w backend
```

### Add Docker builds
```yaml
- name: Build Docker image
  run: docker build -t prism:latest .
```

### Add automatic deployments
```yaml
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: |
    ssh user@server "cd /app && git pull && npm install && npm run build"
```

## Troubleshooting

**"Node modules not cached"**
- First run is slower, subsequent runs use cache
- Clear cache in Actions tab if needed

**"Tests fail locally but pass in CI"**
- Check Node version: `node --version` (CI uses 18.x)
- Check if env files are missing
- Ensure database migrations are run

**"Workflow file syntax error"**
- Validate YAML at [yamllint.com](https://yamllint.com)
- GitHub shows error line in logs

## Status Badges

Add to your README:
```markdown
![CI/CD](https://github.com/ayishagisel/prism/actions/workflows/ci.yml/badge.svg)
```

## Next Steps

1. Push this commit to GitHub
2. Watch the Actions tab for workflow execution
3. Fix any failures
4. Once passing, add deployment targets for staging/production
