'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, Role } from '@/lib/auth-context';

export default function RoleGuard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!allow.includes(user.role)) {
      // not allowed -> send them to their place
      if (user.role === 'STUDENT') router.replace('/dashboard');
      else router.replace('/admin/users');
    }
  }, [user, loading, allow, router]);

  if (loading || !user) {
    return (
      <div className="min-h-[50vh] grid place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
