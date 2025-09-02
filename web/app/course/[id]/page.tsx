// ===========================
// app/(courses)/[id]/page.tsx
// ===========================

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
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

interface Lesson {
  id: string
  title: string
  type: 'VIDEO' | 'PDF' | 'QUIZ'
  content: string
  duration: number
  order: number
  completed: boolean
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

export default function CoursePage({ params }: { params: { id: string } }) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [showChat, setShowChat] = useState(false)
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
        body: JSON.stringify({ lessonId, completed: true }),
      })
      const text = await res.text().catch(() => '')
      if (!res.ok) throw new Error(text || 'Failed to mark lesson complete')
      return text ? JSON.parse(text) : {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', params.id] })
    },
  })

  const totalLessons =
    course?.modules.reduce((acc, m) => acc + (m.lessons?.length ?? 0), 0) ?? 0
  const completedLessons =
    course?.modules.reduce((acc, m) => acc + m.lessons.filter((l) => l.completed).length, 0) ?? 0
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

  useEffect(() => {
    if (course && !selectedLesson) {
      const allLessons = course.modules.flatMap((m) => m.lessons)
      const firstIncomplete = allLessons.find((l) => !l.completed)
      setSelectedLesson(firstIncomplete || allLessons[0] || null)
    }
  }, [course, selectedLesson])

  if (isLoading) return <div>Loading...</div>

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

  const selectedYouTubeId = pickYouTubeId(selectedLesson || undefined)

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold text-gray-900">{course?.title}</h1>
          <p className="text-gray-600">{course?.description}</p>
          <div className="flex items-center gap-4">
            <Progress value={progress} className="w-48 h-2 rounded-full bg-gray-200" />
            <span className="text-sm text-gray-700 font-medium">{Math.round(progress)}% Complete</span>
            <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-gradient-to-r from-[#0C1838] to-[#1E3A8A] text-white">
              {completedLessons}/{totalLessons} Lessons
            </Badge>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-3 space-y-6">
            {selectedLesson && (
              <motion.div
                key={selectedLesson.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <Card className="rounded-2xl shadow-lg border-0 overflow-hidden hover:scale-[1.01] transition-transform">
                  <div className="aspect-video">
                    {selectedYouTubeId ? (
                      <VideoPlayer
                        key={selectedYouTubeId || selectedLesson.id} // force remount on video change
                        youtubeVideoId={selectedYouTubeId}
                        lessonId={selectedLesson.id}
                        onProgress={({ completed }) => {
                          if (completed && !selectedLesson.completed) {
                            markCompletedMutation.mutate(selectedLesson.id)
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-gray-500">
                        Unable to find a valid YouTube ID for this lesson.
                      </div>
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
                          <Badge
                            variant={selectedLesson.completed ? 'default' : 'secondary'}
                            className="px-2 py-1 rounded-full"
                          >
                            {selectedLesson.completed ? 'Completed' : 'In Progress'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowChat(!showChat)}
                        className="rounded-xl flex items-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" /> Q&A
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Course Outline */}
          <div className="lg:col-span-1">
            <Card className="rounded-2xl shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardContent className="p-0">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Course Content</h3>
                </div>
                <div className="max-h[600px] overflow-y-auto divide-y divide-gray-100">
                  {course?.modules.map((module) => (
                    <div key={module.id}>
                      <div className="p-4 bg-gray-100">
                        <h4 className="font-medium text-sm text-gray-800">{module.title}</h4>
                      </div>
                      {module.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson)}
                          className={cn(
                            'w-full p-4 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors',
                            selectedLesson?.id === lesson.id &&
                              'bg-gradient-to-r from-[#0C1838]/10 to-[#1E3A8A]/10 border-l-4 border-l-[#0C1838]'
                          )}
                        >
                          <div className="flex-shrink-0">
                            {lesson.completed ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <PlayCircle className="w-5 h-5 text-[#0C1838]" />
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
    </div>
  )
}
