import React from "react"
import { Users, Monitor, ArrowRight, Play, Pause, AlertOctagon } from "lucide-react"

export default function QueueStatus({ queueData }) {
  if (!queueData) return null

  const { queue, waiting_count, current_token, next_tokens, counters } = queueData

  const isPaused = queue?.status === "paused"
  const isClosed = queue?.status === "closed"

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{queue?.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/40 uppercase">
              {queue?.code}
            </span>
            <span className="text-xs text-slate-400">
              Avg service: ~{queue?.estimated_service_time || 5} min
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isPaused ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Pause className="w-3.5 h-3.5" />
              Paused
            </span>
          ) : isClosed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <AlertOctagon className="w-3.5 h-3.5" />
              Closed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 status-dot-active"></span>
              Live Queue
            </span>
          )}
        </div>
      </div>

      {/* Main Board: Now Serving */}
      <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-6 rounded-xl border border-slate-800 text-center mb-6 relative overflow-hidden">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
          Now Serving
        </div>
        {current_token ? (
          <div>
            <div className="text-5xl sm:text-6xl font-black token-digit text-white tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-white bg-clip-text text-transparent">
              {current_token.token_number}
            </div>
            {current_token.counter_name && (
              <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                <Monitor className="w-4 h-4" />
                {current_token.counter_name}
              </div>
            )}
          </div>
        ) : (
          <div className="text-slate-500 text-base py-3 font-medium">
            Waiting for next token call...
          </div>
        )}
      </div>

      {/* Queue Stats Bar */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            Tokens Waiting
          </div>
          <div className="text-3xl font-extrabold text-white">{waiting_count || 0}</div>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1">
            <Monitor className="w-3.5 h-3.5 text-indigo-400" />
            Open Counters
          </div>
          <div className="text-3xl font-extrabold text-white">
            {counters?.filter((c) => c.status === "open" || c.status === "busy").length || 0}
          </div>
        </div>
      </div>

      {/* Up Next Preview */}
      {next_tokens && next_tokens.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Up Next in Line
          </div>
          <div className="flex flex-wrap gap-2">
            {next_tokens.map((tokenNum, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 font-mono"
              >
                {tokenNum}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
