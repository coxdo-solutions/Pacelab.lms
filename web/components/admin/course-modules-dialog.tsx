'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { YouTubeVideoUploader } from './YouTube-Video-Uploader';
import { useAuth } from '@/lib/auth-context';

// ---- Local types
interface Course { id: string; title: string; }
interface Lesson { id: string; title: string; youtubeId?: string; duration?: number; order: number; }
interface Module { id: string; title: string; order: number; lessons: Lesson[]; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course;
  onSuccess: () => void;
}

// ---- Helper: robust YT ID extractor
function parseYouTubeIdFromAnything(input: unknown): string | null {
  if (!input || typeof input !== 'object') return null;
  const v: any = input;

  const raw = v.id ?? v.videoId ?? v.youtubeId ?? v.content ?? v.videoURL ?? v.videoUrl ?? v.url;
  const candidates: string[] = [];

  if (typeof raw === 'string') candidates.push(raw);
  if (typeof v.watchUrl === 'string') candidates.push(v.watchUrl);
  if (typeof v.embedUrl === 'string') candidates.push(v.embedUrl);

  for (const c of candidates) {
    const id = extractId(c);
    if (id) return id;
  }

  for (const k of ['id', 'videoId', 'youtubeId']) {
    const val = v[k];
    if (typeof val === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(val.trim())) return val.trim();
  }

  return null;

  function extractId(s: string): string | null {
    const trimmed = s.trim().replace(/^"+|"+$/g, '');
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    try {
      const u = new URL(trimmed);
      const v = u.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const segs = u.pathname.split('/').filter(Boolean);
      const getAfter = (token: string) => {
        const i = segs.indexOf(token);
        return i !== -1 ? segs[i + 1] : undefined;
      };
      const fromEmbed = getAfter('embed');
      if (fromEmbed && /^[a-zA-Z0-9_-]{11}$/.test(fromEmbed)) return fromEmbed;
      const fromShorts = getAfter('shorts');
      if (fromShorts && /^[a-zA-Z0-9_-]{11}$/.test(fromShorts)) return fromShorts;
      const tail = segs[segs.length - 1];
      if (tail && /^[a-zA-Z0-9_-]{11}$/.test(tail)) return tail;
    } catch {}
    return null;
  }
}

export function CourseModulesDialog({ open, onOpenChange, course, onSuccess }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const API = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    []
  );

  // ✅ Fix: Always return valid HeadersInit using the Headers API
  const authHeaders = useMemo<HeadersInit>(() => {
    const h = new Headers();
    if (user?.token) {
      h.set('Authorization', `Bearer ${user.token}`);
    }
    return h;
  }, [user?.token]);

  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [expandModuleId, setExpandModuleId] = useState<string>('');
  const [newLessonData, setNewLessonData] = useState<{
    moduleId: string;
    title: string;
    uploadedVideo: any | null;
  }>({ moduleId: '', title: '', uploadedVideo: null });

  // Load modules
  const { data: modules = [], isLoading } = useQuery<Module[]>({
    enabled: open && !!course?.id,
    queryKey: ['course-modules', course.id],
    queryFn: async () => {
      const res = await fetch(`${API}/courses/${course.id}/modules`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to fetch modules');
      return res.json();
    },
  });

  // Add module
  const addModule = useMutation({
    mutationFn: async (title: string) => {
      const nextOrder =
        (modules?.map((m) => m.order).reduce((a, b) => Math.max(a, b), 0) ?? 0) + 1;

      const res = await fetch(`${API}/courses/modules`, {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        }),
        body: JSON.stringify({
          title,
          order: nextOrder,
          courseId: course.id,
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => 'Failed to add module');
        throw new Error(msg || 'Failed to add module');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Module added');
      setNewModuleTitle('');
      queryClient.invalidateQueries({ queryKey: ['course-modules', course.id] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to add module'),
  });

  // Add lesson
  const addLesson = useMutation({
    mutationFn: async ({
      moduleId,
      title,
      video,
    }: {
      moduleId: string;
      title: string;
      video: any;
    }) => {
      const currentModule = modules.find((m) => m.id === moduleId);
      const nextOrder =
        (currentModule?.lessons?.map((l) => l.order).reduce((a, b) => Math.max(a, b), 0) ?? 0) + 1;

      const vid = parseYouTubeIdFromAnything(video);
      if (!vid) {
        throw new Error('Could not parse YouTube video ID from upload result.');
      }

      const dur =
        typeof video?.duration === 'number' && Number.isFinite(video.duration)
          ? video.duration
          : null;

      const payload = {
        moduleId,
        title,
        youtubeId: vid,
        videoUrl: `https://www.youtube.com/watch?v=${vid}`,
        duration: dur,
        order: nextOrder,
      };

      const res = await fetch(`${API}/courses/lessons`, {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => 'Failed to add lesson');
        throw new Error(msg || 'Failed to add lesson');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Lesson added');
      setNewLessonData({ moduleId: '', title: '', uploadedVideo: null });
      setExpandModuleId('');
      queryClient.invalidateQueries({ queryKey: ['course-modules', course.id] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to add lesson'),
  });

  const handleAddModule = () => {
    if (!newModuleTitle.trim()) return toast.error('Enter a module title');
    addModule.mutate(newModuleTitle.trim());
  };

  const handleAddLesson = () => {
    if (!newLessonData.title.trim()) return toast.error('Provide a lesson title');
    if (!newLessonData.uploadedVideo) return toast.error('Upload/Select a YouTube video');
    if (!newLessonData.moduleId) return toast.error('No module selected');
    addLesson.mutate({
      moduleId: newLessonData.moduleId,
      title: newLessonData.title.trim(),
      video: newLessonData.uploadedVideo,
    });
  };

  const formatDuration = (s?: number) => {
    if (!s || s <= 0) return '—';
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}m ${sec}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Manage “{course.title}” Modules</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Module */}
          <Card className="rounded-xl">
            <CardHeader className="flex items-center justify-between flex-row space-y-0">
              <CardTitle>Modules</CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="New module title"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  className="w-64"
                />
                <Button onClick={handleAddModule} disabled={addModule.isPending}>
                  {addModule.isPending ? 'Adding…' : 'Add Module'}
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading modules…</div>
              ) : modules.length === 0 ? (
                <div className="text-sm text-muted-foreground">No modules yet.</div>
              ) : (
                modules
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((m) => (
                    <Card key={m.id} className="mb-3 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {m.order}. {m.title}{' '}
                          <span className="text-xs text-muted-foreground">
                            ({m.lessons?.length ?? 0} lessons)
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setExpandModuleId((prev) => (prev === m.id ? '' : m.id));
                            setNewLessonData((prev) => ({ ...prev, moduleId: m.id }));
                          }}
                        >
                          {expandModuleId === m.id ? 'Close' : 'Add Lesson'}
                        </Button>
                      </div>

                      {expandModuleId === m.id && (
                        <div className="mt-3 p-3 border rounded-lg space-y-3">
                          <Input
                            placeholder="Lesson title"
                            value={newLessonData.title}
                            onChange={(e) =>
                              setNewLessonData((prev) => ({
                                ...prev,
                                title: e.target.value,
                                moduleId: m.id,
                              }))
                            }
                          />
                          <YouTubeVideoUploader
                            onUploadSuccess={(video) =>
                              setNewLessonData((prev) => ({
                                ...prev,
                                uploadedVideo: video,
                                moduleId: m.id,
                              }))
                            }
                          />
                          <div className="flex gap-2">
                            <Button onClick={handleAddLesson} disabled={addLesson.isPending}>
                              {addLesson.isPending ? 'Adding…' : 'Add Lesson'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setExpandModuleId('');
                                setNewLessonData({ moduleId: '', title: '', uploadedVideo: null });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Lessons */}
                      <ul className="mt-3 space-y-1">
                        {(m.lessons ?? [])
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((l) => (
                            <li key={l.id} className="text-sm text-gray-800">
                              {l.order}. {l.title}{' '}
                              <span className="text-xs text-gray-500">
                                {formatDuration(l.duration)}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </Card>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

