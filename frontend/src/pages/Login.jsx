import React, { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../App"
import apiClient from "../api/client"
import { LogIn, Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, UserCheck, GraduationCap, Sparkles } from "lucide-react"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || "/"

  const [formData, setFormData] = useState({ email: "", password: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await apiClient.post("/auth/login", formData)
      if (res.data?.success) {
        const { user, tokens } = res.data.data
        login(user, tokens.access_token, tokens.refresh_token)

        if (user.role === "staff") {
          navigate("/staff")
        } else if (user.role === "admin") {
          navigate("/admin")
        } else {
          navigate("/services", { replace: true })
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (email, pass) => {
    setFormData({ email, password: pass })
  }

  return (
    <div className="max-w-md mx-auto pt-6 pb-16 animate-fade-in">
      <div className="glass-panel p-8 sm:p-9 rounded-3xl border border-rose-200/80 shadow-nexus-card bg-white">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-200 shadow-sm">
            <LogIn className="w-6 h-6 text-rose-600" />
          </div>
          <h1 className="text-2xl font-black text-nexus-text tracking-tight">Sign In to SmartQueue</h1>
          <p className="text-xs text-nexus-muted mt-1 font-medium">Manage, operate, or check your queue in real time</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-nexus-text mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-nexus-muted absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@institution.edu"
                className="w-full pl-10 pr-4 py-3 bg-rose-50/40 border border-rose-200/80 rounded-xl text-nexus-text font-medium placeholder-nexus-muted/60 text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-nexus-text mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-nexus-muted absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-rose-50/40 border border-rose-200/80 rounded-xl text-nexus-text font-medium placeholder-nexus-muted/60 text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Sign In to Station</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Buttons */}
        <div className="mt-8 pt-6 border-t border-rose-100">
          <div className="text-[10px] font-bold text-nexus-muted uppercase tracking-wider mb-2.5 text-center">
            One-Click Demo Evaluator Credentials
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemo("student@apex.edu", "studentpassword123")}
              className="p-2.5 text-xs font-semibold rounded-xl bg-white hover:bg-rose-50/60 border border-rose-200 text-nexus-text flex flex-col items-center gap-1 transition-colors cursor-pointer hover:border-rose-400"
            >
              <GraduationCap className="w-4 h-4 text-rose-600" />
              <span className="text-[11px] font-bold text-nexus-text">Student</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("staff@apex.edu", "staffpassword123")}
              className="p-2.5 text-xs font-semibold rounded-xl bg-white hover:bg-rose-50/60 border border-rose-200 text-nexus-text flex flex-col items-center gap-1 transition-colors cursor-pointer hover:border-orange-400"
            >
              <UserCheck className="w-4 h-4 text-orange-600" />
              <span className="text-[11px] font-bold text-nexus-text">Doctor/Staff</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("admin@apex.edu", "adminpassword123")}
              className="p-2.5 text-xs font-semibold rounded-xl bg-white hover:bg-rose-50/60 border border-rose-200 text-nexus-text flex flex-col items-center gap-1 transition-colors cursor-pointer hover:border-rose-400"
            >
              <ShieldCheck className="w-4 h-4 text-rose-700" />
              <span className="text-[11px] font-bold text-nexus-text">Admin</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-nexus-muted mt-6 font-medium">
          Don't have an account?{" "}
          <Link to="/register" className="text-rose-600 hover:text-orange-600 font-bold underline underline-offset-4">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
