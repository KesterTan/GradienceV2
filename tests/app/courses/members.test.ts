
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as addMember } from '@/app/api/courses/[courseId]/members/add/route';
import { db } from '@/db/orm';
import { users, courses, courseMemberships, grades, rubricScores, feedbackComments } from '@/db/schema';
// Import dependent tables for cleanup
import { grades } from '@/db/schema';
// If you have rubricScores and submissions tables, import them as well
// import { rubricScores, submissions } from '@/db/schema';
import * as currentUser from '../../../lib/current-user';


describe('Manage Members - Add Member', () => {

  beforeEach(async () => {
    // Clear dependent tables first to avoid foreign key constraint errors
    await db.delete(rubricScores);
    await db.delete(grades);
    await db.delete(feedbackComments);
    // If you add submissions, delete them here as well
    await db.delete(courseMemberships);
    await db.delete(courses);
    await db.delete(users);
  });

  it('should add member with valid input', async () => {
    // Arrange: create instructor and student user, and a course
    const instructor = await db.insert(users).values({
      firstName: 'Inst', lastName: 'Ructor', email: 'instructor@test.com', passwordHash: 'x', globalRole: 'grader', status: 'active'
    }).returning();
    const student = await db.insert(users).values({
      firstName: 'Stu', lastName: 'Dent', email: 'student@test.com', passwordHash: 'x', globalRole: 'student', status: 'active'
    }).returning();
    const course = await db.insert(courses).values({
      title: 'Test Course', courseCode: 'TST101', term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
    }).returning();
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });

    // Act: add student to course
    const req = { json: async () => ({ email: 'student@test.com', role: 'student' }) };
    const context = { params: { courseId: String(course[0].id) } };
    vi.spyOn(currentUser, 'requireAppUser').mockResolvedValue(instructor[0] as any);
    const res = await addMember(req, context);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.id).toBeDefined();
  });


  it('should prevent duplicate users', async () => {
    // Arrange: create instructor, student, course, and add student once
    const instructor = await db.insert(users).values({
      firstName: 'Inst', lastName: 'Ructor', email: 'instructor2@test.com', passwordHash: 'x', globalRole: 'grader', status: 'active'
    }).returning();
    const student = await db.insert(users).values({
      firstName: 'Stu', lastName: 'Dent', email: 'student2@test.com', passwordHash: 'x', globalRole: 'student', status: 'active'
    }).returning();
    const course = await db.insert(courses).values({
      title: 'Test Course', courseCode: 'TST102', term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
    }).returning();
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: student[0].id, role: 'student', status: 'active' });

    // Act: try to add student again
    const req = { json: async () => ({ email: 'student2@test.com', role: 'student' }) };
    const context = { params: { courseId: String(course[0].id) } };
    vi.spyOn(currentUser, 'requireAppUser').mockResolvedValue(instructor[0] as any);
    const res = await addMember(req, context);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(409);
    expect(data.error).toMatch(/already a member/);
  });


  it('should restrict non-instructors from adding members', async () => {
    // Arrange: create instructor (as course creator) and student
    const instructor = await db.insert(users).values({
      firstName: 'Inst', lastName: 'Ructor', email: 'instructor3@test.com', passwordHash: 'x', globalRole: 'grader', status: 'active'
    }).returning();
    const student = await db.insert(users).values({
      firstName: 'Stu', lastName: 'Dent', email: 'student3@test.com', passwordHash: 'x', globalRole: 'student', status: 'active'
    }).returning();
    const course = await db.insert(courses).values({
      title: 'Test Course', courseCode: 'TST103', term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
    }).returning();
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: student[0].id, role: 'student', status: 'active' });

    // Act: try to add another member as a student (not instructor)
    const req = { json: async () => ({ email: 'someone@test.com', role: 'student' }) };
    const context = { params: { courseId: String(course[0].id) } };
    vi.spyOn(currentUser, 'requireAppUser').mockResolvedValue(student[0] as any);
    const res = await addMember(req, context);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(403);
    expect(data.error).toMatch(/Only instructors/);
  });


  it('should handle invalid input', async () => {
    // Arrange: create instructor and course
    const instructor = await db.insert(users).values({
      firstName: 'Inst', lastName: 'Ructor', email: 'instructor4@test.com', passwordHash: 'x', globalRole: 'grader', status: 'active'
    }).returning();
    const course = await db.insert(courses).values({
      title: 'Test Course', courseCode: 'TST104', term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
    }).returning();
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });

    // Act: missing email
    const req = { json: async () => ({ role: 'student' }) };
    const context = { params: { courseId: String(course[0].id) } };
    vi.spyOn(currentUser, 'requireAppUser').mockResolvedValue(instructor[0] as any);
    const res = await addMember(req, context);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Invalid input/);
  });

  it('should handle non-existent user', async () => {
    // Arrange: create instructor and course
    const instructor = await db.insert(users).values({
      firstName: 'Inst', lastName: 'Ructor', email: 'instructor5@test.com', passwordHash: 'x', globalRole: 'grader', status: 'active'
    }).returning();
    const course = await db.insert(courses).values({
      title: 'Test Course', courseCode: 'TST105', term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
    }).returning();
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });

    // Act: try to add a user that doesn't exist
    const req = { json: async () => ({ email: 'notfound@test.com', role: 'student' }) };
    const context = { params: { courseId: String(course[0].id) } };
    vi.spyOn(currentUser, 'requireAppUser').mockResolvedValue(instructor[0] as any);
    const res = await addMember(req, context);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(404);
    expect(data.error).toMatch(/does not exist/);
  });
});
