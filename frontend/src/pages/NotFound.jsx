import React from "react"
import { Link } from "react-router-dom"
import { AlertCircle, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto pt-20 text-center animate-fade-in">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="w-16 h-16 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">404</h1>
        <h2 className="text-lg font-bold text-slate-200 mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">
          The queue, token, or administrative screen you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  )
}
