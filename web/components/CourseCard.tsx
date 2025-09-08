"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, PlayCircle } from "lucide-react";

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string | null;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  duration: string;
  expiresAt?: string | null;
}

function getPosterForTitle(title?: string) {
  if (!title) return "/.meta.logo.png";
  const t = title.toLowerCase();

  if (t.includes("ev") || t.includes("electric") || t.includes("workshop")) {
    return "/Ev.poster.png";
  }
  if (
    t.includes("full stack") ||
    t.includes("full-stack") ||
    t.includes("django") ||
    t.includes("web apps")
  ) {
    return "/Dfc.poster.png";
  }
  if (t.includes("cyber") || t.includes("security") || t.includes("cybersecurity")) {
    return "/Cs.poster.png";
  }

  return "/.meta.logo.png";
}

export default function CourseCard({ course, index }: { course: Course; index: number }) {
  const [imgError, setImgError] = useState(false);

  // prefer explicit thumbnail if provided, otherwise fallback to title-based poster
  const posterSrc = course.thumbnail ?? getPosterForTitle(course.title);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 120 }}
      whileHover={{ translateY: -8, scale: 1.01 }}
      className="group"
    >
      <Card className="rounded-2xl overflow-hidden border border-gray-100 bg-white transition-shadow duration-300 hover:shadow-lg">
        <div className="relative w-full h-44 sm:h-52 md:h-56 lg:h-48 overflow-hidden bg-gray-50">
          <Image
            src={imgError ? "/.meta.logo.png" : posterSrc}
            alt={course.title}
            fill
            sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
            className="object-cover"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            priority={false}
          />

          <div className="absolute top-3 left-3 bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-gray-800 border border-gray-100">
            {course.duration}
          </div>
        </div>

        <CardContent className="p-5 space-y-3">
          <h3 className="font-semibold text-lg md:text-xl leading-tight text-gray-900 group-hover:text-[#0C1838] transition-colors">
            {course.title}
          </h3>

          <p className="text-sm text-gray-600 line-clamp-3">{course.description}</p>

          <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-gray-50 border border-gray-100 text-xs">
                <BookOpen className="w-4 h-4" />
                <span>{course.totalLessons ?? 0} lessons</span>
              </span>

              <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-gray-50 border border-gray-100 text-xs">
                <PlayCircle className="w-4 h-4" />
                <span>{course.completedLessons ?? 0} watched</span>
              </span>
            </div>

            <div className="text-xs text-gray-500">
              {course.expiresAt ? `Expires ${new Date(course.expiresAt).toLocaleDateString()}` : ""}
            </div>
          </div>

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
