'use client';

import { useState } from 'react';
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

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type RoleT = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  role: RoleT;
  password: string;
  assignedCourses: string[]; // course IDs
}

export function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const [formData, setFormData] = useState<CreateUserData>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'STUDENT',
    password: '',
    assignedCourses: [],
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
    enabled: open, // only when dialog is open
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const name = `${data.firstName} ${data.lastName}`.replace(/\s+/g, ' ').trim();
      const payload = {
        name,
        email: data.email,
        role: data.role,
        password: data.password,
        assignedCourseIds: data.assignedCourses, // ✅ matches backend DTO
      };

      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = 'Failed to create user';
        try {
          const err = await res.json();
          msg = err?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success('User created successfully');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'STUDENT',
        password: '',
        assignedCourses: [],
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
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
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system and assign courses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as RoleT }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
              <Button type="button" onClick={generatePassword}>
                Generate
              </Button>
            </div>
          </div>

          {/* Assigned Courses */}
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
                      onCheckedChange={(checked) => {
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
