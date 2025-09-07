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
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#0C1838] via-[#1E3A8A] to-[#0C1838] text-white backdrop-blur-2xl shadow-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.pacelab.png" // replace with your logo path
              alt="PaceLab Logo"
              width={150}
              height={150}
              className="rounded-lg"
            />
          
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {getNavigationItems().map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative text-sm font-semibold text-white/90 hover:text-white transition-colors"
              >
                {item.label}
                <motion.span
                  className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-pink-500 to-blue-500 origin-left scale-x-0"
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
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </Button>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="ghost"
                        className="relative h-11 w-11 rounded-full hover:bg-white/10"
                      >
                        <Avatar className="h-11 w-11 ring-2 ring-white/30 shadow-md">
                          <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold">
                            {getInitials(user.firstName, user.email)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </motion.div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-64 rounded-2xl shadow-2xl bg-white text-black border border-gray-100"
                    align="end"
                  >
                    <div className="flex items-center gap-3 p-3 border-b">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-black text-white text-sm">
                          {getInitials(user.firstName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">
                          {(user.firstName ?? "").trim()}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/login">
                <Button className="rounded-xl bg-gradient-to-r from-pink-500 to-blue-600 text-white font-semibold shadow-lg hover:opacity-90 transition">
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
              className="md:hidden border-t border-white/10 py-4 space-y-2 bg-gradient-to-b from-[#0C1838]/95 to-[#1E3A8A]/95 rounded-b-xl"
            >
              {getNavigationItems().map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 rounded-lg text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 transition"
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


