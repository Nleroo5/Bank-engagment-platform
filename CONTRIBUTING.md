# Contributing to Bank Engagement Platform

## Code Quality & Deployment Standards

This document outlines the expert-level audit procedures and best practices implemented to ensure **100% build success** and prevent deployment errors.

## 🛡️ Multi-Layer Validation System

We implement a **defense-in-depth** strategy with multiple layers of validation:

```
Local Development → Pre-commit → Pre-push → CI/CD → Production
```

### Layer 1: Pre-Commit Hooks (Local)

**Automatically runs before every commit:**
- TypeScript type checking (`tsc --noEmit`)
- ESLint validation
- Prevents commits with type errors

```bash
# Configured in .husky/pre-commit
# To bypass (not recommended): git commit --no-verify
```

### Layer 2: Pre-Push Hooks (Local)

**Automatically runs before every push:**
- Full TypeScript type check
- ESLint validation
- **Production build test** (catches build errors before CI)

```bash
# Configured in .husky/pre-push
# This prevents pushing broken code to remote
```

### Layer 3: Code Audit Script

**Run manually before major changes:**
```bash
npm run audit        # Quick code audit
npm run audit:full   # Full audit + build + tests
```

The audit script checks for:
- ✅ Duplicate object properties (common TypeScript error)
- ✅ Explicit `any` types (anti-pattern)
- ✅ Unsafe array access without null checks
- ✅ Missing `_type` properties in Sanity objects
- ✅ Console statements in production code
- ✅ Unused imports

### Layer 4: GitHub Actions CI/CD

**Runs on every push and PR:**
- Multi-version Node.js testing (18.x, 20.x)
- Full production build
- Type checking
- Linting
- Code formatting validation
- Test suite execution
- TypeScript coverage report

See: [.github/workflows/ci.yml](.github/workflows/ci.yml)

## 📋 Development Workflow

### Before Starting Work

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install/update dependencies
npm install

# 3. Generate Prisma client
npm run db:generate
```

### During Development

```bash
# Run dev server
npm run dev

# Type check (fast feedback)
npm run type-check

# Lint
npm run lint

# Format code
npm run format
```

### Before Committing

```bash
# 1. Run full validation (recommended)
npm run validate

# 2. Run audit for complex changes
npm run audit

# 3. Commit (hooks will run automatically)
git commit -m "Your message"
```

### Before Pushing

```bash
# Pre-push hook will automatically:
# - Type check entire project
# - Lint all files
# - Run production build test

# If you need to push urgently (NOT RECOMMENDED):
git push --no-verify
```

## 🔧 NPM Scripts Reference

### Validation Scripts
- `npm run validate` - Type check + lint + format check
- `npm run validate:build` - Validation + production build
- `npm run pre-deploy` - Full check: validation + build + tests
- `npm run audit` - Code quality audit
- `npm run audit:full` - Comprehensive audit with build and tests

### Development Scripts
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run type-check` - TypeScript validation
- `npm run lint` - ESLint check
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Testing Scripts
- `npm run test` - Run unit tests
- `npm run test:watch` - Watch mode for tests
- `npm run test:e2e` - End-to-end tests

## 🚨 Common Issues & Solutions

### Issue: "Duplicate property" errors

**Problem:**
```typescript
return {
  invitationId: invitation.id,  // ❌ This will be overwritten
  ...scoringResult,              // Contains invitationId
};
```

**Solution:**
```typescript
return {
  userName: invitation.user.name,
  ...scoringResult,  // Put spread first or remove duplicate
};
```

### Issue: "Object is possibly undefined"

**Problem:**
```typescript
const data = payload[0].payload;  // ❌ payload[0] might be undefined
```

**Solution:**
```typescript
const data = payload[0]?.payload;  // ✅ Optional chaining
if (!data) return null;
```

### Issue: Build succeeds locally but fails on Vercel

**Root Causes:**
1. Forgot to push latest commit: `git push origin main`
2. Environment variables missing on Vercel
3. TypeScript strict mode differences
4. Node version mismatch

**Prevention:**
- Always use `npm run validate:build` before pushing
- Use pre-push hook (don't bypass with `--no-verify`)
- Check Vercel build logs for specific errors

### Issue: next-auth module errors

**Problem:**
```
Could not find a declaration file for module 'next-auth'
```

**Solution:**
- Ensure `src/types/modules.d.ts` exists
- Ensure `src/types/next-auth.d.ts` exists
- Run `npm run type-check` to verify

## 📚 TypeScript Best Practices

### 1. Avoid Explicit `any` Types

```typescript
// ❌ Bad
const data: any = fetchData();

// ✅ Good
const data: UserData = fetchData();

// ⚠️ Acceptable with eslint-disable (last resort)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async jwt({ token, user }: { token: any; user: any }) {
```

### 2. Use Optional Chaining

```typescript
// ❌ Bad
const name = user.profile.name;

// ✅ Good
const name = user?.profile?.name;
```

### 3. Type All Function Parameters

```typescript
// ❌ Bad
function processData(data) {

// ✅ Good
function processData(data: ResponseData[]): ProcessedResult {
```

### 4. Avoid Duplicate Properties

```typescript
// ❌ Bad - duplicate keys
const result = {
  id: computed.id,
  ...dbRecord,  // Also has 'id'
};

// ✅ Good - let spread provide the value
const result = {
  ...dbRecord,
  // Override only if needed
  customField: computed.value,
};
```

### 5. Always Include `_type` for Sanity Objects

```typescript
const category = {
  _id: cat._id,
  _type: 'category' as const,  // ✅ Required
  name: cat.name,
  weight: cat.weight,
};
```

## 🔍 Code Review Checklist

Before submitting a PR, verify:

- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes
- [ ] `npm run audit` shows no errors
- [ ] No `console.log` statements in production code
- [ ] No explicit `any` types (without eslint-disable)
- [ ] All async operations have error handling
- [ ] New files follow project structure conventions
- [ ] Environment variables documented in `.env.example`

## 🎯 Expert Tips

### Research-Backed Best Practices

Based on research from Google, Microsoft, and Airbnb style guides:

1. **Use `const` by default** - Prevents accidental reassignment
2. **Prefer early returns** - Reduces nesting and complexity
3. **Extract magic numbers** - Use named constants
4. **Write self-documenting code** - Clear names over comments
5. **Keep functions small** - Single responsibility principle
6. **Use TypeScript strict mode** - Catches errors at compile time
7. **Write tests for scoring logic** - Prevent regression
8. **Never bypass type checking** - No `@ts-ignore` without comment

### Performance Considerations

- Use `React.memo()` for expensive components
- Implement proper loading states
- Optimize database queries (use `include` for relations)
- Cache Sanity responses with `revalidateTag`
- Minimize client-side JavaScript bundles

### Security Guidelines

- Never commit `.env` files
- Hash sensitive data before storage
- Validate all user inputs with Zod
- Use parameterized queries (Prisma does this)
- Set secure cookie flags for authentication
- Rate limit API endpoints

## 📖 Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Next.js Production Checklist](https://nextjs.org/docs/going-to-production)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

## 🆘 Getting Help

If you encounter persistent build errors:

1. Run `npm run audit:full` for detailed diagnostics
2. Check GitHub Actions logs for CI failures
3. Review Vercel deployment logs
4. Compare with main branch: `git diff main`
5. Create an issue with error logs and steps to reproduce

---

**Remember:** The pre-commit and pre-push hooks exist to save you time by catching errors locally before they reach CI/CD. Don't bypass them unless absolutely necessary!
