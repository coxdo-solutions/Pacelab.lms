'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/navbar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { useAuth } from '@/lib/auth-context';

type RoleT = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
type StatusT = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: RoleT;
  status: StatusT;
  createdAt: string;
  lastLoginAt?: string | null;
  assignedCourses?: { id: string; title: string }[];
}

export default function AdminUsersPage() {
  const API = (process.env.NEXT_PUBLIC_API_URL || 'https://4e11461f9308.ngrok-free.app').replace(/\/$/, '');
  const { user, logout } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const authHeaders = user?.token ? { Authorization: `Bearer ${user.token}` } : undefined;

  const handleAuthError = async (res: Response) => {
    if (res.status === 401 || res.status === 403) {
      await logout();
      throw new Error('Your session has expired. Please sign in again.');
    }
  };

  // Fetch users
  const {
    data: users = [],
    isLoading,
    isError,
    error,
  } = useQuery<UserRow[]>({
    queryKey: ['admin-users'],
    enabled: !!user?.token,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`${API}/users`, {
        method: 'GET',
        headers: { ...(authHeaders || {}) },
        cache: 'no-store',
      });
      await handleAuthError(res);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to fetch users');
      }
      return res.json();
    },
  });

  // Helpers
  const toInitials = (fullName?: string | null) => {
    const safe = (fullName ?? '').trim();
    if (!safe) return 'NA';
    const parts = safe.split(/\s+/);
    const a = parts[0]?.[0] ?? '';
    const b = parts[1]?.[0] ?? '';
    return (`${a}${b}` || a).toUpperCase() || 'NA';
  };

  const roleBadge = (role: RoleT) =>
    ({
      ADMIN: 'bg-red-100 text-red-800',
      INSTRUCTOR: 'bg-blue-100 text-blue-800',
      STUDENT: 'bg-green-100 text-green-800',
    }[role] || 'bg-gray-100 text-gray-800');

  const statusBadge = (status: StatusT) =>
    status === 'ACTIVE'
      ? 'bg-green-100 text-green-800'
      : status === 'SUSPENDED'
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800';

  // Filter (safe)
  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, searchTerm]);

  // Mutations
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`${API}/users/${userId}`, {
        method: 'DELETE',
        headers: { ...(authHeaders || {}) },
      });
      await handleAuthError(res);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to delete user');
      }
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deleted successfully');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete user'),
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: StatusT }) => {
      const res = await fetch(`${API}/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}) },
        body: JSON.stringify({ status }),
      });
      await handleAuthError(res);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to update user status');
      }
      return { userId, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(`User ${data.status.toLowerCase()} successfully`);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update user status'),
  });

  const handleDeleteUser = (userId: string) => {
    if (deleteUserMutation.isPending || toggleUserStatusMutation.isPending) return;
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleToggleStatus = (userId: string, currentStatus: StatusT) => {
    if (deleteUserMutation.isPending || toggleUserStatusMutation.isPending) return;
    const next: StatusT = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    toggleUserStatusMutation.mutate({ userId, status: next });
  };

  const actionsDisabled = !user?.token || deleteUserMutation.isPending || toggleUserStatusMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1 }} className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#0C1838]">User Management</h1>
              <p className="text-gray-500 mt-1">Manage all users in the system</p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              disabled={!user?.token}
              className="rounded-xl bg-gradient-to-r from-[#0C1838] to-[#1E3A8A] text-white shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add User
            </Button>
          </div>

          {/* Users Table */}
          <Card className="rounded-2xl shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#0C1838]/10 to-[#1E3A8A]/10">
              <CardTitle className="flex items-center gap-2 text-[#0C1838]">
                <Users className="w-5 h-5" /> All Users ({filteredUsers.length})
              </CardTitle>
              <CardDescription className="text-gray-600">
                View and manage all users in the system
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading &&
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                              <div className="space-y-1">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><div className="h-6 w-16 bg-gray-200 rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-6 w-16 bg-gray-200 rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-8 w-8 bg-gray-200 rounded animate-pulse" /></TableCell>
                        </TableRow>
                      ))}

                    {isError && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-red-600">
                          {(error as Error)?.message || 'Failed to load users'}
                        </TableCell>
                      </TableRow>
                    )}

                    {!isLoading && !isError && filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-8">
                          No users found. Try adjusting your search.
                        </TableCell>
                      </TableRow>
                    )}

                    {!isLoading &&
                      !isError &&
                      filteredUsers.map((u, index) => (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#0C1838]/20 rounded-full flex items-center justify-center">
                                <span className="text-sm font-semibold text-[#0C1838]">
                                  {toInitials(u.name)}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{u.name ?? '—'}</div>
                                <div className="text-sm text-gray-500">{u.email}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge className={`rounded-lg ${roleBadge(u.role)}`}>{u.role}</Badge>
                          </TableCell>

                          <TableCell>
                            <Badge className={`rounded-lg ${statusBadge(u.status)}`}>{u.status}</Badge>
                          </TableCell>

                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                            </span>
                          </TableCell>

                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                            </span>
                          </TableCell>

                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  disabled={actionsDisabled}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl shadow-lg border border-gray-100">
                                <DropdownMenuItem disabled>
                                  <Edit className="w-4 h-4 mr-2" /> Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(u.id, u.status)}
                                  disabled={actionsDisabled}
                                >
                                  {u.status === 'ACTIVE' ? (
                                    <>
                                      <UserX className="w-4 h-4 mr-2" /> Suspend User
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4 mr-2" /> Activate User
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="text-destructive focus:text-destructive"
                                  disabled={actionsDisabled}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
      />
    </div>
  );
}


