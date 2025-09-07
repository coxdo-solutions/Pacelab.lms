"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, PlayCircle, Trophy } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null | undefined;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  duration: string;
  expiresAt?: string;
}

function CourseCard({ course, index }: { course: Course; index: number }) {
  const [imgError, setImgError] = useState(false);
  const posterSrc = "/django-pacelab.png"; // fixed poster image

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 120 }}
      whileHover={{ translateY: -8, scale: 1.01 }}
      className="group"
    >
      <Card className="rounded-2xl overflow-hidden border border-gray-100 bg-white transition-shadow duration-300 hover:shadow-lg">
        {/* Thumbnail */}
        <div className="relative w-full h-44 sm:h-52 md:h-56 lg:h-48 overflow-hidden bg-gray-50">
          <Image
            src={imgError ? "/placeholder-course.png" : posterSrc}
            alt={course.title}
            fill
            sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
            className="object-cover"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            priority={false}
          />
          {/* Duration pill */}
          <div className="absolute top-3 left-3 bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-gray-800 border border-gray-100">
            {course.duration}
          </div>
        </div>

        <CardContent className="p-5 space-y-3">
          <h3 className="font-semibold text-lg md:text-xl leading-tight text-gray-900 group-hover:text-[#0C1838] transition-colors">
            {course.title}
          </h3>

          <p className="text-sm text-gray-600 line-clamp-3">
            {course.description}
          </p>

          {/* Meta */}
          <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-gray-50 border border-gray-100 text-xs">
                <BookOpen className="w-4 h-4" />
                <span>{course.totalLessons} lessons</span>
              </span>

              <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-gray-50 border border-gray-100 text-xs">
                <PlayCircle className="w-4 h-4" />
                <span>{course.completedLessons} watched</span>
              </span>
            </div>

            <div className="text-xs text-gray-500">
              {course.expiresAt
                ? `Expires ${new Date(course.expiresAt).toLocaleDateString()}`
                : ""}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-3">
            <Link href={`/course/${course.id}`}>
              <Button className="w-full rounded-xl bg-gradient-to-r from-[#0C1838] to-[#1E3A8A] text-white px-4 py-2 shadow-sm hover:shadow-md transition-transform hover:scale-105">
                {course.progress === 0 ? "Start Course" : "Open Course"}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const API =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:4000";

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
        {/* Hero / About Section */}
        <section className="mb-12">
          <div className="relative rounded-3xl overflow-hidden bg-white p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 text-gray-900">
            {/* Subtle background accents */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-tr from-[#06b6d4] to-[#7c3aed] opacity-8 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-gradient-to-tr from-[#7c3aed] to-[#06b6d4] opacity-8 rounded-full blur-3xl pointer-events-none"></div>

            {/* Left content */}
            <div className="w-full md:w-1/2 order-2 md:order-1 text-center md:text-left z-10">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-3">
                <span className="block text-black">Welcome to</span>
                <span
                  className="block mt-1 text-3xl sm:text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #0C1838 0%, #1E2A78 50%, #2B0B3A 100%)",
                  }}
                >
                  India's Largest Internship Programme
                </span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg font-medium text-black/80 mb-3">
                <span className="font-semibold text-black">Pacelab ~</span>{" "}
                Redefining Technology
                
              </p>

              <p className="text-sm sm:text-base text-gray-800 max-w-xl leading-relaxed">
                This internship programme delivers an{" "}
                <span className="font-semibold text-black">industry-aligned journey</span>{" "}
                that equips students with real-world skills, assessments and mentorship. 
                Participants get an{" "}
                <span className="font-semibold">Internship Certificate</span>, 
                live industry talks and access to Career Support &amp; Job Portal.
              </p>

              {/* Features */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 gap-3 max-w-md">
                {[
                  "Internship Certificate",
                  "Test & Evaluation",
                  "Industry Weekend Talks",
                  "Career Support & Job Portal",
                  "Mentorship & Motivation",
                  "Guaranteed Quality & Support",
                ].map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-medium text-gray-800"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Right poster */}
            <div className="w-full md:w-1/2 flex justify-center order-1 md:order-2 z-10">
              <div className="relative w-[260px] h-[340px] sm:w-[300px] sm:h-[380px] md:w-[360px] md:h-[460px] rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
                <Image
                  src="/pacelab.poster.jpg"
                  alt="Programme poster"
                  width={720}
                  height={920}
                  className="object-cover w-full h-full"
                  priority
                />
                <div className="absolute -bottom-4 -right-4 w-12 h-12 rounded-full opacity-20 blur-md bg-gradient-to-br from-[#06b6d4] to-[#7c3aed]"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Courses Section */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-2">
            <h2 className="text-2xl font-bold text-gray-900">Your Courses</h2>
            <div className="text-sm text-gray-600">
              {courses.length} courses enrolled
            </div>
          </div>

          {error ? (
            <div className="p-6 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
              Error loading courses: {(error as Error).message}
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl h-56 bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-gray-600">
              <p className="text-base">You haven’t enrolled in any courses yet.</p>
              <div className="mt-5">
                <Link href="/catalog">
                  <Button className="rounded-lg bg-gradient-to-r from-[#0C1838] to-[#1E3A8A] text-white px-6 py-2 shadow hover:shadow-md transition">
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
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-10 text-sm text-white bg-gradient-to-r from-[#0C1838] to-[#1E3A8A]">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-lg font-semibold">Pacelab Pvt. Ltd.</h4>
            <p className="mt-3 text-sm leading-relaxed">
              55/1605, Kadavanthra, Kochi, Kerala - 682020
              <br />
              P:{" "}
              <a href="tel:+918075090098" className="underline">
                8075090098
              </a>
              <br />
              E:{" "}
              <a href="mailto:info@pacelab.in" className="underline">
                info@pacelab.in
              </a>
            </p>
            <div className="mt-4">
              <Link
                href="https://www.pacelab.in"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                www.pacelab.in
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold">Quick Links</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/about" className="hover:underline">
                  About this programme
                </Link>
              </li>
              <li>
                <Link href="/catalog" className="hover:underline">
                  Courses
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:underline">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:underline">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold">Contact</h4>
            <p className="mt-3 text-sm">
              For programme enquiries, write to{" "}
              <a href="mailto:info@pacelab.in" className="underline">
                info@pacelab.in
              </a>
            </p>
            <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                aria-label="Email"
                placeholder="you@domain.com"
                className="flex-1 rounded-xl border px-4 py-2 text-gray-900"
              />
              <Button className="rounded-xl bg-white text-[#0C1838] hover:bg-gray-100">
                Subscribe
              </Button>
            </form>

            <div className="mt-6 text-xs text-white/80">
              © {new Date().getFullYear()} PaceLab Learning Platform — Powered by Coxdo Solutions
            </div>
            
          </div>
        </div>
      </footer>
    </div>
  );
}




