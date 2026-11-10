import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  Clock,
  Users,
  Building2,
  Landmark,
  GraduationCap,
  School,
  FileCheck2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Smartphone,
  ChevronRight,
  Activity,
  Layers,
  Zap,
} from "lucide-react"

export default function LandingPage() {
  const [activeQueueTab, setActiveQueueTab] = useState("hospital")
  const [simTokens] = useState({
    hospital: { token: "HOSP-042", nowServing: "HOSP-041", waiting: 4, waitMin: 8, counter: "Doctor OPD Room 1", progress: 78 },
    bank: { token: "BANK-108", nowServing: "BANK-106", waiting: 6, waitMin: 12, counter: "Cash Counter 3", progress: 65 },
    college: { token: "EDU-019", nowServing: "EDU-018", waiting: 2, waitMin: 4, counter: "Admissions Desk 2", progress: 90 },
  })

  const currentSim = simTokens[activeQueueTab]

  const industries = [
    {
      id: "hospital",
      title: "Hospitals & Clinics",
      badge: "Healthcare",
      icon: Building2,
      headline: "OPD Triage & Specialist Consultations",
      desc: "Patients wait comfortably in waiting halls or nearby cafes without crowding consultation rooms. 5-minute automated SMS alerts notify patients when their turn arrives.",
      workflow: ["Online/Kiosk Token Issuance", "Doctor Counter Real-time Routing", "5-Min Advance Phone Alert", "Zero Hallway Congestion"],
      metric: "-68% Waiting Room Crowding",
    },
    {
      id: "bank",
      title: "Banks & Financial Centers",
      badge: "Banking",
      icon: Landmark,
      headline: "Teller Cash, Cheques & KYC Desks",
      desc: "Differentiate priority senior citizens, bulk cash deposits, and loan processing counters automatically with dynamic queue balancing.",
      workflow: ["Smart Service Tagging", "Teller Desk Load Balancing", "Digital Wall Display Sync", "Instant KYC Clearance"],
      metric: "4.2m Avg Teller Service Time",
    },
    {
      id: "college",
      title: "College & Universities",
      badge: "Higher Education",
      icon: GraduationCap,
      headline: "Admissions, Certificates & Fee Desks",
      desc: "Students register queues directly via QR codes on campus notice boards. Eliminate chaotic semester fee and document verification lines.",
      workflow: ["Notice Board QR Fast-Checkin", "Student ID Account Sync", "Multi-Counter Clearance", "Academic Staff Oversight"],
      metric: "100% Paperless Queue Ledger",
    },
    {
      id: "school",
      title: "School Offices & Admissions",
      badge: "K-12 Education",
      icon: School,
      headline: "Parent Inquiries & Tuition Counters",
      desc: "Provide parents a professional, hassle-free visiting experience during busy admission cycles and annual fee payment schedules.",
      workflow: ["Scheduled Parent Arrival Slots", "Principal Desk Routing", "Fee Receipt Verification", "Mobile Turn Updates"],
      metric: "-80% Parent Wait Frustration",
    },
    {
      id: "gov",
      title: "Government & Civic Centers",
      badge: "Public Administration",
      icon: FileCheck2,
      headline: "Permits, Registry & Citizen Services",
      desc: "High-volume citizen administration handled with transparency, non-colliding atomic token sequence generation, and multi-department governance.",
      workflow: ["Biometric Verification Sync", "Citizen Token Auditing", "Multi-Counter Progression", "Department Head Analytics"],
      metric: "3.5x Citizen Throughput",
    },
  ]

  const steps = [
    {
      step: "01",
      title: "Scan or Choose Service",
      desc: "Arrive at any participating institution or visit online. Scan the entrance QR code or choose your service counter.",
      tag: "Instant Entry",
    },
    {
      step: "02",
      title: "Receive Unique Digital Token",
      desc: "An atomic, monotonic token is generated immediately with precise queue sequence and live estimated wait time.",
      tag: "Zero Confusion",
    },
    {
      step: "03",
      title: "5-Minute Advance Notice",
      desc: "Go relax, grab coffee, or finish work. SmartQueue sends a mobile SMS and audio chime 5 minutes before your turn.",
      tag: "Time Freedom",
    },
    {
      step: "04",
      title: "Direct Counter Service",
      desc: "Walk straight to the designated counter when your number is called. Fast, seamless, and completely orderly.",
      tag: "Priority Service",
    },
  ]

  return (
    <div className="relative overflow-hidden space-y-20 sm:space-y-28 pb-24">
      {/* 1. HERO SECTION */}
      <section className="pt-6 sm:pt-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Hero Column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Status Label */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 status-dot-calling animate-pulse" />
              <span className="tracking-wider uppercase text-[11px] font-black">
                SMARTER QUEUES. BETTER EXPERIENCES.
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-nexus-text leading-[1.14]">
              Your Time Matters.{" "}
              <span className="bg-gradient-to-r from-rose-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                We Make Every Minute Count.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-nexus-muted max-w-xl leading-relaxed font-normal">
              Eliminate physical waiting lines forever. Join queues digitally from your phone, monitor your position live, and receive automated 5-minute SMS notices before your turn arrives.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <Link
                to="/join"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-sm tracking-wide shadow-emerald-sm hover:shadow-emerald-md transition-all duration-200 hover:-translate-y-0.5 group cursor-pointer"
              >
                <span>Get Your Token</span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/services"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-rose-50 border border-nexus-border text-nexus-text font-bold text-sm transition-all duration-200 shadow-sm"
              >
                <Layers className="w-4 h-4 text-rose-500" />
                <span>Explore Live Queues</span>
              </Link>

              <Link
                to="/analytics"
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 text-nexus-muted hover:text-rose-600 text-sm font-bold transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span>Platform Metrics</span>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-2 flex items-center gap-6 text-xs text-nexus-muted font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-500" />
                <span>Sub-Second Socket Sync</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-500" />
                <span>Non-Colliding Sequence</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-orange-500" />
                <span>5-Min Mobile SMS Alerts</span>
              </div>
            </div>
          </div>

          {/* Right Hero Column: Realistic Live Queue Preview */}
          <div className="lg:col-span-5 relative">
            <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-nexus-border relative overflow-hidden shadow-xl">
              {/* Header Selector inside simulator */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-nexus-border">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-nexus-text">
                    Live Queue Simulator
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-nexus-sub p-1 rounded-xl border border-nexus-border">
                  <button
                    onClick={() => setActiveQueueTab("hospital")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeQueueTab === "hospital"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-nexus-muted hover:text-nexus-text"
                    }`}
                  >
                    Hospital
                  </button>
                  <button
                    onClick={() => setActiveQueueTab("bank")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeQueueTab === "bank"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-nexus-muted hover:text-nexus-text"
                    }`}
                  >
                    Bank
                  </button>
                  <button
                    onClick={() => setActiveQueueTab("college")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeQueueTab === "college"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-nexus-muted hover:text-nexus-text"
                    }`}
                  >
                    College
                  </button>
                </div>
              </div>

              {/* Main Token Display Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-rose-50 to-orange-50 border border-rose-200 text-center mb-5 relative group">
                <div className="flex items-center justify-between text-xs text-nexus-muted mb-2 font-bold">
                  <span>YOUR SERVICE TOKEN</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-white text-rose-600 border border-rose-200 shadow-sm">
                    Active in Queue
                  </span>
                </div>

                <div className="text-4xl sm:text-5xl font-black token-digit tracking-tight bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent my-1">
                  {currentSim.token}
                </div>

                <div className="text-xs text-nexus-muted flex items-center justify-center gap-2 mt-2">
                  <span>Routing to:</span>
                  <span className="font-bold text-nexus-text">{currentSim.counter}</span>
                </div>
              </div>

              {/* Real-time Queue Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3.5 rounded-xl bg-nexus-sub border border-nexus-border">
                  <div className="flex items-center gap-1.5 text-xs text-nexus-muted mb-1 font-bold">
                    <Users className="w-3.5 h-3.5 text-rose-600" />
                    <span>Ahead of You</span>
                  </div>
                  <div className="text-2xl font-black text-nexus-text">
                    {currentSim.waiting} <span className="text-xs font-normal text-nexus-muted">people</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-nexus-sub border border-nexus-border">
                  <div className="flex items-center gap-1.5 text-xs text-nexus-muted mb-1 font-bold">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    <span>Est. Wait Time</span>
                  </div>
                  <div className="text-2xl font-black text-nexus-text">
                    ~{currentSim.waitMin} <span className="text-xs font-normal text-nexus-muted">mins</span>
                  </div>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-1.5 mb-5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-nexus-muted flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-600" />
                    Queue Progression
                  </span>
                  <span className="text-rose-600 font-extrabold">{currentSim.progress}%</span>
                </div>
                <div className="h-2.5 w-full bg-nexus-sub rounded-full overflow-hidden p-0.5 border border-nexus-border">
                  <div
                    className="h-full bg-gradient-to-r from-rose-600 to-orange-500 rounded-full transition-all duration-700"
                    style={{ width: `${currentSim.progress}%` }}
                  />
                </div>
              </div>

              {/* Now Serving Status Strip */}
              <div className="p-3 rounded-xl bg-white border border-nexus-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-nexus-muted font-medium">Now at Counter:</span>
                  <span className="font-mono font-bold text-nexus-text">{currentSim.nowServing}</span>
                </div>
                <Link
                  to="/join"
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <span>Test Real Queue</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MULTI-INDUSTRY PLATFORM SOLUTIONS */}
      <section id="solutions" className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            Universal Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-nexus-text tracking-tight">
            Built for Every Service Environment
          </h2>
          <p className="text-sm sm:text-base text-nexus-muted leading-relaxed font-normal">
            From hospital emergency triage to university fee counters, SmartQueue adapts cleanly to any desk hierarchy with zero changes to your existing workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {industries.map((ind) => {
            const IconComponent = ind.icon
            return (
              <div
                key={ind.id}
                className="glass-panel glass-panel-hover p-6 rounded-2xl border border-nexus-border flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-nexus-sub text-rose-600 border border-rose-200">
                      {ind.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-nexus-text mb-1 tracking-tight group-hover:text-rose-600 transition-colors">
                    {ind.title}
                  </h3>
                  <div className="text-xs font-bold text-orange-600 mb-3">
                    {ind.headline}
                  </div>
                  <p className="text-xs text-nexus-muted leading-relaxed mb-5">
                    {ind.desc}
                  </p>

                  <div className="space-y-1.5 mb-6">
                    {ind.workflow.map((wf, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-nexus-text font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{wf}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-nexus-border flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-orange-600">
                    {ind.metric}
                  </span>
                  <Link
                    to="/services"
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>View Desks</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}

          {/* Callout Card */}
          <div className="glass-panel p-6 rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-50 via-orange-50 to-white flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="p-3 w-fit rounded-xl bg-rose-600 text-white mb-4 shadow-sm">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-nexus-text mb-2">Need a Custom Queue Setup?</h3>
              <p className="text-xs text-nexus-muted leading-relaxed mb-4">
                Deploy SmartQueue within minutes across any department. Multi-service priority routing, staff role permissions, and live Socket.IO events come pre-configured out of the box.
              </p>
            </div>

            <Link
              to="/admin"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white text-xs font-bold text-center transition-all shadow-sm cursor-pointer"
            >
              Open Administration Console
            </Link>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            Seamless Flow
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-nexus-text tracking-tight">
            How SmartQueue Works in 4 Steps
          </h2>
          <p className="text-sm text-nexus-muted">
            Engineered to replace physical queues with effortless mobile notifications.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((st) => (
            <div
              key={st.step}
              className="glass-panel p-6 rounded-2xl border border-nexus-border relative flex flex-col justify-between group hover:border-rose-400 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-3xl font-black text-rose-200 group-hover:text-rose-400 transition-colors">
                    {st.step}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                    {st.tag}
                  </span>
                </div>
                <h4 className="text-base font-black text-nexus-text mb-2 tracking-tight">
                  {st.title}
                </h4>
                <p className="text-xs text-nexus-muted leading-relaxed">
                  {st.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-nexus-border flex items-center gap-2 text-xs text-rose-600 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Automated step</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. REAL-TIME METRICS & ANALYTICS TEASER */}
      <section id="analytics-preview" className="glass-panel p-8 sm:p-12 rounded-3xl border border-nexus-border relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 uppercase">
              <BarChart3 className="w-3.5 h-3.5" />
              Live Governance & Operational Telemetry
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-nexus-text tracking-tight">
              Actionable Intelligence for Administrators & HODs
            </h2>
            <p className="text-sm text-nexus-muted leading-relaxed font-normal">
              Every token issued records precise service durations, wait intervals, and peak congestion periods. Audit your facility's real-time throughput from any device.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-nexus-sub rounded-xl border border-nexus-border">
                <div className="text-xs text-nexus-muted font-bold">Avg Wait Time</div>
                <div className="text-2xl font-black text-rose-600 mt-0.5">~6.4 min</div>
                <div className="text-[10px] text-nexus-muted mt-1 font-medium">Reduced from 45 min</div>
              </div>

              <div className="p-3.5 bg-nexus-sub rounded-xl border border-nexus-border">
                <div className="text-xs text-nexus-muted font-bold">Completion Rate</div>
                <div className="text-2xl font-black text-orange-600 mt-0.5">96.8%</div>
                <div className="text-[10px] text-nexus-muted mt-1 font-medium">Zero lost tokens</div>
              </div>

              <div className="p-3.5 bg-nexus-sub rounded-xl border border-nexus-border col-span-2 sm:col-span-1">
                <div className="text-xs text-nexus-muted font-bold">Peak Hour Triage</div>
                <div className="text-2xl font-black text-rose-500 mt-0.5">10:30 AM</div>
                <div className="text-[10px] text-nexus-muted mt-1 font-medium">Auto counter balance</div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/analytics"
                className="inline-flex items-center gap-2 text-xs font-black text-rose-600 hover:text-rose-700"
              >
                <span>Open Full Analytics Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-nexus-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-nexus-border">
              <span className="font-black text-nexus-text uppercase tracking-wider">Today's Token Volume</span>
              <span className="text-rose-600 font-mono font-bold">Live Sync</span>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between text-xs text-nexus-muted mb-1 font-medium">
                  <span>Hospital OPD Consultation</span>
                  <span className="font-mono text-nexus-text font-bold">142 served</span>
                </div>
                <div className="h-2.5 w-full bg-nexus-sub rounded-full overflow-hidden">
                  <div className="h-full bg-rose-600 rounded-full" style={{ width: "88%" }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-nexus-muted mb-1 font-medium">
                  <span>Banking & Cash Tellers</span>
                  <span className="font-mono text-nexus-text font-bold">96 served</span>
                </div>
                <div className="h-2.5 w-full bg-nexus-sub rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: "68%" }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-nexus-muted mb-1 font-medium">
                  <span>Student Admissions & Fees</span>
                  <span className="font-mono text-nexus-text font-bold">178 served</span>
                </div>
                <div className="h-2.5 w-full bg-nexus-sub rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: "94%" }} />
                </div>
              </div>
            </div>

            <div className="p-3 bg-nexus-sub rounded-xl border border-nexus-border text-[11px] text-nexus-muted font-medium">
              💡 Full institutional reporting with CSV export is available in the administrator console.
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION STRIP */}
      <section className="text-center py-12 px-6 rounded-3xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 text-white relative overflow-hidden space-y-6 shadow-xl">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight max-w-xl mx-auto">
          Ready to experience the next evolution of queue management?
        </h2>
        <p className="text-rose-100 text-sm max-w-lg mx-auto font-medium">
          Test the live demo right now. Issue a student token, call tokens as a doctor or teller, or view real-time governance metrics.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap pt-2">
          <Link
            to="/join"
            className="px-6 py-3 rounded-xl bg-white hover:bg-rose-50 text-rose-600 font-black text-sm shadow-md transition-all cursor-pointer"
          >
            Issue Real Token Now
          </Link>
          <Link
            to="/login"
            className="px-5 py-3 rounded-xl bg-rose-700/60 hover:bg-rose-700 text-white border border-rose-300 font-bold text-sm transition-all"
          >
            Staff & Admin Sign In
          </Link>
        </div>
      </section>
    </div>
  )
}
