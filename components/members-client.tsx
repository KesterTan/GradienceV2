"use client";
import { useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { GraduationCap, Users, Trash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MembersClient({ instructors, students, userId, courseTitle, isInstructor = false, courseId }: any) {
  // Local state for members to allow immediate UI update
  const [localInstructors, setLocalInstructors] = useState(instructors);
  const [localStudents, setLocalStudents] = useState(students);

  const [activeTab, setActiveTab] = useState("instructors");
  const tabs = [
    { role: "instructors", label: "Instructors", icon: <GraduationCap className="size-4 mr-1" />, count: localInstructors.length },
    { role: "students", label: "Students", icon: <Users className="size-4 mr-1" />, count: localStudents.length },
  ];
  const getMembers = (tab: string) =>
    tab === "instructors"
      ? localInstructors.map((m: any) => ({ ...m, role: "instructor" }))
      : localStudents.map((m: any) => ({ ...m, role: "student" }));

  // Add Member form state
  const [addEmail, setAddEmail] = useState("");
  // Role is determined by activeTab: "grader" for instructors, "student" for students
  const [addRole, setAddRole] = useState("student");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  // Handler for add member
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    // Set role based on activeTab
    const role = activeTab === "instructors" ? "grader" : "student";
    try {
      const res = await fetch(`/api/courses/${courseId}/members/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail, role }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Unexpected server response. Please try again.");
      }
      if (!res.ok) throw new Error(data.error || "Failed to add member");
      const addedMember = {
        id: data.userId ?? data.member?.id ?? data.id ?? Date.now(),
        name: data.member?.name ?? addEmail,
        email: data.member?.email ?? addEmail,
      };
      // Add the new member to local state for immediate UI update
      if (role === "grader") {
        setLocalInstructors((prev: any[]) => [...prev, addedMember]);
      } else {
        setLocalStudents((prev: any[]) => [...prev, addedMember]);
      }
      setAddEmail("");
      setAddRole("student");
      toast({
        title: "Member added",
        description: `Successfully added ${addEmail} as ${role === "grader" ? "instructor" : "student"}.`,
        duration: 4000,
      });
    } catch (err: any) {
      setAddError(err.message);
      emailInputRef.current?.focus();
    } finally {
      setAddLoading(false);
    }
  }

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<any>(null);
  const [removalSuccess, setRemovalSuccess] = useState(false);
  const [removalError, setRemovalError] = useState("");

  // Remove handler
  async function handleRemoveMember(member: any) {
    try {
      setRemovalError("");
      const res = await fetch(`/api/courses/${courseId}/members/remove`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove member");
      if (member.role === "instructor") {
        setLocalInstructors((prev: any[]) => prev.filter((m: any) => m.id !== member.id));
      } else {
        setLocalStudents((prev: any[]) => prev.filter((m: any) => m.id !== member.id));
      }
      setRemovalSuccess(true);
    } catch (err: any) {
      setRemovalError(err.message || "Failed to remove member");
    }
  }

  function formatMemberDisplay(member: any) {
    if (!member) return "member";
    if (member.name && member.email && member.name !== member.email) {
      return `${member.name} (${member.email})`;
    }
    return member.email || member.name || "member";
  }

  return (
    <main className="min-h-screen bg-muted/30">

      <div className="mx-auto w-full max-w-2xl px-2 sm:px-4 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Users className="size-7 text-primary" />
            <h1 className="text-2xl font-bold leading-tight">Manage Members</h1>
          </div>
          <div className="text-sm text-muted-foreground font-medium break-words">
            {courseTitle || "Course"}
          </div>
        </div>

        {/* Tabs */}
        <div className="w-full mb-2">
          <div className="flex gap-2 border-b pb-2 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.role}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-t-md text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.role ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground"}`}
                onClick={() => setActiveTab(tab.role)}
                type="button"
              >
                {tab.icon}
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Add Member Row (always visible for instructors, directly below tabs) */}
        {isInstructor && (
          <>
            <form
              onSubmit={handleAddMember}
              className="flex w-full items-center gap-2 mb-2"
            >
              <Input
                ref={emailInputRef}
                type="email"
                placeholder={
                  activeTab === "instructors"
                    ? "Instructor email address"
                    : "Student email address"
                }
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                required
                className="flex-grow min-w-0 rounded-md h-10 px-3 text-sm mt-2 sm:mt-3"
                autoComplete="off"
                disabled={addLoading}
                style={{ width: '80%' }}
              />
              <Button
                type="submit"
                disabled={addLoading || !addEmail}
                className="mt-2 sm:mt-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 8v6m3-3h-6" />
                </svg>
                Add
              </Button>
            </form>
            {addError && (
              <div className="text-destructive text-xs mb-2 ml-1">
                {addError}
              </div>
            )}
            {/* Success notification is now a toast popup */}
          </>
        )}



        {/* Member List */}
        {getMembers(activeTab).length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl text-muted-foreground">
                {activeTab === "instructors" ? <GraduationCap className="size-10" /> : <Users className="size-10" />}
              </span>
              <span className="text-lg font-semibold text-muted-foreground">
                No {activeTab === "instructors" ? "instructors" : "students"} yet
              </span>
              <span className="text-sm text-muted-foreground">Invite or add members to get started.</span>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 sm:gap-2.5">
            {getMembers(activeTab).map((member: any) => (
              <li key={member.id} className="list-none">
                <Card className="w-[94%] sm:w-full mx-auto p-0 shadow-sm border bg-background rounded-lg sm:rounded-xl transition-all">
                  <CardContent className="flex flex-row items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {activeTab === "instructors" ? <GraduationCap className="size-4 text-muted-foreground" /> : <Users className="size-4 text-muted-foreground" />}
                      <span className="font-medium text-sm sm:text-sm truncate">{member.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {member.id === userId && <Badge variant="secondary">You</Badge>}
                      {isInstructor && member.id !== userId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove member"
                          onClick={e => {
                            e.stopPropagation();
                            setPendingRemove(member);
                            setRemovalSuccess(false);
                            setRemovalError("");
                            setModalOpen(true);
                          }}
                        >
                          <Trash className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <AlertDialog
          open={modalOpen}
          onOpenChange={open => {
            setModalOpen(open);
            if (!open) {
              setPendingRemove(null);
              setRemovalSuccess(false);
              setRemovalError("");
            }
          }}
        >
          <AlertDialogContent>
            {!removalSuccess ? (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Remove {pendingRemove?.role === "instructor" ? "Instructor" : "Student"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Remove <span className="font-semibold">{formatMemberDisplay(pendingRemove)}</span> from this course?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {removalError && (
                  <div className="text-destructive text-sm">{removalError}</div>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setModalOpen(false)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={event => {
                      event.preventDefault();
                      if (pendingRemove) handleRemoveMember(pendingRemove);
                    }}
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            ) : (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Member Removed</AlertDialogTitle>
                  <AlertDialogDescription>
                    <span className="font-semibold">{formatMemberDisplay(pendingRemove)}</span> has been removed from this course.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction
                    autoFocus
                    onClick={() => {
                      setModalOpen(false);
                      setPendingRemove(null);
                      setRemovalSuccess(false);
                      setRemovalError("");
                    }}
                  >
                    OK
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}
