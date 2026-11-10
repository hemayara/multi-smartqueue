import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import apiClient from "../api/client"
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Building2,
  Sparkles,
} from "lucide-react"

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [filterRange, setFilterRange] = useState("today")

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const orgRes = await apiClient.get("/admin/organizations")
        const orgId = orgRes.data?.data?.organizations?.[0]?.id
        if (orgId) {
          const repRes = await apiClient.get(`/admin/reports?organization_id=${orgId}`)
          if (repRes.data?.success) {
            setReport(repRes.data.data.summary)
          }
        }
      } catch (err) {
        console.warn("Analytics fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  // Hourly distribution sample data
  const hourlyData = [
    { hour: "09:00", tokens: 28, load: "normal" },
    { hour: "10:00", tokens: 64, load: "peak" },
    { hour: "11:00", tokens: 78, load: "peak" },
    { hour: "12:00", tokens: 45, load: "elevated" },
    { hour: "13:00", tokens: 19, load: "lunch" },
    { hour: "14:00", tokens: 52, load: "elevated" },
    { hour: "15:00", tokens: 41, load: "normal" },
    { hour: "16:00", tokens: 22, load: "normal" },
  ]

  const maxTokens = Math.max(...hourlyData.map((d) => d.tokens))

  const serviceBreakdown = [
    { name: "Hospital OPD & Doctor Consultation", code: "HOSP", count: 142, avgWait: "8 min", status: "Optimal" },
    { name: "Bank Cash & Account Services", code: "BANK", count: 96, avgWait: "5 min", status: "Optimal" },
    { name: "School & College Fee & Admission", code: "EDU", count: 178, avgWait: "6 min", status: "Optimal" },
  ]

  const handleExport = () => {
    alert("Exporting queue governance ledger as CSV report...")
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            Operational Intelligence & Telemetry
          </div>
          <h1 className="text-3xl font-extrabold text-nexus-text tracking-tight">Queue Analytics & Performance</h1>
          <p className="text-xs text-nexus-muted mt-1 font-medium">
            Real-time insights across waiting durations, counter throughput, and peak-hour load balancing
          </p>
        </div>

        {/* Filter and Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white p-1 rounded-xl border border-rose-200 shadow-sm">
            <button
              onClick={() => setFilterRange("today")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterRange === "today" ? "bg-rose-600 text-white shadow-sm" : "text-nexus-muted hover:text-rose-600"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilterRange("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterRange === "week" ? "bg-rose-600 text-white shadow-sm" : "text-nexus-muted hover:text-rose-600"
              }`}
            >
              This Week
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-600 border border-rose-200 rounded-xl transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-orange-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white shadow-sm">
          <div className="text-[11px] text-nexus-muted font-medium flex items-center justify-between">
            <span>Total Issued</span>
            <Users className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-nexus-text mt-1">
            {report?.total_tokens || 416}
          </div>
          <div className="text-[10px] text-rose-600 flex items-center gap-0.5 mt-1 font-bold">
            <ArrowUpRight className="w-3 h-3" />
            <span>+14.2% today</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white shadow-sm">
          <div className="text-[11px] text-rose-700 font-medium flex items-center justify-between">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {report?.completed || 398}
          </div>
          <div className="text-[10px] text-nexus-muted mt-1 font-medium">
            95.7% completion
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white shadow-sm">
          <div className="text-[11px] text-nexus-muted font-medium flex items-center justify-between">
            <span>Waiting Now</span>
            <Clock className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-orange-600 mt-1">
            {report?.waiting || 12}
          </div>
          <div className="text-[10px] text-nexus-muted mt-1 font-medium">
            Active in halls
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white shadow-sm">
          <div className="text-[11px] text-orange-700 font-medium flex items-center justify-between">
            <span>At Counters</span>
            <Layers className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-orange-600 mt-1">
            {report?.serving || 6}
          </div>
          <div className="text-[10px] text-nexus-muted mt-1 font-medium">
            Being served
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white shadow-sm">
          <div className="text-[11px] text-rose-600 font-medium flex items-center justify-between">
            <span>Cancelled / Skip</span>
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {report?.cancelled || 6}
          </div>
          <div className="text-[10px] text-nexus-muted mt-1 font-medium">
            1.4% no-shows
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white shadow-sm">
          <div className="text-[11px] text-nexus-muted font-medium flex items-center justify-between">
            <span>Avg Wait Duration</span>
            <Clock className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-nexus-text mt-1">
            6.2 <span className="text-xs font-normal text-nexus-muted">min</span>
          </div>
          <div className="text-[10px] text-rose-600 flex items-center gap-0.5 mt-1 font-bold">
            <ArrowDownRight className="w-3 h-3" />
            <span>-72% vs manual</span>
          </div>
        </div>
      </div>

      {/* Hourly Congestion Chart */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-rose-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-nexus-text tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-600" />
              Peak Hour Traffic & Hourly Distribution
            </h2>
            <p className="text-xs text-nexus-muted mt-0.5 font-medium">
              Identifies rush hours to automatically balance counter staff availability
            </p>
          </div>
          <div className="text-xs font-bold text-orange-700 bg-orange-50 px-3 py-1 rounded-xl border border-orange-200">
            Peak Window: 10:00 AM - 11:30 AM
          </div>
        </div>

        {/* CSS Bar Chart */}
        <div className="pt-6 pb-2">
          <div className="grid grid-cols-8 gap-3 items-end h-48 sm:h-56 border-b border-rose-100 pb-3">
            {hourlyData.map((d) => {
              const heightPercent = Math.round((d.tokens / maxTokens) * 100)
              const isPeak = d.load === "peak"

              return (
                <div key={d.hour} className="flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-mono font-bold text-nexus-muted group-hover:text-rose-600 transition-colors">
                    {d.tokens}
                  </div>
                  <div className="w-full max-w-[42px] bg-rose-50/70 rounded-lg overflow-hidden p-0.5 flex flex-col justify-end h-full">
                    <div
                      className={`w-full rounded-md transition-all duration-500 ${
                        isPeak
                          ? "bg-gradient-to-t from-rose-600 to-orange-500 shadow-sm"
                          : "bg-rose-200 group-hover:bg-rose-400"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono font-medium text-nexus-muted mt-1">{d.hour}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Multi-Industry Breakdown Table */}
      <div className="glass-panel p-6 rounded-2xl border border-rose-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-nexus-text tracking-tight">Service Desk Performance Breakdown</h2>
            <p className="text-xs text-nexus-muted font-medium">Throughput comparison across active hospital, bank, and college queues</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-nexus-muted">
            <thead className="bg-rose-50/60 text-nexus-text uppercase font-bold text-[10px] tracking-wider border-b border-rose-200">
              <tr>
                <th className="py-3 px-4">Service Domain</th>
                <th className="py-3 px-4">Prefix</th>
                <th className="py-3 px-4">Tokens Processed</th>
                <th className="py-3 px-4">Avg Wait Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100">
              {serviceBreakdown.map((s) => (
                <tr key={s.code} className="hover:bg-rose-50/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-nexus-text flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-rose-600" />
                    <span>{s.name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-rose-600 font-bold">{s.code}</td>
                  <td className="py-3 px-4 text-nexus-text font-bold">{s.count}</td>
                  <td className="py-3 px-4 font-mono text-orange-600 font-bold">{s.avgWait}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-200">
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to="/services"
                      className="text-xs font-bold text-rose-600 hover:text-orange-600 underline underline-offset-2"
                    >
                      View Live Desk
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
