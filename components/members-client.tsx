"use client";
import { useState } from "react";
import { GraduationCap, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MembersClient({ instructors, students, userId, courseTitle }: any) {
  const [activeTab, setActiveTab] = useState("instructors");
  const tabs = [
    { role: "instructors", label: "Instructors", icon: <GraduationCap className="size-4 mr-1" />, count: instructors.length },
    { role: "students", label: "Students", icon: <Users className="size-4 mr-1" />, count: students.length },
  ];
  const getMembers = (tab: string) =>
    tab === "instructors"
      ? instructors.map((m: any) => ({ ...m, role: "instructor" }))
      : students.map((m: any) => ({ ...m, role: "student" }));

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
        <div className="w-full mb-4">
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
                <Card className="w-full p-0 shadow-sm border bg-background rounded-lg sm:rounded-xl transition-all">
                  <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-2 sm:py-2.5">
                    <div className="flex items-center gap-2 w-full">
                      {activeTab === "instructors" ? <GraduationCap className="size-4 text-muted-foreground" /> : <Users className="size-4 text-muted-foreground" />}
                      <span className="font-medium break-words text-base sm:text-sm">{member.name}</span>
                    </div>
                    {member.id === userId && <Badge variant="secondary" className="mt-1 sm:mt-0">You</Badge>}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
