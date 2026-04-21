Write machine-executable tests for the regrade-request story using the repository's existing test frameworks and conventions.

Requirements:
- Use real tests in Vitest or Jest, not pseudo-tests.
- Focus on observable story behavior and regression risk.
- Reuse existing mocking patterns from nearby tests when possible.
- Prefer concise, high-value cases over exhaustive low-signal duplication.

Story behaviors to cover:
- Student can create a regrade request only when authenticated, enrolled as a student, owns the submission, and the grade is released.
- Duplicate pending requests are rejected.
- Instructor-only resolution is enforced.
- Missing or already resolved regrade requests are handled cleanly.
- Successful resolution returns success and updates the correct helper calls.

Output format:
1. Test file targets
2. Proposed test cases
3. Any required mocks or fixtures
4. Why each test matters
