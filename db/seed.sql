\set ON_ERROR_STOP on

BEGIN;
SET search_path TO gradience, public;

TRUNCATE TABLE
  feedback_comments,
  rubric_scores,
  grades,
  grading_assignments,
  submission_files,
  submissions,
  assignment_rubric_items,
  assignments,
  course_memberships,
  courses,
  users
RESTART IDENTITY CASCADE;

INSERT INTO users (first_name, last_name, email, password_hash, auth_provider_id, status) VALUES
('Irene','Instructor','irene@gradience.edu','$2b$10$instructor','auth0|irene','active'),
('Gary','Grader','gary@gradience.edu','$2b$10$grader','auth0|gary','active'),
('Stu','Student','stu@gradience.edu','$2b$10$student','auth0|stu','active');

INSERT INTO courses (title, course_code, term, description, created_by_user_id, start_date, end_date)
VALUES (
  'Intro to AI-Assisted Grading',
  'GRAD-101',
  'Spring 2026',
  'Pilot course for Gradience MVP.',
  (SELECT id FROM users WHERE email='irene@gradience.edu'),
  '2026-01-15',
  '2026-05-01'
);

INSERT INTO course_memberships (course_id, user_id, role)
SELECT c.id, u.id, v.role::course_membership_role
FROM (VALUES
  ('GRAD-101','irene@gradience.edu','grader'),
  ('GRAD-101','gary@gradience.edu','grader'),
  ('GRAD-101','stu@gradience.edu','student')
) AS v(course_code, email, role)
JOIN courses c ON c.course_code = v.course_code
JOIN users u ON u.email = v.email;

INSERT INTO assignments (
  course_id,
  title,
  description,
  assignment_type,
  total_points,
  release_at,
  due_at,
  late_until,
  submission_type,
  allow_resubmissions,
  max_attempt_resubmission,
  is_published,
  created_by_user_id
)
VALUES (
  (SELECT id FROM courses WHERE course_code='GRAD-101'),
  'Essay on Human-AI Collaboration',
  'Discuss benefits and risks of AI grading.',
  'written',
  100,
  '2026-02-01T09:00:00-05:00',
  '2026-02-15T23:59:00-05:00',
  '2026-02-18T23:59:00-05:00',
  'file_upload',
  true,
  2,
  true,
  (SELECT id FROM users WHERE email='irene@gradience.edu')
);

INSERT INTO assignment_rubric_items (assignment_id, title, description, max_points, display_order, grading_guidance) VALUES
((SELECT id FROM assignments WHERE title='Essay on Human-AI Collaboration'),'Thesis Clarity','Is the main argument clear and well-stated?',30,1,'Look for a clear thesis within first paragraph.'),
((SELECT id FROM assignments WHERE title='Essay on Human-AI Collaboration'),'Evidence Quality','Quality and relevance of supporting evidence.',40,2,'Cite at least three credible sources.'),
((SELECT id FROM assignments WHERE title='Essay on Human-AI Collaboration'),'Writing Mechanics','Grammar, spelling, and structure.',30,3,'Deduct 2 points per major grammar issue.');

INSERT INTO submissions (
  assignment_id,
  student_membership_id,
  attempt_number,
  submitted_at,
  status,
  text_content,
  file_url,
  ai_processed_status
)
VALUES (
  (SELECT id FROM assignments WHERE title='Essay on Human-AI Collaboration'),
  (
    SELECT cm.id
    FROM course_memberships cm
    JOIN courses c ON c.id = cm.course_id
    JOIN users u ON u.id = cm.user_id
    WHERE c.course_code='GRAD-101' AND u.email='stu@gradience.edu'
  ),
  1,
  '2026-02-14T20:15:00-05:00',
  'submitted',
  'Full essay text stored here.',
  'https://files.gradience.edu/submissions/essay1.pdf',
  'processing'
);

INSERT INTO submission_files (submission_id, file_url, mime_type, file_size)
VALUES (
  (SELECT s.id FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.title='Essay on Human-AI Collaboration'),
  'https://files.gradience.edu/submissions/essay1.pdf',
  'application/pdf',
  524288
);

INSERT INTO grading_assignments (submission_id, grader_membership_id, status)
VALUES (
  (SELECT s.id FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.title='Essay on Human-AI Collaboration'),
  (
    SELECT cm.id
    FROM course_memberships cm
    JOIN courses c ON c.id = cm.course_id
    JOIN users u ON u.id = cm.user_id
    WHERE c.course_code='GRAD-101' AND u.email='gary@gradience.edu'
  ),
  'in_progress'
);

INSERT INTO grades (
  submission_id,
  graded_by_membership_id,
  total_score,
  overall_feedback,
  is_released_to_student,
  released_at,
  graded_at
)
VALUES (
  (SELECT s.id FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.title='Essay on Human-AI Collaboration'),
  (
    SELECT cm.id
    FROM course_memberships cm
    JOIN courses c ON c.id = cm.course_id
    JOIN users u ON u.id = cm.user_id
    WHERE c.course_code='GRAD-101' AND u.email='gary@gradience.edu'
  ),
  88,
  'Strong arguments with minor citation issues.',
  true,
  '2026-02-20T10:00:00-05:00',
  '2026-02-19T16:30:00-05:00'
);

INSERT INTO rubric_scores (grade_id, rubric_item_id, points_awarded, comment) VALUES
((SELECT g.id FROM grades g JOIN submissions s ON s.id=g.submission_id JOIN assignments a ON a.id=s.assignment_id WHERE a.title='Essay on Human-AI Collaboration'),
 (SELECT id FROM assignment_rubric_items WHERE title='Thesis Clarity'),
 28, 'Clear thesis but introduction could be tighter.'),
((SELECT g.id FROM grades g JOIN submissions s ON s.id=g.submission_id JOIN assignments a ON a.id=s.assignment_id WHERE a.title='Essay on Human-AI Collaboration'),
 (SELECT id FROM assignment_rubric_items WHERE title='Evidence Quality'),
 35, 'Great sourcing, consider more diverse viewpoints.'),
((SELECT g.id FROM grades g JOIN submissions s ON s.id=g.submission_id JOIN assignments a ON a.id=s.assignment_id WHERE a.title='Essay on Human-AI Collaboration'),
 (SELECT id FROM assignment_rubric_items WHERE title='Writing Mechanics'),
 25, 'Minor grammatical errors.');

INSERT INTO feedback_comments (
  submission_id,
  author_membership_id,
  rubric_item_id,
  comment_type,
  content,
  page_number,
  anchor_data,
  is_visible_to_student
) VALUES
(
  (SELECT s.id FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.title='Essay on Human-AI Collaboration'),
  (
    SELECT cm.id
    FROM course_memberships cm
    JOIN courses c ON c.id = cm.course_id
    JOIN users u ON u.id = cm.user_id
    WHERE c.course_code='GRAD-101' AND u.email='gary@gradience.edu'
  ),
  (SELECT id FROM assignment_rubric_items WHERE title='Thesis Clarity'),
  'inline',
  'Highlight thesis earlier for stronger hook.',
  1,
  '{"start":120,"end":145}'::jsonb,
  true
),
(
  (SELECT s.id FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.title='Essay on Human-AI Collaboration'),
  (
    SELECT cm.id
    FROM course_memberships cm
    JOIN courses c ON c.id = cm.course_id
    JOIN users u ON u.id = cm.user_id
    WHERE c.course_code='GRAD-101' AND u.email='gary@gradience.edu'
  ),
  NULL,
  'summary',
  'Overall, very compelling essay. Address noted grammar items.',
  NULL,
  NULL,
  true
);

COMMIT;
