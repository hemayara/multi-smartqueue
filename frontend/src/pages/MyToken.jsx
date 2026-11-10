import React, { useState, useEffect, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import apiClient from "../api/client"
import { useAuth } from "../App"
import TokenCard from "../components/TokenCard"
import { useQueueSocket } from "../hooks/useQueueSocket"
import {
  ArrowLeft,
  Bell,
  BellRing,
  Volume2,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Smartphone,
  Send,
  Check,
} from "lucide-react"

export default function MyToken() {
  const { tokenId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [smsAlert, setSmsAlert] = useState(null)
  const [testingSms, setTestingSms] = useState(false)
  const [smsSuccess, setSmsSuccess] = useState(false)
  const [browserNotificationAllowed, setBrowserNotificationAllowed] = useState(
    "Notification" in window ? Notification.permission === "granted" : false
  )

  const fetchToken = useCallback(async () => {
    try {
      const res = await apiClient.get(`/student/token/${tokenId}`)
      if (res.data?.success) {
        setToken(res.data.data.token)
      }
    } catch (err) {
      setError(err.response?.data?.error || "Token not found.")
    } finally {
      setLoading(false)
    }
  }, [tokenId])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  const playAlertSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
      osc.start()
      osc.stop(ctx.currentTime + 0.6)
    } catch (e) {
      console.debug("Audio play skipped:", e)
    }
  }, [])

  // Real-time socket event handling
  const handleSocketEvent = useCallback(
    (event, data) => {
      // If 5-minute approaching notification arrives
      if (event === "token:approaching" && (data?.token_id === tokenId || data?.token_number === token?.token_number)) {
        setSmsAlert(data)
        playAlertSound()
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("🔔 Turn Approaching in ~5 Minutes!", {
            body: data.message || "Your token is next in line! Please proceed to the service counter immediately.",
            icon: "/favicon.svg",
          })
        }
      }

      // If token status updated or queue advanced
      if (
        (data?.id && data.id === tokenId) ||
        event === "token:called" ||
        event === "token:completed" ||
        event === "queue:updated"
      ) {
        fetchToken()

        // Trigger browser notification if allowed and token was called
        if (event === "token:called" && data?.id === tokenId) {
          playAlertSound()
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`Your Turn! Token ${data.token_number}`, {
              body: `Please proceed immediately to ${data.counter_name || "the service counter"}.`,
              icon: "/favicon.svg",
            })
          }
        }
      }
    },
    [tokenId, token?.token_number, fetchToken, playAlertSound]
  )

  useQueueSocket(token?.queue_id, handleSocketEvent)

  const handleTestSMS = async () => {
    setTestingSms(true)
    try {
      const targetPhone = token?.guest_phone || user?.phone_number || "+91 98765 43210"
      const res = await apiClient.post(`/student/token/${tokenId}/test-sms`, {
        phone: targetPhone
      })
      if (res.data?.success) {
        setSmsSuccess(true)
        setSmsAlert(res.data.data)
        playAlertSound()
        setTimeout(() => setSmsSuccess(false), 5000)
      }
    } catch (err) {
      alert("Failed to send test SMS: " + (err.response?.data?.error || err.message))
    } finally {
      setTestingSms(false)
    }
  }

  const handleCancel = async (id) => {
    try {
      await apiClient.post(`/student/token/${id}/cancel`)
      fetchToken()
    } catch (err) {
      alert(err.response?.data?.error || "Cancellation failed.")
    }
  }

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.")
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === "granted") {
      setBrowserNotificationAllowed(true)
      new Notification("SmartQueue Alerts Enabled", {
        body: "You will receive an alert as soon as your token is called!",
        icon: "/favicon.svg",
      })
    }
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">Connecting to live queue...</p>
      </div>
    )
  }

  if (error || !token) {
    return (
      <div className="max-w-md mx-auto pt-10 text-center animate-fade-in">
        <div className="glass-panel p-8 rounded-2xl border border-nexus-border">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Token Error</h2>
          <p className="text-sm text-nexus-muted mb-6">{error || "Token could not be retrieved."}</p>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 px-4 py-2 bg-nexus-sub hover:bg-nexus-surface border border-nexus-border rounded-xl text-xs font-bold text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>
        </div>
      </div>
    )
  }

  const targetPhone = token?.guest_phone || user?.phone_number || "+91 98765 43210"
  const isApproaching =
    Boolean(smsAlert) ||
    (token?.status === "waiting" &&
      token?.estimation &&
      (token.estimation.position_ahead <= 1 ||
        (token.estimation.estimated_wait_minutes !== null && token.estimation.estimated_wait_minutes <= 5)))

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in pb-16">
      <div className="flex items-center justify-between">
        <Link
          to="/services"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-nexus-muted hover:text-rose-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to All Services
        </Link>

        {/* Browser notification opt-in button */}
        {!browserNotificationAllowed ? (
          <button
            onClick={requestNotificationPermission}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white text-rose-600 border border-rose-200 hover:border-orange-300 transition-colors cursor-pointer shadow-sm"
          >
            <Bell className="w-3.5 h-3.5 text-orange-500" />
            Enable Turn Notification
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600">
            <Bell className="w-3.5 h-3.5" />
            Notifications Active
          </span>
        )}
      </div>

      {/* 5-Minute Turn Approaching Alert Banner */}
      {isApproaching && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-orange-50 to-rose-50 border-2 border-rose-300 text-nexus-text animate-pulse shadow-md">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0">
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-rose-700 uppercase tracking-wider">
                  Turn Approaching in ~5 Minutes
                </span>
                <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                  Next Token Is Yours
                </span>
              </div>
              <p className="text-xs font-bold text-rose-950">
                మీ టోకెన్ {token?.token_number} 5 నిమిషాల్లో రాబోతుంది! తదుపరి టోకెన్ మీదే. దయచేసి వెంటనే హాస్పిటల్ / బ్యాంక్ / కౌంటర్ వద్దకు చేరుకోండి.
              </p>
              <p className="text-[11px] text-nexus-muted font-medium">
                Next token in queue is yours! If you are far away, please head to the service counter immediately so you do not miss your turn.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Token Component */}
      <TokenCard token={token} onCancel={handleCancel} showQR={true} />

      {/* Mobile SMS Turn Alert (5-Min Notice) Panel */}
      <div className="glass-panel p-5 rounded-2xl border border-rose-200/80 bg-white space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-nexus-text uppercase tracking-wider">
                  Mobile SMS Alert (5-Min Notice)
                </h3>
                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-nexus-muted mt-0.5">
                Alerts sent to: <span className="font-bold text-nexus-text">{targetPhone}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleTestSMS}
            disabled={testingSms}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 disabled:opacity-50 text-white rounded-xl shadow-md transition-all cursor-pointer"
          >
            {testingSms ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : smsSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>SMS Dispatched!</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Test 5-Min SMS</span>
              </>
            )}
          </button>
        </div>

        {/* Latest SMS Delivery simulated message preview */}
        {smsAlert && (
          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 text-xs text-nexus-muted space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between text-[10px] text-rose-600 font-bold uppercase tracking-wider">
              <span>📱 Simulated Mobile SMS Dispatched</span>
              <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded">Delivered</span>
            </div>
            <p className="text-nexus-text font-bold text-xs leading-relaxed">
              "{smsAlert.message}"
            </p>
            <p className="text-[10px] text-nexus-muted">
              Recipient: {smsAlert.phone || targetPhone} • Real-time notice 5 minutes before queue arrival
            </p>
          </div>
        )}

        <p className="text-[11px] text-nexus-muted leading-relaxed font-medium">
          💡 You will receive an SMS and audio notification 5 minutes before your token arrives at the counter so you have plenty of time to reach the hospital, bank, or school counter.
        </p>
      </div>

      {/* Advice / Keep Page Open Alert */}
      <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white text-xs text-nexus-muted flex items-start gap-3 shadow-sm">
        <Sparkles className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-nexus-text">Live Status Active:</span> This screen updates automatically in real-time when staff advance the queue. You can keep this browser tab open or save your token number.
        </div>
      </div>
    </div>
  )
}
