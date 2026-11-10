import React, { useState, useEffect } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../App"
import apiClient from "../api/client"
import {
  Ticket,
  User,
  Phone,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  KeyRound,
  RotateCw,
  BellRing,
  ShieldCheck,
} from "lucide-react"

export default function JoinQueue() {
  const { queueId } = useParams()
  const [searchParams] = useSearchParams()
  const qrHash = searchParams.get("qr")

  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [queues, setQueues] = useState([])
  const [selectedQueueId, setSelectedQueueId] = useState(queueId || "")
  const [selectedQueue, setSelectedQueue] = useState(null)
  const [guestName, setGuestName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)

  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [receivedOtp, setReceivedOtp] = useState("")
  const [otpTimer, setOtpTimer] = useState(0)

  useEffect(() => {
    let interval = null
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [otpTimer])

  useEffect(() => {
    const initQueueData = async () => {
      try {
        if (qrHash) {
          const res = await apiClient.get(`/queue/qr/${qrHash}`)
          if (res.data?.success) {
            const q = res.data.data.queue
            setSelectedQueue(q)
            setSelectedQueueId(q.id)
            setQueues([q])
          }
        } else {
          const res = await apiClient.get("/queue/public/list")
          if (res.data?.success) {
            const qList = res.data.data.queues || []
            setQueues(qList)

            if (queueId) {
              const matched = qList.find((q) => q.id === queueId)
              if (matched) {
                setSelectedQueue(matched)
                setSelectedQueueId(matched.id)
              }
            } else if (qList.length > 0) {
              setSelectedQueue(qList[0])
              setSelectedQueueId(qList[0].id)
            }
          }
        }
      } catch (err) {
        setError("Failed to load queue details. The link or QR code may be invalid.")
      } finally {
        setInitialLoading(false)
      }
    }

    initQueueData()
  }, [queueId, qrHash])

  const handleQueueChange = (e) => {
    const qId = e.target.value
    setSelectedQueueId(qId)
    const found = queues.find((q) => q.id === qId)
    setSelectedQueue(found || null)
  }

  // Request 6-digit OTP
  const handleSendOtp = async () => {
    const phone = guestPhone.trim()
    if (!phone || phone.length < 8) {
      setError("Please enter a valid 10-digit mobile number (దయచేసి మీ మొబైల్ నెంబర్ నమోదు చేయండి).")
      return
    }

    setError(null)
    setOtpLoading(true)

    try {
      const res = await apiClient.post("/student/send-otp", { phone })
      if (res.data?.success) {
        setOtpSent(true)
        setOtpVerified(false)
        setReceivedOtp(res.data.data?.otp || "")
        setOtpTimer(60)
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP to your mobile.")
    } finally {
      setOtpLoading(false)
    }
  }

  // Issue Token (with or without OTP)
  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setError(null)

    const phone = guestPhone.trim()

    // If mobile number entered, require OTP if not yet sent or entered
    if (phone && !otpSent && !otpVerified) {
      handleSendOtp()
      return
    }

    if (phone && otpSent && !otpCode.trim() && !otpVerified) {
      setError("Please enter the 6-digit OTP sent to your mobile (మొబైల్ కి వచ్చిన ఓటీపీ నమోదు చేయండి).")
      return
    }

    setLoading(true)

    try {
      const payload = {
        queue_id: selectedQueueId,
      }

      if (!isAuthenticated) {
        if (!guestName.trim()) {
          setError("Please enter your name to receive a queue token.")
          setLoading(false)
          return
        }
        payload.guest_name = guestName.trim()
      }

      if (phone) {
        payload.guest_phone = phone
        payload.phone = phone
        if (otpCode.trim()) {
          payload.otp = otpCode.trim()
        }
      }

      const res = await apiClient.post("/student/join", payload)
      if (res.data?.success) {
        const token = res.data.data.token
        navigate(`/token/${token.id}`)
      }
    } catch (err) {
      const data = err.response?.data
      if (data?.details && typeof data.details === "object") {
        const messages = Object.entries(data.details)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ")
        setError(`${data.error || "Validation error"}: ${messages}`)
      } else {
        setError(data?.error || "Unable to join queue at this time.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-nexus-muted">
        <div className="w-8 h-8 border-3 border-nexus-emerald border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold tracking-widest uppercase text-nexus-mint">
          Preparing Queue Entry Desk...
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto pt-4 pb-16 animate-fade-in">
      <div className="glass-panel p-8 sm:p-9 rounded-3xl border border-rose-200/80 shadow-nexus-card bg-white">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-200 shadow-sm">
            <Ticket className="w-6 h-6 text-rose-600" />
          </div>
          <h1 className="text-2xl font-black text-nexus-text tracking-tight">Issue Digital Token</h1>
          <p className="text-xs text-nexus-muted mt-1 font-medium">
            Get an instant queue ticket with real-time SMS turn notifications
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Selected Queue Overview Card */}
        {selectedQueue && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-50/50 border border-rose-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono font-bold text-rose-600 uppercase tracking-wider">
                {selectedQueue.prefix || selectedQueue.code} Service Desk
              </span>
              <span className="text-xs text-nexus-muted flex items-center gap-1 font-mono font-medium">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                ~{selectedQueue.estimated_service_time || 5} min/turn
              </span>
            </div>
            <div className="text-sm font-bold text-nexus-text">{selectedQueue.name}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!qrHash && (
            <div>
              <label className="block text-[11px] font-bold text-nexus-text mb-1.5 uppercase tracking-wider">
                Select Service Queue
              </label>
              <select
                value={selectedQueueId}
                onChange={handleQueueChange}
                required
                className="w-full px-3.5 py-3 bg-rose-50/40 border border-rose-200/80 rounded-xl text-nexus-text text-xs font-semibold focus:outline-none focus:border-rose-500 focus:bg-white transition-colors cursor-pointer"
              >
                {queues.map((q) => (
                  <option key={q.id} value={q.id} disabled={q.status === "closed"}>
                    {q.name} ({q.status === "closed" ? "Closed" : "Open"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Visitor guest inputs if not authenticated */}
          {!isAuthenticated && (
            <div>
              <label className="block text-[11px] font-bold text-nexus-text mb-1.5 uppercase tracking-wider">
                Your Full Name (మీ పేరు)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-nexus-muted absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full pl-10 pr-4 py-3 bg-rose-50/40 border border-rose-200/80 rounded-xl text-nexus-text font-medium placeholder-nexus-muted/60 text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
                />
              </div>
            </div>
          )}

          {/* Mobile number with SMS notice & OTP trigger */}
          <div>
            <label className="block text-[11px] font-bold text-nexus-text mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>Mobile Number (మొబైల్ నెంబర్)</span>
              <span className="text-[9px] text-rose-600 font-extrabold uppercase bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                SMS Active
              </span>
            </label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-nexus-muted absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => {
                    setGuestPhone(e.target.value)
                    setOtpSent(false)
                    setOtpVerified(false)
                    setOtpCode("")
                  }}
                  placeholder="e.g. 9866114108"
                  className="w-full pl-10 pr-4 py-3 bg-rose-50/40 border border-rose-200/80 rounded-xl text-nexus-text font-medium placeholder-nexus-muted/60 text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
                />
              </div>

              {guestPhone.trim().length >= 8 && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || otpTimer > 0}
                  className="px-3.5 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {otpLoading ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  <span>{otpSent ? (otpTimer > 0 ? `${otpTimer}s` : "Resend") : "Send OTP"}</span>
                </button>
              )}
            </div>

            {/* Smart 2-person ahead reminder info note */}
            <div className="mt-2 p-2.5 rounded-xl bg-orange-50/80 border border-orange-200/70 text-[11px] text-orange-800 flex items-start gap-2">
              <BellRing className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  లైన్ లో ఇంకా 2 మెంబర్స్ ఉన్నప్పుడు ఆటోమేటిక్ SMS వస్తుంది:
                </p>
                <p className="text-[10px] text-orange-700 mt-0.5 font-medium">
                  "🔔 మీ టోకెన్ ఇప్పుడు వస్తుంది, come soon for your place!"
                </p>
              </div>
            </div>
          </div>

          {/* OTP Input Section (shown when OTP is dispatched) */}
          {otpSent && (
            <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-nexus-text flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  Enter 6-Digit OTP (ఓటీపీ నమోదు చేయండి)
                </span>
                <span className="text-[10px] text-nexus-muted">Sent to {guestPhone}</span>
              </div>

              {/* Demo auto-fill helper */}
              {receivedOtp && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-200/80">
                  <span className="text-[11px] text-rose-700 font-mono">
                    📩 Mobile SMS: <strong>{receivedOtp}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(receivedOtp)}
                    className="text-[10px] font-bold text-rose-600 hover:text-orange-600 uppercase cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[0.5em] font-mono text-lg font-black py-2.5 bg-white border border-rose-300 rounded-xl text-nexus-text focus:outline-none focus:border-rose-500 shadow-sm"
              />
            </div>
          )}

          {isAuthenticated && (
            <div className="p-3.5 bg-rose-50/50 border border-rose-200/70 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
              <div className="text-xs text-nexus-muted">
                Authenticated as <span className="font-bold text-nexus-text">{user?.full_name}</span>. Token will link to your profile.
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedQueueId || selectedQueue?.status === "closed"}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>
                  {otpSent ? "Verify OTP & Issue Token" : "Issue My Digital Token"}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
