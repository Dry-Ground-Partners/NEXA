"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
} from "lucide-react";

interface HeaderProps {
  user?: {
    fullName: string | null;
    email: string;
  };
  selectedOrganization?: {
    organization: {
      id: string;
      name: string;
      slug: string | null;
    };
    role: string;
  } | null;
  currentPage?: string;
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ user, selectedOrganization, currentPage = "Dashboard", onSidebarToggle, isSidebarOpen = false }: HeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Determine what to display in the header - prioritize organization name
  const getDisplayName = () => {
    if (selectedOrganization?.organization?.name) {
      return selectedOrganization.organization.name;
    }
    return currentPage;
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
          {/* Left: Organization/Page identifier */}
          <div className="flex items-center">
            <span className="text-white font-medium">{getDisplayName()}</span>
          </div>

          {/* Center: Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <div
              className={`
                flex items-center gap-3 cursor-pointer transition-all duration-300 ease-in-out
                ${isSidebarOpen 
                  ? 'opacity-20 scale-75 pointer-events-none' 
                  : 'opacity-100 scale-100 hover:scale-105 hover:opacity-90'
                }
              `}
              onClick={onSidebarToggle}
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
      </div>
    </header>
  );
}
