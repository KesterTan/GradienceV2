import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE as removeMember } from '@/app/api/courses/[courseId]/members/remove/route';
import { db } from '@/db/orm';
import { users, courses, courseMemberships } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as currentUser from '../../../lib/current-user';

function uniq(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe('Manage Members - Remove Member', () => {
	beforeEach(async () => {
		vi.restoreAllMocks();
	});

	it('should remove member successfully (instructor)', async () => {
		const seed = uniq('remove-success');
		const instructor = await db.insert(users).values({
			firstName: 'Inst', lastName: 'Ructor', email: `${seed}-instructor@test.com`, passwordHash: 'x', status: 'active'
		}).returning();
		const student = await db.insert(users).values({
			firstName: 'Stu', lastName: 'Dent', email: `${seed}-student@test.com`, passwordHash: 'x', status: 'active'
		}).returning();
		const course = await db.insert(courses).values({
			title: 'Test Course', courseCode: uniq('TST101'), term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
		}).returning();
		await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });
		const membership = await db.insert(courseMemberships).values({ courseId: course[0].id, userId: student[0].id, role: 'student', status: 'active' }).returning();

		const req = { json: async () => ({ memberId: student[0].id }) } as any;
		const context = { params: { courseId: String(course[0].id) } };
		vi.spyOn(currentUser, 'requireAppUser').mockResolvedValue(instructor[0]);
		const res = await removeMember(req, context);
		const data = await res.json();
		expect(res.status).toBe(200);
		expect(data.success).toBe(true);
		const stillExists = await db.select().from(courseMemberships).where(eq(courseMemberships.id, membership[0].id));
		expect(stillExists.length).toBe(0);
	});

	it('should restrict non-instructors from removing members', async () => {
		const seed = uniq('remove-restrict');
		const instructor = await db.insert(users).values({
			firstName: 'Inst', lastName: 'Ructor', email: `${seed}-instructor@test.com`, passwordHash: 'x', status: 'active'
		}).returning();
		const student = await db.insert(users).values({
			firstName: 'Stu', lastName: 'Dent', email: `${seed}-student@test.com`, passwordHash: 'x', status: 'active'
		}).returning();
		const course = await db.insert(courses).values({
			title: 'Test Course', courseCode: uniq('TST102'), term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
		}).returning();
		await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });
		await db.insert(courseMemberships).values({ courseId: course[0].id, userId: student[0].id, role: 'student', status: 'active' });

		const req = { json: async () => ({ memberId: instructor[0].id }) } as any;
		const context = { params: { courseId: String(course[0].id) } };
		vi.spyOn(currentUser, 'requireAppUser').mockResolvedValue(student[0]);
		const res = await removeMember(req, context);
		const data = await res.json();
		expect(res.status).toBe(403);
		expect(data.error).toMatch(/Only instructors/);
	});

	it('should return error if member does not exist', async () => {
		const seed = uniq('remove-missing');
		const instructor = await db.insert(users).values({
			firstName: 'Inst', lastName: 'Ructor', email: `${seed}-instructor@test.com`, passwordHash: 'x', status: 'active'
		}).returning();
		const course = await db.insert(courses).values({
			title: 'Test Course', courseCode: uniq('TST103'), term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
		}).returning();
		await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });

		const req = { json: async () => ({ memberId: 999999 }) } as any;
		const context = { params: { courseId: String(course[0].id) } };
		vi.spyOn(currentUser, 'requireAppUser').mockResolvedValue(instructor[0]);
		const res = await removeMember(req, context);
		const data = await res.json();
		expect(res.status).toBe(404);
		expect(data.error).toMatch(/does not exist/);
	});

	it('should remove member when params are provided as a Promise', async () => {
		const seed = uniq('remove-promise');
		const instructor = await db.insert(users).values({
			firstName: 'Inst', lastName: 'Ructor', email: `${seed}-instructor@test.com`, passwordHash: 'x', status: 'active'
		}).returning();
		const student = await db.insert(users).values({
			firstName: 'Stu', lastName: 'Dent', email: `${seed}-student@test.com`, passwordHash: 'x', status: 'active'
		}).returning();
		const course = await db.insert(courses).values({
			title: 'Test Course', courseCode: uniq('TST104'), term: '2026', createdByUserId: instructor[0].id, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true
		}).returning();
		await db.insert(courseMemberships).values({ courseId: course[0].id, userId: instructor[0].id, role: 'grader', status: 'active' });
		await db.insert(courseMemberships).values({ courseId: course[0].id, userId: student[0].id, role: 'student', status: 'active' });

		const req = { json: async () => ({ memberId: student[0].id }) } as any;
		const context = { params: Promise.resolve({ courseId: String(course[0].id) }) };
		vi.spyOn(currentUser, 'requireAppUser').mockResolvedValue(instructor[0]);
		const res = await removeMember(req, context as any);
		const data = await res.json();
		expect(res.status).toBe(200);
		expect(data.success).toBe(true);
	});
});
