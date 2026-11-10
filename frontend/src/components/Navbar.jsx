import React, { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../App"
import {
  Layers,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  LogIn,
  UserPlus,
  Ticket,
  Menu,
  X,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from "lucide-react"

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 border-b border-nexus-border bg-white/90 backdrop-blur-xl transition-all shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo with Custom Minimal Queue Symbol */}
          <Link to="/" className="flex items-center gap-3 group">
            {/* Custom Queue-Inspired Symbol: Sunset Rose & Orange */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-orange-500 border border-rose-300 flex items-center justify-center shadow-emerald-sm transition-all duration-300 group-hover:scale-105">
              <div className="flex items-end gap-1 h-5">
                <span className="w-1.5 h-2.5 rounded-full bg-white transition-all group-hover:h-3" />
                <span className="w-1.5 h-4 rounded-full bg-white transition-all group-hover:h-5" />
                <span className="w-1.5 h-3 rounded-full bg-amber-200 transition-all group-hover:h-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-nexus-text">
                  SMART<span className="text-nexus-emerald ml-1">QUEUE</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] uppercase font-mono font-black tracking-widest bg-rose-50 text-rose-600 rounded border border-rose-200">
                  LIVE
                </span>
              </div>
              <p className="text-[10px] text-nexus-muted tracking-wide hidden sm:block font-medium">
                Intelligent Queue Management Platform
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                isActive("/")
                  ? "bg-rose-50 text-rose-600 border border-rose-200 font-extrabold"
                  : "text-nexus-muted hover:text-nexus-text hover:bg-nexus-sub"
              }`}
            >
              Overview
            </Link>

            <Link
              to="/services"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                isActive("/services")
                  ? "bg-rose-50 text-rose-600 border border-rose-200 font-extrabold"
                  : "text-nexus-muted hover:text-nexus-text hover:bg-nexus-sub"
              }`}
            >
              Live Services
            </Link>

            <Link
              to="/analytics"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                isActive("/analytics")
                  ? "bg-rose-50 text-rose-600 border border-rose-200 font-extrabold"
                  : "text-nexus-muted hover:text-nexus-text hover:bg-nexus-sub"
              }`}
            >
              Analytics
            </Link>

            {/* Staff Navigation Link */}
            {isAuthenticated && (user?.role === "staff" || user?.role === "admin") && (
              <Link
                to="/staff"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  isActive("/staff")
                    ? "bg-orange-50 text-orange-600 border border-orange-200"
                    : "text-nexus-muted hover:text-nexus-text hover:bg-nexus-sub"
                }`}
              >
                Staff Desk
              </Link>
            )}

            {/* Admin Navigation Link */}
            {isAuthenticated && user?.role === "admin" && (
              <Link
                to="/admin"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  isActive("/admin")
                    ? "bg-orange-50 text-orange-600 border border-orange-200"
                    : "text-nexus-muted hover:text-nexus-text hover:bg-nexus-sub"
                }`}
              >
                Admin Panel
              </Link>
            )}
          </div>

          {/* User Profile / Auth Actions & Primary Token Button */}
          <div className="hidden md:flex items-center gap-3">
            {/* Primary CTA: "Get Your Token" */}
            <Link
              to="/join"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-xs tracking-wide shadow-emerald-sm hover:shadow-emerald-md transition-all duration-200 hover:-translate-y-0.5 group cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-white" />
              <span>Get Your Token</span>
              <ArrowRight className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-nexus-border">
                <div className="text-right">
                  <div className="text-xs font-bold text-nexus-text leading-tight">
                    {user?.full_name}
                  </div>
                  <div className="text-[10px] text-rose-600 font-bold capitalize flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    {user?.role}
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 text-nexus-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-nexus-border">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-bold text-nexus-text hover:text-rose-600 hover:bg-nexus-sub rounded-xl transition-colors"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-nexus-text hover:bg-nexus-sub border border-nexus-border cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-nexus-border space-y-2 animate-fade-in bg-white p-3 rounded-2xl shadow-lg mt-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-xs font-bold text-nexus-text hover:bg-nexus-sub"
            >
              Overview
            </Link>
            <Link
              to="/services"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-xs font-bold text-nexus-text hover:bg-nexus-sub"
            >
              Live Services
            </Link>
            <Link
              to="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-xs font-bold text-nexus-text hover:bg-nexus-sub"
            >
              Analytics
            </Link>

            <Link
              to="/join"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-orange-500 text-center"
            >
              Get Your Token
            </Link>

            {isAuthenticated && (user?.role === "staff" || user?.role === "admin") && (
              <Link
                to="/staff"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-bold text-orange-600 hover:bg-orange-50"
              >
                Staff Desk
              </Link>
            )}

            {isAuthenticated && user?.role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-bold text-orange-600 hover:bg-orange-50"
              >
                Admin Panel
              </Link>
            )}

            {isAuthenticated ? (
              <div className="pt-2 border-t border-nexus-border flex items-center justify-between px-3">
                <span className="text-xs font-bold text-nexus-text">{user?.full_name}</span>
                <button
                  onClick={() => {
                    logout()
                    setMobileMenuOpen(false)
                  }}
                  className="text-xs font-bold text-rose-600 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-nexus-border flex items-center gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-bold text-nexus-text bg-nexus-sub rounded-xl"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
