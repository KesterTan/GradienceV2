
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as addMember } from '@/app/api/courses/[courseId]/members/add/route';
import { db } from '@/db/orm';
import { users, courses, courseMemberships } from '@/db/schema';
import * as currentUser from '../../../lib/current-user';

function uniq(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe('Manage Members - Add Member', () => {

  beforeEach(async () => {
    vi.restoreAllMocks();
  });

  it('should add member with valid input', async () => {
    const seed = uniq('add-valid');
    const instructorEmail = `${seed}-instructor@test.com`;
    const studentEmail = `${seed}-student@test.com`;
    // Arrange: create instructor and student user, and a course
    const instructor = await db.insert(users).values({
      firstName: 'Inst', lastName: 'Ructor', email: instructorEmail, passwordHash: 'x', status: 'active'
    }).returning();
    const student = await db.insert(users).values({
      firstName: 'Stu', lastName: 'Dent', email: studentEmail, passwordHash: 'x', status: 'active'
    }).returning();
    const course = await db.insert(courses).values({
      title: 'Test Course', courseCode: uniq('TST101'), term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
    }).returning();
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });

    // Act: add student to course
    const req = { json: async () => ({ email: studentEmail, role: 'student' }) } as any;
    const context = { params: { courseId: String(course[0].id) } };
    vi.spyOn(currentUser, 'requireGraderUser').mockResolvedValue(instructor[0]);
    const res = await addMember(req, context);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.id).toBeDefined();
    expect(data.userId).toBe(student[0].id);
    expect(data.member).toEqual({
      id: student[0].id,
      name: 'Stu Dent',
      email: studentEmail,
    });
  });


  it('should prevent duplicate users', async () => {
    const seed = uniq('add-duplicate');
    const instructorEmail = `${seed}-instructor@test.com`;
    const studentEmail = `${seed}-student@test.com`;
    // Arrange: create instructor, student, course, and add student once
    const instructor = await db.insert(users).values({
      firstName: 'Inst', lastName: 'Ructor', email: instructorEmail, passwordHash: 'x', status: 'active'
    }).returning();
    const student = await db.insert(users).values({
      firstName: 'Stu', lastName: 'Dent', email: studentEmail, passwordHash: 'x', status: 'active'
    }).returning();
    const course = await db.insert(courses).values({
      title: 'Test Course', courseCode: uniq('TST102'), term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
    }).returning();
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: student[0].id, role: 'student', status: 'active' });

    // Act: try to add student again
    const req = { json: async () => ({ email: studentEmail, role: 'student' }) } as any;
    const context = { params: { courseId: String(course[0].id) } };
    vi.spyOn(currentUser, 'requireGraderUser').mockResolvedValue(instructor[0]);
    const res = await addMember(req, context);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(409);
    expect(data.error).toMatch(/already a member/);
  });


  it('should restrict non-instructors from adding members', async () => {
    const seed = uniq('add-restrict');
    const instructorEmail = `${seed}-instructor@test.com`;
    const studentEmail = `${seed}-student@test.com`;
    // Arrange: create instructor (as course creator) and student
    const instructor = await db.insert(users).values({
      firstName: 'Inst', lastName: 'Ructor', email: instructorEmail, passwordHash: 'x', status: 'active'
    }).returning();
    const student = await db.insert(users).values({
      firstName: 'Stu', lastName: 'Dent', email: studentEmail, passwordHash: 'x', status: 'active'
    }).returning();
    const course = await db.insert(courses).values({
      title: 'Test Course', courseCode: uniq('TST103'), term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
    }).returning();
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: student[0].id, role: 'student', status: 'active' });

    // Act: try to add another member as a student (not instructor)
    const req = { json: async () => ({ email: `${seed}-someone@test.com`, role: 'student' }) } as any;
    const context = { params: { courseId: String(course[0].id) } };
    vi.spyOn(currentUser, 'requireGraderUser').mockResolvedValue(student[0]);
    const res = await addMember(req, context);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(403);
    expect(data.error).toMatch(/Only instructors/);
  });


  it('should handle invalid input', async () => {
    const seed = uniq('add-invalid');
    // Arrange: create instructor and course
    const instructor = await db.insert(users).values({
      firstName: 'Inst', lastName: 'Ructor', email: `${seed}-instructor@test.com`, passwordHash: 'x', status: 'active'
    }).returning();
    const course = await db.insert(courses).values({
      title: 'Test Course', courseCode: uniq('TST104'), term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
    }).returning();
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });

    // Act: missing email
    const req = { json: async () => ({ role: 'student' }) } as any;
    const context = { params: { courseId: String(course[0].id) } };
    vi.spyOn(currentUser, 'requireGraderUser').mockResolvedValue(instructor[0]);
    const res = await addMember(req, context);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Invalid input/);
  });

  it('should handle non-existent user', async () => {
    const seed = uniq('add-missing');
    // Arrange: create instructor and course
    const instructor = await db.insert(users).values({
      firstName: 'Inst', lastName: 'Ructor', email: `${seed}-instructor@test.com`, passwordHash: 'x', status: 'active'
    }).returning();
    const course = await db.insert(courses).values({
      title: 'Test Course', courseCode: uniq('TST105'), term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
    }).returning();
    await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });

    // Act: try to add a user that doesn't exist
    const req = { json: async () => ({ email: `${seed}-notfound@test.com`, role: 'student' }) } as any;
    const context = { params: { courseId: String(course[0].id) } };
    vi.spyOn(currentUser, 'requireGraderUser').mockResolvedValue(instructor[0]);
    const res = await addMember(req, context);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(404);
    expect(data.error).toMatch(/does not exist/);
  });
});
