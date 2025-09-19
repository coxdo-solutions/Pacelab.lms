'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    assignedCourses?: { id: string; title: string }[];
  } | null;
  onSuccess: () => void;
}

export function EditUserDialog({ open, onOpenChange, user, onSuccess }: EditUserDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STUDENT',
    status: 'ACTIVE',
    assignedCourses: [] as string[],
    password: '', // <-- add password field
  });

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  // Fetch all courses
  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const res = await fetch(`${API}/courses`);
      if (!res.ok) throw new Error('Failed to fetch courses');
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (user && open) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'STUDENT',
        status: user.status || 'ACTIVE',
        assignedCourses: user.assignedCourses?.map(c => c.id) || [],
        password: '', // <-- reset password field on open
      });
    }
  }, [user, open]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        assignedCourseIds: data.assignedCourses,
      };
      if (data.password) payload.password = data.password; // <-- only send if filled

      const res = await fetch(`${API}/users/${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = 'Failed to update user';
        try {
          const err = await res.json();
          msg = err?.message || msg;
        } catch {}
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate(formData);
  };

  const toggleCourse = (courseId: string, checked: boolean) => {
    setFormData(prev => {
      const set = new Set(prev.assignedCourses);
      if (checked) set.add(courseId);
      else set.delete(courseId);
      return { ...prev, assignedCourses: Array.from(set) };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details and assigned courses.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={role => setFormData(prev => ({ ...prev, role }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={status => setFormData(prev => ({ ...prev, status }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="text"
              value={formData.password}
              onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Leave blank to keep unchanged"
            />
          </div>
          <div className="space-y-2">
            <Label>Assign Courses</Label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
              {loadingCourses ? (
                <p className="text-sm text-muted-foreground">Loading courses...</p>
              ) : (
                courses.map((course: any) => (
                  <div key={course.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`course-${course.id}`}
                      checked={formData.assignedCourses.includes(course.id)}
                      onCheckedChange={checked => {
                        if (checked === 'indeterminate') return;
                        toggleCourse(course.id, Boolean(checked));
                      }}
                    />
                    <label htmlFor={`course-${course.id}`} className="text-sm">
                      {course.title}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}