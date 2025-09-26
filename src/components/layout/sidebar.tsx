"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Grid3X3,
  Layers,
  Palette,
  Lightbulb,
  FileText,
  Calculator,
  X,
  ChevronRight,
  Home,
  Settings,
  Users,
  HelpCircle,
  LogOut
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server to avoid hydration mismatch
  if (!mounted) return null;

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

  const mainNavItems = [
    {
      label: "Grid",
      href: "/grid",
      icon: Grid3X3,
      description: "Session overview and management"
    },
    {
      label: "Structuring", 
      href: "/structuring",
      icon: Layers,
      description: "Analyze and structure problems"
    },
    {
      label: "Visuals",
      href: "/visuals", 
      icon: Palette,
      description: "Create visual diagrams and sketches"
    },
    {
      label: "Solutioning",
      href: "/solutioning",
      icon: Lightbulb,
      description: "Develop and document solutions"
    },
    {
      label: "SoW",
      href: "/sow",
      icon: FileText,
      description: "Generate statements of work"
    },
    {
      label: "LoE", 
      href: "/loe",
      icon: Calculator,
      description: "Calculate level of effort estimates"
    }
  ];

  const secondaryNavItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: Home,
      description: "Main dashboard view"
    },
    {
      label: "Organizations",
      href: "/organizations", 
      icon: Users,
      description: "Manage your organizations"
    },
    {
      label: "Settings",
      href: "/profile",
      icon: Settings,
      description: "Account settings and preferences"
    }
  ];

  const isActivePath = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when navigating
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 h-full bg-black border-r border-nexa-border z-50 
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          w-80 lg:w-80
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-nexa-border">
          <div 
            className="flex-1 flex items-center justify-center gap-3 cursor-pointer hover:opacity-80 transition-opacity duration-200"
            onClick={onClose}
          >
            <img
              src="/images/nexanonameicon.png?v=1"
              alt="NEXA"
              className="w-8 h-8 object-contain"
            />
            <span className="text-white text-lg font-bold tracking-wide">
              NEXA
            </span>
          </div>
          <button
            onClick={onClose}
            className="absolute right-6 text-nexa-muted hover:text-white transition-colors duration-200 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex flex-col h-[calc(100%-4rem)] overflow-y-auto">
          
          {/* Main Navigation */}
          <div className="p-6">
            <h3 className="text-xs font-semibold text-nexa-muted uppercase tracking-wide mb-4">
              Main Tools
            </h3>
            <nav className="space-y-2">
              {mainNavItems.map((item) => {
                const isActive = isActivePath(item.href);
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`
                      group flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-white/10 text-white border border-white/20' 
                        : 'text-nexa-muted hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-nexa-muted group-hover:text-white'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className={`text-xs ${isActive ? 'text-white/70' : 'text-nexa-muted/70'} line-clamp-1`}>
                        {item.description}
                      </div>
                    </div>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-white/50" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Divider */}
          <div className="px-6">
            <div className="h-px bg-gradient-to-r from-transparent via-nexa-border to-transparent" />
          </div>

          {/* Secondary Navigation */}
          <div className="p-6">
            <h3 className="text-xs font-semibold text-nexa-muted uppercase tracking-wide mb-4">
              General
            </h3>
            <nav className="space-y-2">
              {secondaryNavItems.map((item) => {
                const isActive = isActivePath(item.href);
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`
                      group flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-white/10 text-white border border-white/20' 
                        : 'text-nexa-muted hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-nexa-muted group-hover:text-white'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className={`text-xs ${isActive ? 'text-white/70' : 'text-nexa-muted/70'} line-clamp-1`}>
                        {item.description}
                      </div>
                    </div>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-white/50" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Logout Button */}
          <div className="mt-auto p-6 border-t border-nexa-border">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full group flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-nexa-muted hover:text-white hover:bg-white/5 mb-4"
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-nexa-muted group-hover:text-white" />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium">
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </div>
                <div className="text-xs text-nexa-muted/70 line-clamp-1">
                  Sign out of your account
                </div>
              </div>
            </button>
            
            {/* Divisor */}
            <div className="my-4">
              <div className="h-px bg-gradient-to-r from-transparent via-nexa-border to-transparent" />
            </div>
            
            <div className="text-xs text-nexa-muted/60 text-center">
              <div>NEXA Studio</div>
              <div className="mt-1">v0.1.0</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
