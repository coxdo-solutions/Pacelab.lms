'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Navbar } from '@/components/navbar'
import { VideoPlayer } from '@/components/video-player'
import { ChevronRight, Clock, PlayCircle, CheckCircle, BookOpen, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

// --------------------- types (unchanged) ---------------------
interface Lesson {
  id: string
  title: string
  type: 'VIDEO' | 'PDF' | 'QUIZ'
  content: string
  duration: number
  order: number
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' // Changed from completed: boolean
  youtubeId?: string
  videoId?: string
  videoUrl?: string
}

interface Module {
  id: string
  title: string
  order: number
  lessons: Lesson[]
}

interface Course {
  id: string
  title: string
  description: string
  modules: Module[]
}

// --------------------- utils (unchanged) ---------------------
function getApiBase() {
  const raw = process.env.NEXT_PUBLIC_API_URL
  if (!raw) throw new Error('Missing NEXT_PUBLIC_API_URL (set it in .env.local)')
  return raw.replace(/\/+$/, '')
}

function pickYouTubeId(lesson?: Partial<Lesson> | null): string | null {
  const raw = (lesson?.content ?? lesson?.youtubeId ?? lesson?.videoId ?? lesson?.videoUrl) as string | undefined
  if (!raw) return null
  const s = String(raw).trim()
  const idRegex = /^[a-zA-Z0-9_-]{11}$/
  if (idRegex.test(s)) return s
  try {
    const u = new URL(s)
    const v = u.searchParams.get('v')
    if (v && idRegex.test(v)) return v
    const segs = u.pathname.split('/').filter(Boolean)
    const fromEmbed = segs[segs.indexOf('embed') + 1]
    const fromShorts = segs[segs.indexOf('shorts') + 1]
    const tail = segs[segs.length - 1]
    const cand = [fromEmbed, fromShorts, tail].find((x) => idRegex.test(x || ''))
    return cand || null
  } catch {
    return null
  }
}

// --------------------- small loader/skeleton (unchanged) ---------------------
function SmoothLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="relative w-40 h-40">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#0C1838] to-[#1E3A8A] opacity-10 animate-pulse" />
        <svg className="relative w-full h-full" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="g" x1="0" x2="1">
              <stop offset="0%" stopColor="#0C1838" stopOpacity="1" />
              <stop offset="100%" stopColor="#1E3A8A" stopOpacity="1" />
            </linearGradient>
          </defs>
          <motion.circle
            cx="50"
            cy="50"
            r="30"
            stroke="url(#g)"
            strokeWidth="6"
            fill="transparent"
            strokeLinecap="round"
            initial={{ rotate: 0, strokeDasharray: '0 200' }}
            animate={{ rotate: 360, strokeDasharray: ['60 140', '120 80', '60 140'] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          />
        </svg>
      </div>
    </div>
  )
}

function SkeletonCourseHeader() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 w-3/5 bg-gray-200 rounded-md" />
      <div className="h-4 w-4/5 bg-gray-200 rounded-md" />
      <div className="flex items-center gap-4">
        <div className="h-2 w-48 bg-gray-200 rounded-full" />
        <div className="h-6 w-24 bg-gray-200 rounded-lg" />
      </div>
    </div>
  )
}

// --------------------- Main component ---------------------
export default function CoursePage({ params }: { params: { id: string } }) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [processingNext, setProcessingNext] = useState(false)
  const [processingComplete, setProcessingComplete] = useState(false)
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: course, isLoading, error } = useQuery<Course>({
    queryKey: ['course', params.id],
    queryFn: async () => {
      const API = getApiBase()
      if (!params?.id || typeof params.id !== 'string') throw new Error('No course ID in route params')
      const url = `${API}/courses/${encodeURIComponent(params.id)}`
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        credentials: 'include',
        cache: 'no-store',
      })
      const text = await res.text().catch(() => '')
      if (!res.ok) {
        let msg = `Request ${url} failed (HTTP ${res.status})`
        if (text) {
          try {
            const j = JSON.parse(text)
            msg += `: ${j.message ?? text}`
          } catch {
            msg += `: ${text}`
          }
        }
        throw new Error(msg)
      }
      try {
        return JSON.parse(text) as Course
      } catch {
        throw new Error(`Invalid JSON from ${url}: ${text?.slice(0, 200)}`)
      }
    },
    staleTime: 0,
    retry: 0,
  })

  // Update the markCompletedMutation to send status: "COMPLETED"
  const markCompletedMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const API = getApiBase()
      const url = `${API}/lessons/progress`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        credentials: 'include',
        // Send status: "COMPLETED" to your backend
        body: JSON.stringify({ lessonId, status: "COMPLETED" }),
      })
      const text = await res.text().catch(() => '')
      if (!res.ok) throw new Error(text || 'Failed to mark lesson complete')
      return text ? JSON.parse(text) : {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', params.id] })
    },
  })

  // Update the markInProgressMutation to send status: "IN_PROGRESS"
  const markInProgressMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const API = getApiBase()
      const url = `${API}/lessons/progress`
      const payload = { lessonId, status: "IN_PROGRESS" }

      console.log('Sending IN_PROGRESS request to:', url)
      console.log('Payload:', payload)
      console.log('Headers:', {
        'Content-Type': 'application/json',
        ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
      })

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        credentials: 'include',
        // Send status: "IN_PROGRESS" to your backend
        body: JSON.stringify(payload),
      })

      const text = await res.text().catch(() => '')
      console.log('Response status:', res.status)
      console.log('Response text:', text)

      if (!res.ok) throw new Error(text || 'Failed to mark lesson in progress')
      return text ? JSON.parse(text) : {}
    },
    onSuccess: () => {
      console.log('IN_PROGRESS mutation successful')
      queryClient.invalidateQueries({ queryKey: ['course', params.id] })
    },
    onError: (error) => {
      console.error('IN_PROGRESS mutation failed:', error)
    }
  })

  const totalLessons = course?.modules.reduce((acc, m) => acc + (m.lessons?.length ?? 0), 0) ?? 0
  const completedLessons = course?.modules.reduce((acc, m) => acc + m.lessons.filter((l) => l.status === 'COMPLETED').length, 0) ?? 0
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

  useEffect(() => {
    if (course && !selectedLesson) {
      const allLessons = course.modules.flatMap((m) => m.lessons)
      const firstIncomplete = allLessons.find((l) => l.status !== 'COMPLETED')
      const lessonToSelect = firstIncomplete || allLessons[0] || null
      setSelectedLesson(lessonToSelect)
      // Just select lesson, let backend determine status
    }
  }, [course, selectedLesson])

  function findNextLesson(currentId: string | null) {
    if (!course || !currentId) return null
    const all = course.modules.flatMap((m) => m.lessons)
    const idx = all.findIndex((l) => l.id === currentId)
    if (idx === -1) return null
    return all[idx + 1] ?? null
  }

  // Optimistically mark the selected lesson complete in local state for instant UI feedback
  function markSelectedLessonOptimistic(status: 'COMPLETED' | 'IN_PROGRESS') {
    setSelectedLesson((s) => (s ? { ...s, status } : s))
  }

  // FIXED: Next button - just move to next lesson, let backend determine status
  async function handleNext() {
    if (!selectedLesson || !course) return
    const next = findNextLesson(selectedLesson.id)
    if (!next) return

    console.log('Next button clicked, current lesson:', selectedLesson.id, 'next lesson:', next.id, 'next status:', next.status)

    setProcessingNext(true)
    try {
      // Just move to next lesson
      setSelectedLesson(next)

      // Refresh data to get current status from backend
      await queryClient.invalidateQueries({ queryKey: ['course', params.id] })
    } catch (err) {
      console.error('Failed to handle next:', err)
      await queryClient.invalidateQueries({ queryKey: ['course', params.id] })
    } finally {
      setProcessingNext(false)
    }
  }

  // FIXED: Mark current lesson completed only
  async function handleMarkComplete() {
    if (!selectedLesson) return
    setProcessingNext(true)
    try {
      // Always mark current lesson as COMPLETED when "Complete" button is clicked
      if (selectedLesson.status !== 'COMPLETED') {
        markSelectedLessonOptimistic('COMPLETED')
        await markCompletedMutation.mutateAsync(selectedLesson.id)
      }

      await queryClient.invalidateQueries({ queryKey: ['course', params.id] })
    } catch (err) {
      console.error('Failed to mark lesson complete:', err)
      await queryClient.invalidateQueries({ queryKey: ['course', params.id] })
    } finally {
      setProcessingNext(false)
    }
  }

  // Complete course: mark all incomplete lessons as completed (batch)
  async function handleCompleteCourse() {
    if (!course) return
    setProcessingComplete(true)
    try {
      const allLessons = course.modules.flatMap((m) => m.lessons)
      const incomplete = allLessons.filter((l) => l.status !== 'COMPLETED')
      if (incomplete.length === 0) {
        // already complete; still ensure UI sync
        await queryClient.invalidateQueries({ queryKey: ['course', params.id] })
        setProcessingComplete(false)
        return
      }

      // optimistic local: mark selectedLesson completed and optionally others if visible
      setSelectedLesson((s) => (s ? { ...s, status: 'COMPLETED' } : s))

      // run mutations in parallel but handle failures individually
      const promises = incomplete.map((l) =>
        markCompletedMutation.mutateAsync(l.id).catch((err) => {
          console.error('Failed to mark lesson', l.id, err)
          return { error: String(err) }
        })
      )

      await Promise.all(promises)

      // refresh course and set progress to up-to-date
      await queryClient.invalidateQueries({ queryKey: ['course', params.id] })
    } catch (err) {
      console.error('Failed to complete course:', err)
      await queryClient.invalidateQueries({ queryKey: ['course', params.id] })
    } finally {
      setProcessingComplete(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <Card className="rounded-2xl shadow-lg border-0 overflow-hidden">
                <div className="p-8">
                  <SkeletonCourseHeader />
                  <div className="mt-8">
                    <SmoothLoader />
                  </div>
                </div>
              </Card>
              <div className="space-y-4">
                <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            </div>
            <div className="lg:col-span-1">
              <Card className="rounded-2xl shadow-lg border-0 p-6">
                <div className="space-y-4">
                  <div className="h-6 w-1/2 bg-gray-200 rounded animate-pulse" />
                  <div className="h-40 bg-gray-100 rounded-md animate-pulse" />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-xl border bg-red-50 text-red-800 p-4">
            {(error as Error).message || 'Error loading course'}
          </div>
        </div>
      </div>
    )
  }

  function WhatsAppQaBody({
    courseTitle,
    lessonTitle,
    userName,
    phone = "+917306803881", // our WhatsApp number in full international format
    onClose,
  }: {
    courseTitle?: string | null;
    lessonTitle?: string | null;
    userName?: string | null;
    phone?: string;
    onClose?: () => void;
  }) {
    const [text, setText] = useState("");

    // Build the default message template
    function buildMessageBody(customText: string) {
      const headerParts = [
        courseTitle ? `Course: ${courseTitle}` : null,
        lessonTitle ? `Lesson: ${lessonTitle}` : null,
        userName ? `From: ${userName}` : null,
      ].filter(Boolean);

      const header = headerParts.length ? headerParts.join(" | ") + "\n\n" : "";
      const body = customText.trim() ? customText.trim() : "<Type your question here>";
      return `${header}${body}\n\n-- Sent via LMS Q&A`;
    }

    // Try to open WhatsApp. Use whatsapp:// on mobile if available, otherwise wa.me web link.
    function openWhatsApp(number: string, message: string) {
      const encoded = encodeURIComponent(message);
      // prefer whatsapp:// protocol on mobile if supported
      const whatsappAppUrl = `whatsapp://send?phone=${number.replace(/[^\d+]/g, "")}&text=${encoded}`;
      const waMeUrl = `https://wa.me/${number.replace(/[^\d+]/g, "")}?text=${encoded}`;

      // attempt to open the whatsapp:// link first (mobile deep link), fallback to wa.me
      // Opening in new tab/window to avoid navigating away from app
      const newWindow = window.open(whatsappAppUrl, "_blank");
      // If popup blocked or protocol not supported, fallback to wa.me after short delay
      setTimeout(() => {
        // some browsers return null for blocked popup attempts; just open wa.me in that case
        if (!newWindow || newWindow.closed) {
          window.open(waMeUrl, "_blank");
        }
      }, 600);
    }

    async function handleSend() {
      if (!text.trim()) {
        // optional: show a toast or simple alert
        alert("Please type your question before sending.");
        return;
      }
      const msg = buildMessageBody(text);
      openWhatsApp(phone, msg);
      // optionally clear text and close the slide-over
      setText("");
      onClose?.();
    }

    return (
      <div className="p-4">
        <p className="text-sm text-gray-500">
          Ask questions about this lesson — messages go only to instructors via
          WhatsApp.
        </p>

        <div className="mt-4">
          <textarea
            className="w-full rounded-md border p-2 h-32 resize-none"
            placeholder="Type your question..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-xs text-gray-400">
              Tip: include lesson timestamps or screenshots (if needed).
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                onClick={() => {
                  setText("");
                }}
              >
                Clear
              </button>
              <Button size="sm" onClick={handleSend}>
                Send via WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedYouTubeId = pickYouTubeId(selectedLesson || undefined)
  const nextLesson = selectedLesson ? findNextLesson(selectedLesson.id) : null
  const allLessonsFlat = course?.modules.flatMap((m) => m.lessons) ?? []
  const currentIndex = selectedLesson ? allLessonsFlat.findIndex((l) => l.id === selectedLesson.id) : -1
  const isLastLesson = currentIndex === allLessonsFlat.length - 1

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-2"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{course?.title}</h1>
              <p className="text-gray-600 max-w-xl mt-2">{course?.description}</p>

              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">
                    Est. {Math.max(
                      1,
                      Math.round(
                        (course?.modules.flatMap((m) => m.lessons).reduce((a, b) => a + (b.duration || 0), 0) || 0) / 60
                      )
                    )} hrs
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm">
                  <span className="font-medium text-gray-800">{course?.modules.length ?? 0} Modules</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm">
                  <span className="text-gray-600">{totalLessons} Lessons</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Back to top
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)}>
                <MessageSquare className="w-4 h-4" /> Q&A
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full"
        >
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Course Progress</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="w-full h-2" />
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-4 gap-8 items-start">
          <div className="lg:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
              {selectedLesson && (
                <motion.div
                  key={selectedLesson.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-6"
                >
                  <Card className="rounded-2xl shadow-lg border-0 overflow-hidden hover:scale-[1.01] transition-transform">
                    <div className="aspect-video bg-black">
                      {selectedYouTubeId ? (
                        <VideoPlayer
                          key={selectedYouTubeId || selectedLesson.id}
                          youtubeVideoId={selectedYouTubeId}
                          lessonId={selectedLesson.id}
                          onProgress={({ completed }) => {
                            // Only auto-complete when video is fully watched
                            if (completed && selectedLesson.status !== 'COMPLETED') {
                              markCompletedMutation.mutate(selectedLesson.id)
                            }
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-sm text-gray-400">Unable to find a valid Video ID for this lesson.</div>
                      )}
                    </div>
                  </Card>

                  <Card className="rounded-2xl shadow-lg border-0 hover:scale-[1.01] transition-transform">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-semibold">{selectedLesson.title}</h2>
                          <div className="flex items-center gap-4 text-gray-500 text-sm">
                            <Clock className="w-4 h-4" />
                            <span>{Math.max(1, Math.floor((selectedLesson.duration || 0) / 60))} min</span>
                            <Badge variant={selectedLesson.status === 'COMPLETED' ? 'default' : 'secondary'} className={cn('px-2 py-1 rounded-full', selectedLesson.status === 'COMPLETED' ? 'bg-green-100' : '')}>
                              {selectedLesson.status === 'COMPLETED' ? (
                                <span className="flex items-center gap-2 text-green-700"><CheckCircle className="w-4 h-4" /> Completed</span>
                              ) : selectedLesson.status === 'IN_PROGRESS' ? (
                                <span className="flex items-center gap-2 text-blue-700"><PlayCircle className="w-4 h-4" /> In Progress</span>
                              ) : (
                                'Not Started'
                              )}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)} className="rounded-xl flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> Q&A
                          </Button>
                        </div>
                      </div>

                      {/* action row */}
                      <div className="mt-6 border-t pt-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">Lesson {currentIndex + 1} of {totalLessons}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            size="lg"
                            onClick={handleNext}
                            disabled={!nextLesson || processingNext}
                            className={cn('rounded-full px-6 py-2 shadow-md hover:shadow-lg transform-gpu transition-transform', (!nextLesson || processingNext) ? 'opacity-50 cursor-not-allowed' : '')}
                          >
                            {nextLesson ? (
                              <div className="flex items-center gap-2">
                                <span>{processingNext ? 'Working…' : 'Next Lesson'}</span>
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            ) : ('No Next')}
                          </Button>

                          <Button
                            size="lg"
                            onClick={handleMarkComplete}
                            disabled={processingComplete || processingNext}
                            className="rounded-full px-6 py-2 text-white shadow-md hover:brightness-105 bg-gradient-to-r from-indigo-600 to-indigo-500"
                          >
                            {processingComplete ? 'Completing…' : 'Mark Complete'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Course outline sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-28">
              <Card className="rounded-2xl shadow-lg border-0 hover:shadow-xl transition-shadow">
                <CardContent className="p-0">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Course Content</h3>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                    {course?.modules.map((module) => (
                      <div key={module.id}>
                        <div className="p-4 bg-gray-50">
                          <h4 className="font-medium text-sm text-gray-800">{module.title}</h4>
                        </div>
                        {module.lessons.map((lesson) => (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              setSelectedLesson(lesson)
                              // Just select lesson, let backend determine status
                            }}
                            className={cn(
                              'w-full p-4 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors',
                              selectedLesson?.id === lesson.id &&
                                'bg-gradient-to-r from-[#0C1838]/10 to-[#1E3A8A]/10 border-l-4 border-l-[#0C1838]'
                            )}
                          >
                            <div className="flex-shrink-0">
                              {lesson.status === 'COMPLETED' ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : lesson.status === 'IN_PROGRESS' ? (
                                <PlayCircle className="w-5 h-5 text-[#0C1838]" />
                              ) : (
                                <PlayCircle className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-gray-900">{lesson.title}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{Math.max(1, Math.floor((lesson.duration || 0) / 60))} min</span>
                                {lesson.type === 'VIDEO' && <PlayCircle className="w-3 h-3 text-[#0C1838]" />}
                                {lesson.type === 'PDF' && <BookOpen className="w-3 h-3 text-[#1E3A8A]" />}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Q&A Slide-over */}
        <AnimatePresence>
          {showChat && (
            <motion.aside
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.25 }}
              className="fixed right-6 bottom-6 w-96 bg-white rounded-2xl shadow-2xl border z-50 overflow-hidden"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <div className="font-medium">Q&A</div>
                <button className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setShowChat(false)}>
                  Close
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <WhatsAppQaBody
                  courseTitle={course?.title}
                  lessonTitle={selectedLesson?.title}
                  userName={user?.name ?? user?.email ?? null}
                  phone="+917306803881"
                  onClose={() => setShowChat(false)}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}