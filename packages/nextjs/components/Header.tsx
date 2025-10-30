"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
// import { ThemeController } from "~~/components/ThemeController";
import { RainbowKitCustomConnectButton } from "~~/components/helper";
import { useOutsideClick } from "~~/hooks/helper";

type NavLink = {
  href: string;
  label: string;
  showWhen: "always" | "connected";
  scrollTo?: string;
};

/**
 * Site header
 */
export const Header = () => {
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  const { address } = useAccount();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useOutsideClick(burgerMenuRef, () => {
    setIsOpen(false);
  });

  // Handle scroll to section on page load (for hash navigation)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && pathname === "/") {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 200);
    }
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname?.startsWith(path);
  };

  const navLinks: NavLink[] = [
    { href: "/", label: "Browse Creators", showWhen: "always" },
    { href: "/dashboard", label: "Dashboard", showWhen: "always" },
    { href: "/subscriptions", label: "My Subscriptions", showWhen: "always" },
    { href: `/creator/${address}`, label: "My Profile", showWhen: "connected" },
  ];

  const handleLinkClick = (scrollTo?: string) => {
    setIsOpen(false);

    // Handle smooth scroll to section if specified
    if (scrollTo && pathname === "/") {
      setTimeout(() => {
        const element = document.getElementById(scrollTo);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string, scrollTo?: string) => {
    if (scrollTo) {
      e.preventDefault();
      setIsOpen(false);

      if (pathname === "/") {
        // Already on home page, just scroll
        const element = document.getElementById(scrollTo);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else {
        // Navigate to home page using Next.js router, then scroll will happen via useEffect
        router.push(`/#${scrollTo}`);
      }
    } else {
      handleLinkClick();
    }
  };

  return (
    <div className="sticky lg:static top-0 navbar min-h-16 shrink-0 justify-between z-20 px-4 sm:px-6 lg:px-8 bg-base-100 shadow-md border-b border-base-200">
      {/* Logo */}
      <div className="navbar-start">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
          <span className="font-bold text-lg hidden sm:inline-block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Cryptletter
          </span>
        </Link>
      </div>

      {/* Desktop Navigation */}
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1 gap-1">
          {navLinks.map(
            link =>
              (link.showWhen === "always" || (link.showWhen === "connected" && address)) && (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={e => handleNavigation(e, link.href, link.scrollTo)}
                    className={`rounded-lg transition-all ${
                      isActive(link.href) ? "bg-primary text-primary-content font-semibold" : "hover:bg-base-200"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ),
          )}
        </ul>
      </div>

      {/* Right Section */}
      <div className="navbar-end flex items-center gap-2">
        {/* Desktop Controls - All aligned horizontally */}
        <div className="hidden lg:flex items-center gap-2">
          {/* <ThemeController /> */}
          <RainbowKitCustomConnectButton />
        </div>

        {/* Mobile menu */}
        <div className="lg:hidden relative" ref={burgerMenuRef}>
          <button
            className="btn btn-ghost btn-square"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Mobile Menu Dropdown */}
          {isOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsOpen(false)} />

              {/* Menu */}
              <div className="absolute right-0 mt-2 z-50 w-64 p-3 shadow-xl bg-base-100 rounded-box border border-base-200 max-h-[calc(100vh-5rem)] overflow-y-auto">
                <ul className="menu p-0 gap-1">
                  {/* Wallet Connect in Mobile Menu */}
                  <li className="mb-2">
                    <div className="p-2">
                      <RainbowKitCustomConnectButton />
                    </div>
                  </li>

                  <div className="divider my-1"></div>

                  {/* Navigation Links */}
                  {navLinks.map(
                    link =>
                      (link.showWhen === "always" || (link.showWhen === "connected" && address)) && (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={e => handleNavigation(e, link.href, link.scrollTo)}
                            className={`rounded-lg transition-all ${
                              isActive(link.href)
                                ? "bg-primary text-primary-content font-semibold"
                                : "hover:bg-base-200"
                            }`}
                          >
                            {link.label}
                          </Link>
                        </li>
                      ),
                  )}

                  <div className="divider my-1"></div>

                  {/* Theme Controller in Mobile Menu */}
                  {/* <li>
                    <div className="flex items-center justify-between p-2">
                      <span className="text-sm font-medium">Theme</span>
                      <ThemeController />
                    </div>
                  </li> */}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
