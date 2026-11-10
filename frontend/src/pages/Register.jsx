import React, { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../App"
import apiClient from "../api/client"
import { UserPlus, Mail, Lock, User, AlertCircle, ArrowRight, Phone, Sparkles } from "lucide-react"

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "student",
    organization_id: "",
    phone_number: "",
    student_id: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const payload = { ...formData }
      if (!payload.organization_id) delete payload.organization_id
      if (!payload.phone_number) delete payload.phone_number
      if (!payload.student_id) delete payload.student_id

      const res = await apiClient.post("/auth/register", payload)
      if (res.data?.success) {
        const { user, tokens } = res.data.data
        login(user, tokens.access_token, tokens.refresh_token)
        navigate("/services")
      }
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please check your details.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto pt-6 pb-16 animate-fade-in">
      <div className="glass-panel p-8 sm:p-9 rounded-3xl border border-rose-200/80 shadow-nexus-card bg-white">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-200 shadow-sm">
            <UserPlus className="w-6 h-6 text-rose-600" />
          </div>
          <h1 className="text-2xl font-black text-nexus-text tracking-tight">Create SmartQueue Account</h1>
          <p className="text-xs text-nexus-muted mt-1 font-medium">Join institutional queues and receive live turn notifications</p>
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
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-nexus-muted absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-3 bg-rose-50/40 border border-rose-200/80 rounded-xl text-nexus-text font-medium placeholder-nexus-muted/60 text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

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
              Password (min 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-nexus-muted absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-rose-50/40 border border-rose-200/80 rounded-xl text-nexus-text font-medium placeholder-nexus-muted/60 text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-nexus-text mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>Mobile Number (5-Min SMS Alert)</span>
              <span className="text-[9px] text-rose-600 font-extrabold uppercase bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                SMS Active
              </span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-nexus-muted absolute left-3.5 top-3.5" />
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full pl-10 pr-4 py-3 bg-rose-50/40 border border-rose-200/80 rounded-xl text-nexus-text font-medium placeholder-nexus-muted/60 text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
              />
            </div>
            <p className="text-[11px] text-nexus-muted mt-1 leading-relaxed">
              📱 Receive an SMS alert 5 minutes before your token arrives at the counter.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-nexus-text mb-1.5 uppercase tracking-wider">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-3 bg-rose-50/40 border border-rose-200/80 rounded-xl text-nexus-text text-xs font-semibold focus:outline-none focus:border-rose-500 focus:bg-white"
              >
                <option value="student">Student / Visitor</option>
                <option value="staff">Staff Member</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-nexus-text mb-1.5 uppercase tracking-wider">
                Student ID (Optional)
              </label>
              <input
                type="text"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                placeholder="STU-2026-042"
                className="w-full px-3 py-3 bg-rose-50/40 border border-rose-200/80 rounded-xl text-nexus-text placeholder-nexus-muted/60 text-xs font-medium focus:outline-none focus:border-rose-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 px-4 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-nexus-muted mt-6 font-medium">
          Already have an account?{" "}
          <Link to="/login" className="text-rose-600 hover:text-orange-600 font-bold underline underline-offset-4">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
