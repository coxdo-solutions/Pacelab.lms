'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CreateCourseData {
  title: string;
  description: string;
  thumbnail: string;
}

export function CreateCourseDialog({ open, onOpenChange, onSuccess }: CreateCourseDialogProps) {
  const [formData, setFormData] = useState<CreateCourseData>({
    title: '',
    description: '',
    thumbnail: '',
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: CreateCourseData) => {
      const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const res = await fetch(`${BACKEND_URL}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        let errorMessage = 'Failed to create course';
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If parsing fails, keep default message
        }
        throw new Error(errorMessage);
      }

      return res.json();
    },
    onSuccess: (createdCourse) => {
      toast.success('Course created successfully');
      setFormData({ title: '', description: '', thumbnail: '' });
      onSuccess(); // Refresh parent list or close modal
      console.log('Created course:', createdCourse);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create course');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCourseMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>
            Create a new course that will contain modules with YouTube videos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Course Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter course title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter course description"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail URL</Label>
            <Input
              id="thumbnail"
              type="url"
              value={formData.thumbnail}
              onChange={(e) => setFormData(prev => ({ ...prev, thumbnail: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              required
            />
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCourseMutation.isPending}>
              {createCourseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Course'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

