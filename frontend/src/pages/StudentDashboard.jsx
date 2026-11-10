import React, { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../App"
import apiClient from "../api/client"
import TokenCard from "../components/TokenCard"
import { useQueueSocket } from "../hooks/useQueueSocket"
import {
  Ticket,
  Clock,
  ArrowRight,
  History,
  Layers,
  Sparkles,
  RefreshCw,
  Building2,
  Landmark,
  GraduationCap,
  Activity,
} from "lucide-react"

export default function StudentDashboard() {
  const { user, isAuthenticated } = useAuth()
  const [activeToken, setActiveToken] = useState(null)
  const [services, setServices] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch available queues/services
      const queuesRes = await apiClient.get("/queue/public/list")
      if (queuesRes.data?.success) {
        setServices(queuesRes.data.data.queues || [])
      }

      // 2. If authenticated, fetch active token and history
      if (isAuthenticated) {
        const tokenRes = await apiClient.get("/student/active-token")
        if (tokenRes.data?.success) {
          setActiveToken(tokenRes.data.data.active_token)
        }

        const historyRes = await apiClient.get("/student/history?limit=5")
        if (historyRes.data?.success) {
          setHistory(historyRes.data.data.tokens || [])
        }
      }
    } catch (e) {
      console.warn("Error loading student dashboard data:", e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle live socket updates
  const handleSocketEvent = useCallback(
    (event, data) => {
      if (event === "token:called" || event === "token:completed" || event === "token:cancelled" || event === "queue:updated") {
        loadData()
      }
    },
    [loadData]
  )

  useQueueSocket(activeToken?.queue_id, handleSocketEvent)

  const handleCancelToken = async (tokenId) => {
    try {
      await apiClient.post(`/student/token/${tokenId}/cancel`)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error || "Failed to cancel token")
    }
  }

  const getDomainIcon = (prefix = "") => {
    const p = prefix.toUpperCase()
    if (p.includes("HOSP")) return Building2
    if (p.includes("BANK")) return Landmark
    return GraduationCap
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-nexus-muted">
        <div className="w-8 h-8 border-3 border-nexus-emerald border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold tracking-widest uppercase text-nexus-mint">
          Loading Active Service Desks...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Hero Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-nexus-border relative overflow-hidden bg-gradient-to-r from-nexus-surface via-nexus-sub to-nexus-bg">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            Digital Queue Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-nexus-text tracking-tight">
            {isAuthenticated ? `Welcome back, ${user?.full_name?.split(" ")[0]}!` : "Live Service Counters"}
          </h1>
          <p className="text-nexus-muted text-sm sm:text-base mt-2 leading-relaxed">
            Eliminate waiting lines. Choose a department below to join the digital queue, track your estimated wait time, and receive an automated 5-minute SMS alert.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true)
            loadData()
          }}
          disabled={refreshing}
          className="absolute right-6 top-6 p-2 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-nexus-muted hover:text-rose-600 transition-colors cursor-pointer"
          title="Refresh services"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-rose-600" : ""}`} />
        </button>
      </div>

      {/* Active Token Hero Section */}
      {activeToken && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-nexus-text flex items-center gap-2 tracking-tight">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
              Your Active Service Token
            </h2>
            <span className="text-xs text-orange-600 font-mono font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              Real-time Socket Connected
            </span>
          </div>

          <div className="max-w-xl">
            <TokenCard token={activeToken} onCancel={handleCancelToken} showQR={true} />
          </div>
        </div>
      )}

      {/* Available Queue Services Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-nexus-text tracking-tight">Available Counters & Queues</h2>
            <p className="text-xs text-nexus-muted">Select an institutional service counter below to receive a digital token</p>
          </div>
        </div>

        {services.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center border border-rose-200 text-nexus-muted bg-white">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-rose-500" />
            <p className="font-bold text-nexus-text">No active queues found</p>
            <p className="text-xs mt-1">Please check back during organization operating hours.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((q) => {
              const isPaused = q.status === "paused"
              const isClosed = q.status === "closed"
              const IconComp = getDomainIcon(q.prefix || q.code)

              return (
                <div
                  key={q.id}
                  className="glass-panel glass-panel-hover p-6 rounded-2xl border border-rose-200/80 bg-white flex flex-col justify-between group shadow-sm hover:border-orange-300"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-mono font-bold uppercase">
                          {q.prefix || q.code}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          isPaused
                            ? "bg-amber-50 text-amber-600 border border-amber-200"
                            : isClosed
                            ? "bg-rose-50 text-rose-600 border border-rose-200"
                            : "bg-rose-50 text-rose-600 border border-rose-200"
                        }`}
                      >
                        {isPaused ? "Paused" : isClosed ? "Closed" : "Open"}
                      </span>
                    </div>

                    <h3 className="font-bold text-nexus-text text-base tracking-tight mb-1 group-hover:text-rose-600 transition-colors">
                      {q.name}
                    </h3>

                    <p className="text-xs text-nexus-muted flex items-center gap-1.5 mb-5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      ~{q.estimated_service_time || 5} min avg service duration
                    </p>
                  </div>

                  <Link
                    to={`/join/${q.id}`}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      isClosed
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none"
                        : "bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white shadow-md hover:shadow-lg"
                    }`}
                  >
                    <span>{activeToken?.queue_id === q.id ? "View Your Active Token" : "Get Queue Token"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Token History Section */}
      {isAuthenticated && history.length > 0 && (
        <div className="pt-6 border-t border-rose-200/80">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-orange-500" />
            <h2 className="text-lg font-bold text-nexus-text tracking-tight">Recent Token Activity</h2>
          </div>

          <div className="glass-panel rounded-2xl border border-rose-200/80 bg-white overflow-hidden shadow-sm">
            <div className="divide-y divide-rose-100">
              {history.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-rose-50/40 transition-colors">
                  <div>
                    <div className="font-mono font-bold text-sm text-nexus-text">{t.token_number}</div>
                    <div className="text-xs text-nexus-muted mt-0.5">
                      {new Date(t.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                        t.status === "completed"
                          ? "bg-nexus-sub text-nexus-muted border border-nexus-border"
                          : t.status === "cancelled"
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : "bg-nexus-emerald/15 text-nexus-bright border border-nexus-emerald/30"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
