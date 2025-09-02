'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // not logged in → login
    if (!user) {
      router.replace('/login');
      return;
    }

    // logged in → role-based landing
    if (user.role === 'ADMIN' || user.role === 'INSTRUCTOR') {
      router.replace('/admin/users');
    } else {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // while auth bootstraps, show your skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
        <Card className="w-96 rounded-2xl shadow-primary">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <Skeleton className="h-8 w-32 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // prevent flicker; we'll immediately redirect above
  return null;
}
