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
  LogOut,
  Wrench,
  ChevronDown
} from "lucide-react";

import type { SidebarState } from '@/hooks/useSidebarState';

interface SidebarProps {
  sidebarState: SidebarState;
  onClose: () => void;
  onToggle: () => void;
}

// Component for rendering navigation items based on sidebar state
const NavItem = ({ item, isActive, isThin, handleNavClick }: { item: any, isActive: boolean, isThin: boolean, handleNavClick: () => void }) => {
  const Icon = item.icon;
  
  if (isThin) {
    return (
      <Link
        href={item.href}
        onClick={handleNavClick}
        className={`
          group flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 relative
          ${isActive 
            ? 'bg-white/10 text-white border border-white/20' 
            : 'text-nexa-muted hover:text-white hover:bg-white/5'
          }
        `}
        title={item.label}
      >
        <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-nexa-muted group-hover:text-white'}`} />
      </Link>
    );
  }
              
  return (
    <Link
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
};

export function Sidebar({ sidebarState, onClose, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);

  const isCollapsed = sidebarState === 'collapsed';
  const isThin = sidebarState === 'thin';
  const isExpanded = sidebarState === 'expanded';
  const isVisible = sidebarState !== 'collapsed';

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimeout) {
        clearTimeout(dropdownTimeout);
      }
    };
  }, [dropdownTimeout]);

  // Dropdown hover management with 1.5s delay
  const handleDropdownEnter = () => {
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout);
      setDropdownTimeout(null);
    }
    setShowToolsDropdown(true);
  };

  const handleDropdownLeave = () => {
    const timeout = setTimeout(() => {
      setShowToolsDropdown(false);
    }, 300); // 300ms delay - matches quick action buttons
    setDropdownTimeout(timeout);
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
        window.location.href = "/auth/login";
      } else {
        console.error("Logout failed:", data.message);
      }
    } catch (error: unknown) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when navigating
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Dashboard item (isolated)
  const dashboardItem = {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Main dashboard view"
  };

  // Main Tools section items
  const mainNavItems = [
    {
      label: "Grid",
      href: "/grid",
      icon: Grid3X3,
      description: "Session overview and management"
    }
  ];

  // Tools dropdown items
  const toolsItems = [
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
    if (!pathname) return false;
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const isAnyToolActive = () => {
    return toolsItems.some(item => isActivePath(item.href));
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isVisible && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 h-full bg-black border-r border-nexa-border z-50 
          transform transition-all duration-300 ease-in-out
          ${isVisible ? 'translate-x-0' : '-translate-x-full'}
          ${isExpanded ? 'w-80' : isThin ? 'w-16' : 'w-0'}
        `}
      >
        {/* Sidebar Header */}
        {isVisible && (
          <div className={`flex items-center h-16 border-b border-nexa-border ${isThin ? 'justify-center px-2' : 'justify-between px-6'}`}>
            {isThin ? (
              <div 
                className="flex items-center justify-center w-12 h-12 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                onClick={onToggle}
                title="Expand sidebar"
              >
                <img
                  src="/images/nexanonameicon.png?v=1"
                  alt="NEXA"
                  className="w-8 h-8 object-contain"
                />
              </div>
            ) : (
              <>
                <div 
                  className="flex-1 flex items-center justify-center gap-3 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                  onClick={onToggle}
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
                  className="text-nexa-muted hover:text-white transition-colors duration-200 lg:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        )}
        {/* Sidebar Content */}
        <div className="flex flex-col h-[calc(100%-4rem)] overflow-y-auto">
          
          {/* Dashboard - Isolated */}
          <div className={isThin ? "p-2" : "p-6"}>
            {!isThin && <div className="mb-4" />} {/* Spacing for expanded mode */}
            <nav className={isThin ? "flex flex-col items-center space-y-2" : ""}>
              <NavItem item={dashboardItem} isActive={isActivePath(dashboardItem.href)} isThin={isThin} handleNavClick={handleNavClick} />
            </nav>
          </div>

          {/* Divider */}
          {!isThin && (
          <div className="px-6">
            <div className="h-px bg-gradient-to-r from-transparent via-nexa-border to-transparent" />
          </div>
          )}

          {/* Main Tools Navigation */}
          <div className={isThin ? "p-2" : "p-6"}>
            {!isThin && (
            <h3 className="text-xs font-semibold text-nexa-muted uppercase tracking-wide mb-4">
                Main Tools
            </h3>
            )}
            <nav className={isThin ? "flex flex-col items-center space-y-2" : "space-y-2"}>
              {/* Thin state divider before Grid */}
              {isThin && (
                <div className="w-8 h-px bg-gradient-to-r from-transparent via-nexa-border to-transparent" />
              )}

              {/* Grid */}
              {mainNavItems.map((item) => (
                <NavItem key={item.href} item={item} isActive={isActivePath(item.href)} isThin={isThin} handleNavClick={handleNavClick} />
              ))}

              {/* Tools with Dropdown */}
              <div className="relative">
                {isThin ? (
                  <div
                    className={`
                      group flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 cursor-pointer relative
                      ${isAnyToolActive() 
                        ? 'bg-white/10 text-white border border-white/20' 
                        : 'text-nexa-muted hover:text-white hover:bg-white/5'
                      }
                    `}
                    onMouseEnter={handleDropdownEnter}
                    onMouseLeave={handleDropdownLeave}
                    title="Tools"
                  >
                    <Wrench className={`h-5 w-5 ${isAnyToolActive() ? 'text-white' : 'text-nexa-muted group-hover:text-white'}`} />
                  </div>
                ) : (
                  <div
                    className={`
                      group flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 cursor-pointer
                      ${isAnyToolActive() 
                        ? 'bg-white/10 text-white border border-white/20' 
                        : 'text-nexa-muted hover:text-white hover:bg-white/5'
                      }
                    `}
                    onMouseEnter={handleDropdownEnter}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <Wrench className={`h-5 w-5 flex-shrink-0 ${isAnyToolActive() ? 'text-white' : 'text-nexa-muted group-hover:text-white'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Tools</div>
                      <div className={`text-xs ${isAnyToolActive() ? 'text-white/70' : 'text-nexa-muted/70'} line-clamp-1`}>
                        Development tools and workflows
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showToolsDropdown ? 'rotate-180' : ''} ${isAnyToolActive() ? 'text-white/50' : 'text-nexa-muted/50 group-hover:text-white/50'}`} />
                  </div>
                )}

                {/* GitHub-style Dropdown - FIXED: Now renders outside sidebar */}
                {showToolsDropdown && (
                  <div 
                    className={`
                      fixed bg-black border border-nexa-border rounded-lg shadow-xl z-[60] py-2 w-64
                      ${isThin ? 'left-20 top-[50%] transform -translate-y-1/2' : 'left-80 top-[50%] transform -translate-y-1/2'}
                    `}
                    style={{
                      left: isThin ? '4.5rem' : '20rem',
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                    onMouseEnter={handleDropdownEnter}
                    onMouseLeave={handleDropdownLeave}
                  >
                    {toolsItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          if (dropdownTimeout) {
                            clearTimeout(dropdownTimeout);
                            setDropdownTimeout(null);
                          }
                          setShowToolsDropdown(false);
                          handleNavClick();
                        }}
                        className={`
                          group flex items-center gap-3 px-3 py-2 mx-2 rounded-md transition-all duration-200
                          ${isActivePath(item.href) 
                            ? 'bg-white/10 text-white border border-white/20' 
                            : 'text-nexa-muted hover:text-white hover:bg-white/5'
                          }
                        `}
                      >
                        <item.icon className={`h-4 w-4 flex-shrink-0 ${isActivePath(item.href) ? 'text-white' : 'text-nexa-muted group-hover:text-white'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{item.label}</div>
                          <div className={`text-xs ${isActivePath(item.href) ? 'text-white/70' : 'text-nexa-muted/70 group-hover:text-nexa-muted/90'} line-clamp-1`}>
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Thin state divider after Tools */}
              {isThin && (
                <div className="w-8 h-px bg-gradient-to-r from-transparent via-nexa-border to-transparent" />
              )}
            </nav>
          </div>

          {/* Divider */}
          {!isThin && (
            <div className="px-6">
              <div className="h-px bg-gradient-to-r from-transparent via-nexa-border to-transparent" />
            </div>
          )}

          {/* Secondary Navigation */}
          <div className={isThin ? "p-2" : "p-6"}>
            {!isThin && (
              <h3 className="text-xs font-semibold text-nexa-muted uppercase tracking-wide mb-4">
                General
              </h3>
            )}
            <nav className={isThin ? "flex flex-col items-center space-y-2" : "space-y-2"}>
              {secondaryNavItems.map((item) => (
                <NavItem key={item.href} item={item} isActive={isActivePath(item.href)} isThin={isThin} handleNavClick={handleNavClick} />
              ))}
            </nav>
          </div>

          {/* Logout Button */}
          <div className={`mt-auto border-t border-nexa-border ${isThin ? "p-2" : "p-6"}`}>
            {isThin ? (
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-12 h-12 group flex items-center justify-center rounded-lg transition-all duration-200 text-nexa-muted hover:text-white hover:bg-white/5"
                title={isLoggingOut ? "Logging out..." : "Logout"}
              >
                <LogOut className="h-5 w-5 text-nexa-muted group-hover:text-white" />
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
