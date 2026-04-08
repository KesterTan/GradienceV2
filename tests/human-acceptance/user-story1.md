# User Story 1: Login, Session Persistence, and Protected Route Access

## Prerequisites

- The application is running:
	- `npm run build`
	- `npm run start`
- A user account exists with valid credentials.
- At least one protected page exists (e.g., dashboard).
- The user starts in a logged-out state.

## Steps

1. Navigate to the login page.
2. Enter a valid email and password.
3. Click “Log In”.
4. Confirm you are redirected to the dashboard.
5. Refresh the page.
6. Confirm you remain logged in.
7. Open a protected page via URL.
8. Confirm access is granted.
9. Click “Log Out”.
10. Confirm redirect to login page.
11. Attempt to access a protected page again.
12. Confirm access is denied or redirected.

## Metrics (and Why)

### 1. Authentication Success Rate

Measures % of users who log in successfully on first attempt.

- Lean Startup: Measures activation (can users get into product?)
- Mom Test: Observes real behavior, not opinion
- Why it matters: If login fails or is confusing, nothing else matters

### 2. Session Persistence Reliability

Measures whether users stay logged in across refresh/navigation.

- Lean Startup: Retention signal (short-term stickiness)
- Why: Frequent logouts kill usability → direct churn risk

### 3. Trust in Secure Access

Measures perceived safety of login/logout flow.

- Mom Test: Users won’t say “I like security,” but will reveal distrust
- Why: AI grader handles sensitive academic data → trust = willingness to pay

## Survey Questions

1. On a scale of 1–5, how smoothly were you able to get into your account without retrying or troubleshooting?

> **Metric covered — Authentication success clarity:** This question measures whether the login flow is clear enough for a user to authenticate successfully on the first try without confusion. A score of 1 indicates the user encountered uncertainty, failed attempts, or needed troubleshooting; a score of 5 indicates the path to successful login was obvious and frictionless.

Answer: **5 / 5** — Login worked on the first attempt, and the form behavior made it clear what to enter.

2. After logging in, how predictable did the system feel when refreshing or navigating between pages (1–5)?

> **Metric covered — Session persistence reliability:** This question measures whether authenticated state remains stable across page refreshes and route navigation. A score of 1 indicates frequent unexpected sign-outs or inconsistent behavior; a score of 5 indicates the session stayed active consistently and behavior matched user expectations.

Answer: **5 / 5** — After refresh and moving between pages, I remained logged in throughout, so the session felt reliable.

3. If you had to use this for real coursework, how comfortable would you feel relying on it to keep your account secure? (1–5)

> **Metric covered — Trust in secure access controls:** This question measures user confidence that access is protected correctly through login/logout and protected-route enforcement. A score of 1 indicates low trust or concern about unauthorized access; a score of 5 indicates strong confidence that account access is handled securely.

Answer: **5 / 5** — Protected pages were accessible only when logged in, and after logout I was redirected and blocked from protected routes.

## Classmate Testing

**Classmate:** Evelyn Lui

### Attempt 1 Responses

- **Q1:** 5 — Login worked on first attempt with no confusion.
- **Q2:** 4 — Session persisted after refresh and route navigation, but there was a brief loading delay.
- **Q3:** 4 — I feel comfortable using it for coursework, but I’d like clearer feedback when logout completes.

**Result:** Pass

### Notes / Improvements

- Add a short “Logging out…” / “Logged out successfully” toast for better feedback.
- Reduce dashboard post-login loading delay if possible.
- Consider a small session-status indicator in the header for confidence.
- Sometimes there is some lag so when I click multiple times it throws an error.

### Overall Result

- [x] Pass
- [ ] Fail
