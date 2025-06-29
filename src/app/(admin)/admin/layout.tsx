"use client";
import Link from 'next/link';
import { ReactNode, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useClerk, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !user) {
      toast.error('Please sign in to access the dashboard');
      router.push('/faculty-login');
    }
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-800"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-visible">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-[#800000] to-[#a52a2a] text-white flex flex-col justify-between shadow-lg">
        <div>
          {/* System Logo */}
          <div className="flex justify-center items-center px-6 pt-8 pb-2">
            <div className="bg-white rounded-full p-2 shadow-md">
              <Image src="/assets/sjsfi_logo.svg" alt="SJSFI Logo" width={56} height={56} />
            </div>
          </div>
          {/* System Title */}
          <div className="text-2xl font-bold px-6 pt-2 pb-4 text-center tracking-wide">LMS Portal</div>

          {/* Top separator */}
          <div className="border-b border-gray-200/60 mx-6 mt-2"></div>

          {/* Label */}
          <div className="px-6 py-2 text-sm font-medium text-white text-center">
            Admin Portal
          </div>

          {/* Bottom separator */}
          <div className="border-b border-gray-200/60 mx-6 mb-4"></div>

          {/* Nav links */}
          <nav className="px-4">
            <ul className="space-y-2">
              <li>
                <Link href="/admin/dashboard" className="block px-4 py-2 rounded-lg hover:bg-white/20 transition font-medium">
                  Dashboard
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Footer */}
        <div className="text-center text-sm mb-4 text-white/70">© 2025 LMS System</div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-gray-100">
        {/* Topbar */}
        <header className="absolute top-0 left-64 right-0 z-30 px-6 py-4 bg-white/80 shadow border-b border-gray-200 backdrop-blur-md flex justify-between items-center">
          <h1 className="text-xl font-semibold text-[#800000] tracking-wide">
            Welcome, {user.firstName || 'Admin'}!
          </h1>
          <div className="flex items-center space-x-4">
            <AdminUserDropdown />
          </div>
        </header>

        {/* Routed Page Content */}
        <main className="flex-1 overflow-y-auto pt-28 px-6 pb-6">{children}</main>
      </div>
    </div>
  );
}

function AdminUserDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { signOut } = useClerk();
  const { user } = useUser();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="bg-[#800000] text-white px-3 py-1 rounded-full text-sm font-medium focus:outline-none transition-transform duration-150 hover:scale-105 hover:shadow-lg active:scale-95"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        {user?.firstName || 'Admin User'}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200 animate-fade-in">
          <a
            href="#"
            className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition"
            onClick={() => setOpen(false)}
          >
            PROFILE
          </a>
          <a
            href="#"
            className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition"
            onClick={async () => {
              setOpen(false);
              await signOut();
              toast.success('Logged out successfully');
            }}
          >
            LOGOUT
          </a>
        </div>
      )}
    </div>
  );
}