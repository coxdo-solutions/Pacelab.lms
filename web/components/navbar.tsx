"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Menu, X } from "lucide-react"; // removed unused icons
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // ✅ Only use firstName + email
  const getInitials = (firstName?: string | null, email?: string | null) => {
    const a = firstName?.trim()?.[0] ?? "";
    if (a) return a.toUpperCase();
    const c = email?.trim()?.[0] ?? "?";
    return c.toUpperCase();
  };

  const getNavigationItems = () => {
    if (!user) return [];
    const items: { href: string; label: string }[] = [];

    if (user.role === "ADMIN" || user.role === "INSTRUCTOR") {
      items.push(
        { href: "/admin/users", label: "Users" },
        { href: "/admin/courses", label: "Courses" }
      );
    } else {
      items.push({ href: "/dashboard", label: "My Courses" });
    }
    return items;
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-gradient-to-r from-[#0C1838] to-[#1E3A8A] text-white backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-extrabold tracking-wider hover:scale-105 transition-transform"
          >
            PaceLab.in
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {getNavigationItems().map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                {item.label}
                <motion.span
                  className="absolute -bottom-1 left-0 w-full h-[2px] bg-white origin-left scale-x-0"
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            ))}
          </nav>

          {/* User / Auth Menu */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Mobile Menu Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden text-white hover:bg-white/10"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </Button>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        className="relative h-11 w-11 rounded-full hover:bg-white/10"
                      >
                        <Avatar className="h-11 w-11 ring-2 ring-white/30 shadow">
                          <AvatarFallback className="bg-white/20 text-white font-semibold">
                            {getInitials(user.firstName, user.email)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </motion.div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-60 rounded-2xl shadow-xl bg-white text-black"
                    align="end"
                  >
                    <div className="flex items-center gap-2 p-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-black text-white text-xs">
                          {getInitials(user.firstName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">
                          {(user.firstName ?? "").trim()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/login">
                <Button className="rounded-xl bg-white text-[#0C1838] font-semibold shadow hover:bg-white/90 transition">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden border-t border-white/20 py-4 space-y-2"
            >
              {getNavigationItems().map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
