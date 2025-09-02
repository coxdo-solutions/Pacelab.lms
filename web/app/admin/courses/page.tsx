"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { CreateCourseDialog } from "@/components/admin/create-course-dialog";
import { CourseModulesDialog } from "@/components/admin/course-modules-dialog";
import { EditCourseDialog } from "@/components/admin/edit-course-dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Play,
} from "lucide-react";
import { motion, animate } from "framer-motion";

import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  isActive: boolean;
  createdAt: string;
  moduleCount: number;
  enrollmentCount: number;
}

export default function AdminCoursesPage() {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showModulesDialog, setShowModulesDialog] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const queryClient = useQueryClient();

  const API = (
    process.env.NEXT_PUBLIC_API_URL || "https://4e11461f9308.ngrok-free.app"
  ).replace(/\/$/, "");

  // Attach auth header
  const authHeaders = user?.token
    ? { Authorization: `Bearer ${user.token}` }
    : undefined;

  // Central 401/403 handler
  const handleAuthError = async (res: Response) => {
    if (res.status === 401 || res.status === 403) {
      await logout();
      throw new Error("Your session has expired. Please sign in again.");
    }
  };

  // Fetch courses (protected)
  const {
    data: courses = [],
    isLoading,
    isError,
    error,
  } = useQuery<Course[]>({
    queryKey: ["admin-courses"],
    enabled: !!user?.token,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    // 👇 add these
    refetchInterval: 15000, // refresh every 15s
    refetchOnReconnect: true, // refresh when network comes back
    refetchOnMount: "always", // ensure fresh after nav/mount
    queryFn: async () => {
      const res = await fetch(`${API}/courses`, {
        method: "GET",
        headers: { ...(authHeaders || {}) },
        cache: "no-store",
      });
      await handleAuthError(res);
      if (!res.ok) {
        const msg = await res.text().catch(() => "Failed to fetch courses");
        throw new Error(msg || "Failed to fetch courses");
      }
      return res.json();
    },
  });

  // Delete course (protected)
  const deleteCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await fetch(`${API}/courses/${courseId}`, {
        method: "DELETE",
        headers: { ...(authHeaders || {}) },
      });
      await handleAuthError(res);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to delete course");
      }
      return courseId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Course deleted successfully");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete course"),
  });

  // Activate / Deactivate (protected)
  const toggleCourseStatus = useMutation({
    mutationFn: async ({
      courseId,
      isActive,
    }: {
      courseId: string;
      isActive: boolean;
    }) => {
      const res = await fetch(`${API}/courses/${courseId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(authHeaders || {}) },
        body: JSON.stringify({ isActive }),
      });
      await handleAuthError(res);
      if (!res.ok) {
        const msg = await res.text().catch(() => "Failed to update status");
        throw new Error(msg || "Failed to update status");
      }
      return { courseId, isActive };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success(
        `Course ${data.isActive ? "activated" : "deactivated"} successfully`
      );
    },
    onError: (e: any) =>
      toast.error(e?.message || "Failed to update course status"),
  });

  const actionsDisabled =
    !user?.token || deleteCourse.isPending || toggleCourseStatus.isPending;

  const filteredCourses = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return courses;
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(q) ||
        (course.description || "").toLowerCase().includes(q)
    );
  }, [courses, searchTerm]);

  const handleDeleteCourse = (courseId: string) => {
    if (actionsDisabled) return;
    if (confirm("Are you sure you want to delete this course?")) {
      deleteCourse.mutate(courseId);
    }
  };

  const handleToggleStatus = (courseId: string, currentStatus: boolean) => {
    if (actionsDisabled) return;
    toggleCourseStatus.mutate({ courseId, isActive: !currentStatus });
  };

  const handleManageModules = (course: Course) => {
    setSelectedCourse(course);
    setShowModulesDialog(true);
  };

  // Guard: don’t render admin table until token exists
  if (!user?.token) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        Preparing admin view…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Course Management
              </h1>
              <p className="text-gray-500 mt-1">
                Create and manage courses with Video content
              </p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              disabled={!user?.token}
              className="rounded-xl bg-gradient-to-r from-[#0C1838] to-[#1E3A8A] text-white shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Course
            </Button>
          </div>

          {/* Courses Table */}
          <Card className="rounded-2xl shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#0C1838]/20 to-[#1E3A8A]/20">
              <CardTitle className="flex items-center gap-2 text-[#0C1838]">
                <BookOpen className="w-5 h-5" />
                All Courses ({filteredCourses.length})
              </CardTitle>
              <CardDescription className="text-gray-600">
                Create courses with Videos organized in modules
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Modules</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading &&
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-8 bg-gray-200 rounded animate-pulse" />
                              <div className="space-y-1">
                                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                                <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                          </TableCell>
                          <TableCell>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                          </TableCell>
                        </TableRow>
                      ))}

                    {isError && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-red-600">
                          {(error as Error)?.message ||
                            "Failed to load courses"}
                        </TableCell>
                      </TableRow>
                    )}

                    {!isLoading && !isError && filteredCourses.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-sm text-gray-500 py-8"
                        >
                          No courses found. Try adjusting your search.
                        </TableCell>
                      </TableRow>
                    )}

                    {!isLoading &&
                      !isError &&
                      filteredCourses.map((course, index) => (
                        <motion.tr
                          key={course.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  course.thumbnail || "/placeholder-course.png"
                                }
                                alt={course.title}
                                className="w-12 h-8 object-cover rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "/placeholder-course.png";
                                }}
                              />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {course.title}
                                </div>
                                <div className="text-sm text-gray-500 line-clamp-1">
                                  {course.description}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={
                                course.isActive ? "default" : "secondary"
                              }
                              className={`rounded-lg px-2 py-1 ${
                                course.isActive
                                  ? "bg-[#0C1838]/20 text-[#0C1838]"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {course.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <span className="text-sm text-gray-700">
                              {course.moduleCount} modules
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {new Date(course.createdAt).toLocaleDateString()}
                            </span>
                          </TableCell>

                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  disabled={actionsDisabled}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="rounded-xl shadow-lg border border-gray-100"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleManageModules(course)}
                                >
                                  <Play className="w-4 h-4 mr-2" /> Manage
                                  Modules
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditCourse(course);
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2" /> Edit Course
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleToggleStatus(
                                      course.id,
                                      course.isActive
                                    )
                                  }
                                  disabled={actionsDisabled}
                                >
                                  {course.isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteCourse(course.id)}
                                  className="text-destructive focus:text-destructive"
                                  disabled={actionsDisabled}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                  Course
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <CreateCourseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["admin-courses"] })
        }
      />

      {selectedCourse && (
        <CourseModulesDialog
          open={showModulesDialog}
          onOpenChange={setShowModulesDialog}
          course={selectedCourse}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["admin-courses"] })
          }
        />
      )}

      {editCourse && (
        <EditCourseDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          course={editCourse}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["admin-courses"] })
          }
        />
      )}
    </div>
  );
}

