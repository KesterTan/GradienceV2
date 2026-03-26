export function createAssignmentFormData(params: {
  courseId: number
  title?: string
  description?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  lateUntilDate?: string
  lateUntilTime?: string
}) {
  const formData = new FormData()
  formData.set("courseId", String(params.courseId))
  if (params.title !== undefined) formData.set("title", params.title)
  if (params.description !== undefined) formData.set("description", params.description)
  if (params.startDate !== undefined) formData.set("startDate", params.startDate)
  if (params.startTime !== undefined) formData.set("startTime", params.startTime)
  if (params.endDate !== undefined) formData.set("endDate", params.endDate)
  if (params.endTime !== undefined) formData.set("endTime", params.endTime)
  if (params.lateUntilDate !== undefined) formData.set("lateUntilDate", params.lateUntilDate)
  if (params.lateUntilTime !== undefined) formData.set("lateUntilTime", params.lateUntilTime)
  return formData
}

