'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

export interface EditCourseData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  isActive: boolean;
  createdAt: string;
  moduleCount: number;
  enrollmentCount: number;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: EditCourseData | null;
  onSuccess?: () => void;
};

export function EditCourseDialog({ open, onOpenChange, course, onSuccess }: Props) {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [thumbnail, setThumbnail] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);

  // hydrate state when course changes or dialog opens
  React.useEffect(() => {
    if (course) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setThumbnail(course.thumbnail || '');
      setIsActive(!!course.isActive);
    }
  }, [course, open]);

  const authHeaders = user?.token ? { Authorization: `Bearer ${user.token}` } : undefined;

  const handleAuthError = async (res: Response) => {
    if (res.status === 401 || res.status === 403) {
      await logout();
      throw new Error('Your session has expired. Please sign in again.');
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!course) throw new Error('No course selected');
      const body = { title, description, thumbnail, isActive };
      const res = await fetch(`${API}/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}) },
        body: JSON.stringify(body),
      });
      await handleAuthError(res);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to update course');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Course updated successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update course'),
  });

  const canSubmit =
    !!user?.token && !!title.trim() && !!thumbnail.trim() && !updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !updateMutation.isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>Update course details and visibility.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Course title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              placeholder="Short course description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="thumbnail">Thumbnail URL</Label>
            <Input
              id="thumbnail"
              placeholder="https://…/image.jpg"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
            />
            <div className="flex items-center gap-3 pt-1">
              <div className="w-16 h-10 rounded overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnail || '/placeholder-course.png'}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-course.png';
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground">Preview</span>
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <Label htmlFor="active">Active</Label>
              <p className="text-xs text-muted-foreground">
                If off, the course will be hidden from students.
              </p>
            </div>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={!canSubmit}>
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
