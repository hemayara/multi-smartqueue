import React, { useState, useEffect, useCallback } from "react"
import { useAuth } from "../App"
import apiClient from "../api/client"
import { useQueueSocket } from "../hooks/useQueueSocket"
import {
  Layers,
  PhoneCall,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Users,
  Monitor,
  Clock,
  Sparkles,
  Volume2,
} from "lucide-react"

export default function StaffDashboard() {
  const { user } = useAuth()

  const [queues, setQueues] = useState([])
  const [counters, setCounters] = useState([])
  const [selectedQueueId, setSelectedQueueId] = useState("")
  const [selectedCounterId, setSelectedCounterId] = useState("")
  const [currentServingToken, setCurrentServingToken] = useState(null)
  const [waitingTokens, setWaitingTokens] = useState([])
  const [counterStatus, setCounterStatus] = useState("closed")
  const [queueStatus, setQueueStatus] = useState("active")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  // 1. Initial configuration load
  const loadInitialStaffConfig = useCallback(async () => {
    try {
      const [queuesRes, countersRes] = await Promise.all([
        apiClient.get("/staff/queues"),
        apiClient.get("/staff/counters"),
      ])

      const qList = queuesRes.data?.data?.queues || []
      const cList = countersRes.data?.data?.counters || []

      setQueues(qList)
      setCounters(cList)

      if (qList.length > 0 && !selectedQueueId) {
        setSelectedQueueId(qList[0].id)
        setQueueStatus(qList[0].status || "active")
      }

      const assignedId = countersRes.data?.data?.assigned_counter_id
      const defaultCounter = cList.find((c) => c.id === assignedId) || cList[0]
      if (defaultCounter && !selectedCounterId) {
        setSelectedCounterId(defaultCounter.id)
        setCounterStatus(defaultCounter.status || "closed")
      }
    } catch (err) {
      setError("Failed to load staff configurations.")
    } finally {
      setLoading(false)
    }
  }, [selectedQueueId, selectedCounterId])

  useEffect(() => {
    loadInitialStaffConfig()
  }, [loadInitialStaffConfig])

  // 2. Fetch live queue details when queue selection changes
  const fetchQueueData = useCallback(async () => {
    if (!selectedQueueId) return
    try {
      const res = await apiClient.get(`/queue/status/${selectedQueueId}`)
      if (res.data?.success) {
        const qData = res.data.data
        setQueueStatus(qData.status)
        setWaitingTokens(qData.next_tokens || [])
      }
    } catch (e) {
      console.warn("Queue status fetch error:", e)
    }
  }, [selectedQueueId])

  useEffect(() => {
    fetchQueueData()
  }, [fetchQueueData])

  // 3. Socket event handling
  const handleSocketEvent = useCallback(
    (event, data) => {
      fetchQueueData()
    },
    [fetchQueueData]
  )

  useQueueSocket(selectedQueueId, handleSocketEvent)

  // Actions
  const handleCallNext = async () => {
    if (!selectedQueueId || !selectedCounterId) {
      setError("Please ensure both a Counter and Service Queue are selected.")
      return
    }

    setActionLoading(true)
    setError(null)
    setMessage(null)

    try {
      const res = await apiClient.post("/staff/call-next", {
        queue_id: selectedQueueId,
        counter_id: selectedCounterId,
      })

      if (res.data?.success) {
        const called = res.data.data.token
        setCurrentServingToken(called)
        setCounterStatus("busy")
        setMessage(`🔔 Called Token: ${called.token_number} to Counter!`)
        fetchQueueData()
      }
    } catch (err) {
      setError(err.response?.data?.error || "No waiting tokens or error calling next token.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartService = async () => {
    if (!currentServingToken) return
    setActionLoading(true)
    setError(null)

    try {
      const res = await apiClient.post("/staff/start-service", {
        token_id: currentServingToken.id,
      })
      if (res.data?.success) {
        setCurrentServingToken(res.data.data.token)
        setMessage(`Serving Token: ${res.data.data.token.token_number}`)
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start service.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteService = async () => {
    if (!currentServingToken) return
    setActionLoading(true)
    setError(null)

    try {
      const res = await apiClient.post("/staff/complete-service", {
        token_id: currentServingToken.id,
        counter_id: selectedCounterId,
      })
      if (res.data?.success) {
        setMessage(`Completed Token: ${currentServingToken.token_number}`)
        setCurrentServingToken(null)
        setCounterStatus("open")
        fetchQueueData()
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to complete service.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSkipToken = async () => {
    if (!currentServingToken) return
    if (!window.confirm(`Mark ${currentServingToken.token_number} as No-Show / Skipped?`)) return

    setActionLoading(true)
    setError(null)

    try {
      const res = await apiClient.post("/staff/skip-token", {
        token_id: currentServingToken.id,
        counter_id: selectedCounterId,
        reason: "Student did not show up",
      })
      if (res.data?.success) {
        setMessage(`Skipped Token: ${currentServingToken.token_number}`)
        setCurrentServingToken(null)
        setCounterStatus("open")
        fetchQueueData()
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to skip token.")
    } finally {
      setActionLoading(false)
    }
  }

  const toggleCounterStatus = async (newStatus) => {
    if (!selectedCounterId) return
    try {
      const res = await apiClient.put("/staff/counter/status", {
        counter_id: selectedCounterId,
        status: newStatus,
      })
      if (res.data?.success) {
        setCounterStatus(newStatus)
      }
    } catch (err) {
      setError("Failed to update counter status.")
    }
  }

  const toggleQueuePause = async () => {
    if (!selectedQueueId) return
    const newStatus = queueStatus === "paused" ? "active" : "paused"
    try {
      const res = await apiClient.put(`/staff/queue/${selectedQueueId}/status`, {
        status: newStatus,
      })
      if (res.data?.success) {
        setQueueStatus(newStatus)
      }
    } catch (err) {
      setError("Failed to toggle queue pause.")
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-nexus-muted">
        <div className="w-8 h-8 border-3 border-nexus-emerald border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold tracking-widest uppercase text-nexus-mint">
          Initializing Operator Workstation...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-nexus-text tracking-tight">Staff Service Desk</h1>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 uppercase tracking-wider">
              Workstation Active
            </span>
          </div>
          <p className="text-xs text-nexus-muted mt-1 font-medium">
            Logged in operator: <span className="font-bold text-nexus-text">{user?.full_name}</span>
          </p>
        </div>

        {/* Counter and Queue Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-nexus-text uppercase mb-1">
              Active Counter
            </label>
            <select
              value={selectedCounterId}
              onChange={(e) => {
                setSelectedCounterId(e.target.value)
                const c = counters.find((item) => item.id === e.target.value)
                if (c) setCounterStatus(c.status)
              }}
              className="px-3.5 py-2 bg-white border border-rose-200 rounded-xl text-xs font-bold text-nexus-text focus:outline-none focus:border-rose-500 shadow-sm transition-colors"
            >
              {counters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-nexus-text uppercase mb-1">
              Serving Queue
            </label>
            <select
              value={selectedQueueId}
              onChange={(e) => setSelectedQueueId(e.target.value)}
              className="px-3.5 py-2 bg-white border border-rose-200 rounded-xl text-xs font-bold text-nexus-text focus:outline-none focus:border-rose-500 shadow-sm transition-colors"
            >
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between font-medium">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold ml-2">×</button>
        </div>
      )}
      {message && (
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs flex items-center justify-between font-medium">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-orange-600 hover:text-orange-800 font-bold ml-2">×</button>
        </div>
      )}

      {/* Main Workstation Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Call Next & Token Lifecycle (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Action Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-200/80 bg-white text-center relative overflow-hidden shadow-nexus-card">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-nexus-muted mb-2">
              Operator Station Control
            </div>

            {currentServingToken ? (
              <div className="py-4 space-y-4">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase bg-rose-50 text-rose-600 border border-rose-200">
                  Status: {currentServingToken.status}
                </div>
                <div className="text-5xl sm:text-6xl font-black token-digit tracking-tight bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 bg-clip-text text-transparent">
                  {currentServingToken.token_number}
                </div>
                {currentServingToken.guest_name && (
                  <div className="text-xs text-nexus-muted font-medium">
                    Visitor: <span className="text-nexus-text font-bold">{currentServingToken.guest_name}</span>
                  </div>
                )}

                {/* Token Actions: Start, Complete, Skip */}
                <div className="grid grid-cols-3 gap-3 mt-6 max-w-md mx-auto pt-2">
                  <button
                    onClick={handleStartService}
                    disabled={actionLoading || currentServingToken.status === "serving"}
                    className="py-3 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Start Serving</span>
                  </button>

                  <button
                    onClick={handleCompleteService}
                    disabled={actionLoading}
                    className="py-3 px-3 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 disabled:opacity-40 text-nexus-text font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4 text-rose-600" />
                    <span>Complete</span>
                  </button>

                  <button
                    onClick={handleSkipToken}
                    disabled={actionLoading}
                    className="py-3 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>No-Show</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 space-y-5">
                <p className="text-nexus-muted text-sm max-w-sm mx-auto font-medium">
                  Desk is ready and waiting. Press below to call the earliest waiting student or visitor to your counter.
                </p>

                <button
                  onClick={handleCallNext}
                  disabled={actionLoading || queueStatus === "paused"}
                  className="py-4 px-8 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 hover:opacity-95 text-white font-black text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PhoneCall className="w-6 h-6 animate-pulse" />
                  <span>CALL NEXT TOKEN</span>
                </button>
              </div>
            )}
          </div>

          {/* Up Next List */}
          <div className="glass-panel p-6 rounded-2xl border border-rose-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-nexus-text uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-600" />
                Waiting Tokens in Queue
              </h3>
              <span className="text-xs font-mono font-bold text-orange-600">
                {waitingTokens.length} waiting
              </span>
            </div>

            {waitingTokens.length === 0 ? (
              <div className="text-center py-6 text-nexus-muted text-xs font-medium">
                No students or visitors currently waiting in this queue.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {waitingTokens.map((tNum, idx) => (
                  <div
                    key={idx}
                    className="px-3.5 py-2 rounded-xl bg-rose-50/60 border border-rose-200 font-mono font-bold text-sm text-nexus-text flex items-center gap-2 shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    {tNum}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Counter Controls & Queue Policy */}
        <div className="space-y-6">
          {/* Counter Status Toggle Card */}
          <div className="glass-panel p-6 rounded-2xl border border-rose-200/80 bg-white shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-nexus-text mb-4">
              Counter Availability
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => toggleCounterStatus("open")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  counterStatus === "open"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-white text-nexus-muted hover:text-nexus-text border border-rose-200"
                }`}
              >
                Open
              </button>

              <button
                onClick={() => toggleCounterStatus("busy")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  counterStatus === "busy"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-white text-nexus-muted hover:text-nexus-text border border-rose-200"
                }`}
              >
                Busy
              </button>

              <button
                onClick={() => toggleCounterStatus("closed")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  counterStatus === "closed"
                    ? "bg-rose-800 text-white shadow-sm"
                    : "bg-white text-nexus-muted hover:text-nexus-text border border-rose-200"
                }`}
              >
                Closed
              </button>
            </div>
          </div>

          {/* Emergency Pause / Resume */}
          <div className="glass-panel p-6 rounded-2xl border border-rose-200/80 bg-white shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-nexus-text mb-2">
              Queue Operating Controls
            </h3>
            <p className="text-xs text-nexus-muted mb-4 leading-relaxed font-medium">
              Temporarily hold service intake during staff changeovers or equipment breaks.
            </p>

            <button
              onClick={toggleQueuePause}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                queueStatus === "paused"
                  ? "bg-gradient-to-r from-rose-600 to-orange-500 text-white shadow-md"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              {queueStatus === "paused" ? (
                <>
                  <Play className="w-4 h-4" />
                  Resume Service Queue
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  Pause Service Queue
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
