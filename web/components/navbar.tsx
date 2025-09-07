"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, X, LogOut } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const getInitials = (firstName?: string | null, email?: string | null) => {
    const a = firstName?.trim()?.[0] ?? "";
    if (a) return a.toUpperCase();
    const c = email?.trim()?.[0] ?? "?";
    return c.toUpperCase();
  };

  const getNavigationItems = () => {
    if (!user) return [{ href: "/courses", label: "Courses" }];
    const items: { href: string; label: string }[] = [];
    if (user.role === "ADMIN" || user.role === "INSTRUCTOR") {
      items.push({ href: "/admin/users", label: "Users" });
      items.push({ href: "/admin/courses", label: "Courses" });
    } else {
      items.push({ href: "/dashboard", label: "Courses" });
    }
    return items;
  };

  return (
    <header className="sticky top-4 z-50">
      <div className="mx-auto max-w-7xl px-4">
        {/* White navbar with black text */}
        <div className="bg-gradient-to-r from-[#0C1838] via-[#1E3A8A] to-[#0C1838] border border-gray-200 rounded-2xl shadow p-3 text-black">
          <div className="flex items-center gap-6 px-3 py-1">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <Image
                src="/pacelab.logo.png"
                alt="PaceLab"
                width={128}
                height={40}
                className="object-contain"
                priority
              />
            </Link>

            {/* Centered navigation (desktop) */}
            <nav className="hidden md:flex flex-1 justify-center items-center">
              <div className="flex gap-4">
                {getNavigationItems().map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                        isActive
                          ? "bg-gradient-to-r from-pink-500 to-indigo-600 text-white shadow"
                          : "text-black/90 hover:text-black hover:bg-black/5"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="relative z-10">{item.label}</span>
                      <motion.span
                        className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-pink-500 to-blue-500 origin-left scale-x-0"
                        whileHover={{ scaleX: 1 }}
                        transition={{ duration: 0.28 }}
                      />
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Auth / Avatar */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-10 w-10 ring-1 ring-gray-200 shadow-sm">
                        <AvatarFallback className="bg-gray-800 text-white font-semibold">
                          {getInitials(user.firstName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </motion.button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-2xl shadow bg-white text-black border border-gray-100"
                  >
                    <div className="flex items-center gap-3 p-3 border-b">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-black text-white text-sm">
                          {getInitials(user.firstName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{(user.firstName ?? "").trim()}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-rose-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button className="rounded-full bg-gradient-to-r from-pink-500 to-indigo-600 text-white px-4 py-2 shadow-md">
                    Sign In
                  </Button>
                </Link>
              )}

              {/* Mobile menu toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileOpen((s) => !s)}
                className="md:hidden h-10 w-10 rounded-lg text-black hover:bg-black/5"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile drawer */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="mt-2 md:hidden overflow-hidden rounded-lg"
              >
                <div className="bg-white border border-gray-200 p-3 rounded-lg">
                  <div className="flex flex-col gap-2">
                    {getNavigationItems().map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`block px-3 py-2 rounded-md text-sm font-medium ${
                          pathname === item.href
                            ? "text-white bg-indigo-600"
                            : "text-black/90 hover:bg-black/5"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}

                    <div className="pt-2 border-t border-gray-200">
                      <Link
                        href="/login"
                        onClick={() => setMobileOpen(false)}
                        className="block px-3 py-2 rounded-md text-sm font-medium text-black/90"
                      >
                        {user ? "Profile" : "Sign In"}
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}



