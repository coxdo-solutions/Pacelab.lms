"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const { user, login, loading: authBootstrapping } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, bounce them where they belong
  useEffect(() => {
    if (authBootstrapping) return;
    if (!user) return;

    if (next && next.startsWith("/")) {
      router.replace(next);
      return;
    }
    if (user.role === "ADMIN" || user.role === "INSTRUCTOR") {
      router.replace("/admin/users");
    } else {
      router.replace("/dashboard");
    }
  }, [user, authBootstrapping, next, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      const authed = await login(email, password);

      // Prefer ?next=... if provided (and safe)
      if (next && next.startsWith("/")) {
        router.replace(next);
        return;
      }

      // Otherwise route by role
      if (authed.role === "ADMIN" || authed.role === "INSTRUCTOR") {
        router.replace("/admin/users");
      } else {
        router.replace("/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  // While auth context is bootstrapping (checking /auth/me), keep a subtle idle UI
  if (authBootstrapping) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Preparing sign-in…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="rounded-3xl shadow-2xl border-0 backdrop-blur-xl bg-white/70 overflow-hidden">
          <CardHeader className="text-center pb-6 border-b bg-gradient-to-r from-[#0C1838] to-[#1E3A8A] text-white">
            {/* Logo */}
            <div className="flex justify-center mb-2">
              <img
                src="/pacelab.logo.png"
                alt="PaceLab Logo"
                className="h-10 md:h-12 object-contain"
              />
            </div>

            <CardDescription className="text-blue-50">
              Sign in to access your learning dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 rounded-xl focus:ring-2 focus:ring-blue-500"
                    autoComplete="email"
                    required
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 rounded-xl focus:ring-2 focus:ring-purple-500"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-[#0C1838] to-[#1E3A8A] hover:opacity-90 shadow-lg text-white py-6 text-lg font-medium"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </motion.div>
            </form>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 text-center text-sm text-gray-500"
            >
              Powered by{" "}
              <span className="font-semibold text-gray-700">Coxdo Solutions</span>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
