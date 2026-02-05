# Idea Template

## Title
Brief, descriptive title

## Description
Clear explanation of what needs to be built/fixed/improved

## Context
Why is this needed? What problem does it solve?

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Technical Notes (Optional)
Any specific technical requirements, constraints, or suggestions

## Files Involved (Optional)
- `path/to/file1.js`
- `path/to/file2.js`

## Priority
Low | Medium | High | Critical

## Estimated Complexity
Low | Medium | High

## Labels
feature | bug | refactor | documentation | testing

---

## Example Ideas

### Example 1: Add User Authentication

**Description:** Implement JWT-based authentication system

**Context:** Users need secure login/logout functionality

**Acceptance Criteria:**
- [ ] Login endpoint with JWT generation
- [ ] Protected routes middleware
- [ ] Token refresh mechanism
- [ ] Logout functionality

**Technical Notes:**
- Use jsonwebtoken library
- Store tokens in httpOnly cookies
- 15min access token, 7d refresh token

**Priority:** High
**Complexity:** Medium

---

### Example 2: Refactor Database Connection

**Description:** Move from callback-based to promise-based database client

**Context:** Current callback hell makes code hard to maintain

**Acceptance Criteria:**
- [ ] Replace all db.query callbacks with async/await
- [ ] Add proper error handling
- [ ] Update tests
- [ ] No breaking changes to API

**Files Involved:**
- `db/connection.js`
- `db/queries/*.js`

**Priority:** Medium
**Complexity:** Medium
