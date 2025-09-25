"use client";

import Link from "next/link";

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
  // Determine what to display in the header - prioritize organization name
  const getDisplayName = () => {
    if (selectedOrganization?.organization?.name) {
      return selectedOrganization.organization.name;
    }
    return currentPage;
  };

  // Generate user initials for avatar
  const getUserInitials = () => {
    if (user?.fullName) {
      return user.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
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

          {/* Right: User info with avatar */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-white text-sm hidden sm:block">
                  {user.fullName || user.email}
                </span>
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black text-sm font-medium">
                  {getUserInitials()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
