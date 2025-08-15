"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
  Lightbulb,
  FileText,
  Calculator,
  Layers,
  Palette,
} from "lucide-react";

interface HeaderProps {
  user?: {
    fullName: string | null;
    email: string;
  };
  currentPage?: string;
}

export function Header({ user, currentPage = "Dashboard" }: HeaderProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  const closeNav = () => {
    setIsNavOpen(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to login page
        window.location.href = "/auth/login";
      } else {
        console.error("Logout failed:", data.message);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-black border-b border-nexa-border relative">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Left: Page identifier */}
          <div className="flex items-center">
            <span className="text-white font-medium">{currentPage}</span>
          </div>

          {/* Center: Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <div
              className="flex items-center gap-3 cursor-pointer transition-all duration-200 hover:scale-105 hover:opacity-90"
              onClick={toggleNav}
            >
              <img
                src="/images/nexanonameicon.png?v=1"
                alt="NEXA"
                className="w-10 h-10 object-contain"
              />
              <span className="text-white text-xl font-bold tracking-wide">
                NEXA
              </span>
            </div>
          </div>

          {/* Right: User actions */}
          <div className="flex items-center gap-3">
            {user && (
              <>
                <span className="text-nexa-muted text-sm hidden sm:block">
                  {user.fullName || user.email}
                </span>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-nexa-border text-white hover:bg-white/10"
                >
                  <Link href="/profile">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-nexa-border text-white hover:bg-white/10"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Section - Collapsible */}
        {isNavOpen && (
          <div className="bg-black border-t border-nexa-border py-5">
            <div className="flex justify-center">
              <div className="flex flex-wrap justify-center gap-4 max-w-4xl">
                <Link
                  href="/structuring"
                  className="nav-button"
                  onClick={closeNav}
                >
                  <Layers className="h-8 w-8 mb-2 text-white" />
                  <span className="text-sm font-medium text-white">
                    Structuring
                  </span>
                </Link>

                <Link href="/visuals" className="nav-button" onClick={closeNav}>
                  <Palette className="h-8 w-8 mb-2 text-white" />
                  <span className="text-sm font-medium text-white">
                    Visuals
                  </span>
                </Link>

                <Link
                  href="/solutioning"
                  className="nav-button"
                  onClick={closeNav}
                >
                  <Lightbulb className="h-8 w-8 mb-2 text-white" />
                  <span className="text-sm font-medium text-white">
                    Solutioning
                  </span>
                </Link>

                <Link href="/sow" className="nav-button" onClick={closeNav}>
                  <FileText className="h-8 w-8 mb-2 text-white" />
                  <span className="text-sm font-medium text-white">SoW</span>
                </Link>

                <Link href="/loe" className="nav-button" onClick={closeNav}>
                  <Calculator className="h-8 w-8 mb-2 text-white" />
                  <span className="text-sm font-medium text-white">LoE</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay to close nav when clicking outside */}
      {isNavOpen && (
        <div className="fixed inset-0 bg-black/20 z-[-1]" onClick={closeNav} />
      )}
    </header>
  );
}
