// ===========================
// app/(dashboard)/dashboard/page.tsx
// ===========================

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, PlayCircle, Trophy } from "lucide-react";

const MotionImage = motion(Image);

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null | undefined; // can be absolute URL or relative path
  progress: number; // 0..100
  totalLessons: number;
  completedLessons: number;
  duration: string; // e.g. "3h 20m"
  expiresAt?: string;
}

// Normalize/guard the thumbnail to a safe, absolute URL
const toSafeSrc = (thumb: string | undefined | null) => {
  const fallback = "/placeholder-course.png";
  if (!thumb || typeof thumb !== "string") return fallback;

  // already absolute
  if (/^https?:\/\//i.test(thumb)) return thumb;

  // protocol-relative
  if (/^\/\//.test(thumb)) return `https:${thumb}`;

  // otherwise treat as relative to a public assets base (env) or keep as-is
  const base = process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "";
  return base
    ? `${base.replace(/\/$/, "")}/${thumb.replace(/^\//, "")}`
    : thumb;
};

function CourseCard({ course, index }: { course: Course; index: number }) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ scale: 1.02 }}
      className="group"
    >
      <Card className="rounded-3xl overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <div className="relative h-52 w-full overflow-hidden">
            
            <MotionImage
              src={toSafeSrc(course.thumbnail)}
              alt={course.title}
              fill
              sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
              className="object-cover"
              priority={false}
              referrerPolicy="no-referrer"
            
          )}
          <div className="absolute top-4 right-4">
            <Badge
              variant={course.progress === 100 ? "default" : "secondary"}
              className="rounded-full px-3 py-1 text-xs"
            >
              {course.progress === 100 ? "Completed" : "In Progress"}
            </Badge>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-xl line-clamp-2 group-hover:text-[#0C1838] transition-colors">
            {course.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2">
            {course.description}
          </p>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{course.progress}%</span>
            </div>
            <Progress
              value={course.progress}
              className="h-2 overflow-hidden rounded-full bg-gray-200"
            />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {course.completedLessons}/{course.totalLessons} lessons
            </span>
            <span>{course.duration}</span>
          </div>

          <Link href={`/course/${course.id}`}>
            <Button className="w-full rounded-2xl bg-gradient-to-r from-[#0C1838] to-[#1E3A8A] hover:opacity-90 shadow-md text-white transition-transform hover:scale-105">
              {course.progress === 0 ? "Start Course" : "Continue Learning"}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const API =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

  const fetchStudentCourses = async (): Promise<Course[]> => {
    if (!user?.id || !user?.token) return [];
    const res = await fetch(`${API}/users/${user.id}/courses`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      // Session invalid — force logout so guards kick in
      await logout();
      throw new Error("Your session has expired. Please sign in again.");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Failed to fetch courses");
    }

    return res.json();
  };

  const {
    data: courses = [],
    isLoading,
    error,
  } = useQuery<Course[]>({
    queryKey: ["student-courses", user?.id],
    queryFn: fetchStudentCourses,
    enabled: !!user?.id && !!user?.token,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const completedCourses = courses.filter((c) => c.progress === 100).length;
    const averageProgress =
      courses.reduce(
        (acc, c) => acc + (Number.isFinite(c.progress) ? c.progress : 0),
        0
      ) / (totalCourses || 1);
    const totalLessons = courses.reduce(
      (acc, c) => acc + (c.completedLessons || 0),
      0
    );

    return { totalCourses, completedCourses, averageProgress, totalLessons };
  }, [courses]);

  const statCards = [
    {
      label: "Enrolled Courses",
      value: stats.totalCourses,
      icon: BookOpen,
      color: "from-[#0C1838] to-[#1E3A8A]",
    },
    {
      label: "Completed",
      value: stats.completedCourses,
      icon: Trophy,
      color: "from-green-400 to-emerald-500",
    },
    {
      label: "Lessons Watched",
      value: stats.totalLessons,
      icon: PlayCircle,
      color: "from-blue-400 to-indigo-500",
    },
    {
      label: "Avg Progress",
      value: `${Math.round(stats.averageProgress)}%`,
      icon: Clock,
      color: "from-purple-400 to-violet-600",
    },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="container mx-auto px-4 py-10 flex-1">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#0C1838] to-[#1E3A8A] bg-clip-text text-transparent">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Continue your learning journey with style ✨
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="rounded-2xl border-0 shadow-xl overflow-hidden">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${s.color} text-white`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                    <div className="text-2xl font-semibold">{s.value}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Courses Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-6 text-[#0C1838]">Your Courses</h2>

          {error ? (
            <div className="p-6 rounded-2xl bg-red-50 text-red-700 border border-red-200">
              Error loading courses: {(error as Error).message}
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl h-64 bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              You haven’t enrolled in any courses yet.
              <div className="mt-4">
                <Link href="/catalog">
                  <Button className="rounded-xl bg-gradient-to-r from-[#0C1838] to-[#1E3A8A]">
                    Browse Courses
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}




