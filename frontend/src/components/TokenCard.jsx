import React, { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import {
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Volume2,
  QrCode,
  Sparkles,
} from "lucide-react"

export default function TokenCard({ token, onCancel, showQR = true, isCompact = false }) {
  const [showQrModal, setShowQrModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  if (!token) return null

  const {
    id,
    token_number,
    status,
    queue_name,
    counter_name,
    counter_number,
    estimation,
    created_at,
  } = token

  const getStatusBadge = () => {
    switch (status) {
      case "called":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-nexus-bright/20 text-nexus-mint border border-nexus-bright/50 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-nexus-bright status-dot-calling"></span>
            Called to Counter
          </span>
        )
      case "serving":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-nexus-emerald/20 text-nexus-bright border border-nexus-emerald/40">
            <span className="w-2 h-2 rounded-full bg-nexus-emerald status-dot-active"></span>
            Being Served
          </span>
        )
      case "completed":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-nexus-sub text-nexus-muted border border-nexus-border">
            <CheckCircle2 className="w-3.5 h-3.5 text-nexus-emerald" />
            Completed
          </span>
        )
      case "cancelled":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        )
      case "skipped":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Skipped / No-Show
          </span>
        )
      default: // waiting
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-nexus-surface text-nexus-mint border border-nexus-border">
            <span className="w-2 h-2 rounded-full bg-nexus-bright"></span>
            Waiting in Queue
          </span>
        )
    }
  }

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel your queue token?")) return
    setCancelling(true)
    try {
      await onCancel(id)
    } finally {
      setCancelling(false)
    }
  }

  const tokenUrl = `${window.location.origin}/token/${id}`

  return (
    <div className={`glass-panel rounded-2xl overflow-hidden border border-nexus-border relative ${isCompact ? "p-4" : "p-6"}`}>
      {/* Top Banner Status */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-xs uppercase font-extrabold text-rose-600 tracking-wider">
            {queue_name || "Queue Service"}
          </span>
          <div className="text-[11px] text-nexus-muted mt-0.5 font-medium">
            Issued at {new Date(created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Main Token Number Display */}
      <div className="text-center py-5 bg-gradient-to-b from-rose-50/60 to-orange-50/40 rounded-2xl border border-rose-200/80 mb-5 relative group shadow-sm">
        <div className="text-[11px] uppercase tracking-widest text-nexus-muted font-bold mb-1">
          Your Token Number
        </div>
        <div className="text-4xl sm:text-5xl font-black tracking-tight token-digit bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 bg-clip-text text-transparent">
          {token_number}
        </div>

        {/* Counter Announcement when called */}
        {status === "called" && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold animate-bounce">
            <Volume2 className="w-4 h-4 text-rose-600" />
            Please proceed to: {counter_name || `Counter ${counter_number || 1}`}
          </div>
        )}
      </div>

      {/* Real-time Wait & Position Metrics */}
      {status === "waiting" && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-200/70">
            <div className="flex items-center gap-2 text-nexus-muted text-xs font-medium mb-1">
              <Users className="w-3.5 h-3.5 text-rose-600" />
              People Ahead
            </div>
            <div className="text-2xl font-black text-nexus-text">
              {estimation?.position_ahead ?? 0}
            </div>
          </div>

          <div className="bg-orange-50/50 p-3.5 rounded-xl border border-orange-200/70">
            <div className="flex items-center gap-2 text-nexus-muted text-xs font-medium mb-1">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              Est. Waiting Time
            </div>
            <div className="text-2xl font-black text-nexus-text">
              {estimation?.estimated_wait_minutes !== null && estimation?.estimated_wait_minutes !== undefined
                ? `~${estimation.estimated_wait_minutes} min`
                : "Calculating..."}
            </div>
          </div>
        </div>
      )}

      {/* Note if queue paused or estimate note */}
      {estimation?.status_note && status === "waiting" && (
        <div className="text-xs text-nexus-muted bg-rose-50/60 p-2.5 rounded-lg border border-rose-200 mb-5 flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
          <span className="font-medium">{estimation.status_note}</span>
        </div>
      )}

      {/* Actions: QR & Cancel */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-rose-100">
        {showQR && (
          <button
            onClick={() => setShowQrModal(!showQrModal)}
            className="flex items-center gap-1.5 text-xs font-semibold text-nexus-text hover:text-rose-600 transition-colors py-1.5 px-3 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-rose-600" />
            <span>{showQrModal ? "Hide QR" : "Show QR Pass"}</span>
          </button>
        )}

        {status === "waiting" && onCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors py-1.5 px-3 rounded-xl border border-rose-200 cursor-pointer"
          >
            {cancelling ? "Cancelling..." : "Cancel Token"}
          </button>
        )}
      </div>

      {/* QR Code Reveal Panel */}
      {showQrModal && (
        <div className="mt-4 pt-4 border-t border-nexus-border flex flex-col items-center animate-fade-in">
          <div className="p-3 bg-white rounded-xl shadow-lg shadow-black/60">
            <QRCodeSVG value={tokenUrl} size={150} level="M" />
          </div>
          <p className="text-[11px] text-nexus-muted mt-2 text-center">
            Scan at desk to authenticate and verify this digital token
          </p>
        </div>
      )}
    </div>
  )
}
