import React, { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import apiClient from "../api/client"
import {
  ShieldCheck,
  Building,
  Layers,
  Monitor,
  Users,
  BarChart3,
  Plus,
  QrCode,
  CheckCircle,
  Clock,
  Sparkles,
  AlertCircle,
  Download,
  Building2,
  Landmark,
  GraduationCap,
} from "lucide-react"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics")
  const [report, setReport] = useState(null)
  const [departments, setDepartments] = useState([])
  const [counters, setCounters] = useState([])
  const [queues, setQueues] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // QR Modal State
  const [qrModalQueue, setQrModalQueue] = useState(null)

  // Creation forms
  const [deptForm, setDeptForm] = useState({ name: "", code: "", description: "" })
  const [counterForm, setCounterForm] = useState({ name: "", counter_number: 1, department_id: "" })
  const [queueForm, setQueueForm] = useState({
    name: "",
    code: "",
    prefix: "TKN",
    department_id: "",
    estimated_service_time: 5,
    max_daily_capacity: 200,
  })

  const loadAdminData = async () => {
    try {
      const [orgsRes] = await Promise.all([apiClient.get("/admin/organizations")])
      const orgs = orgsRes.data?.data?.organizations || []
      const orgId = orgs[0]?.id

      if (orgId) {
        const [repRes, deptRes, countRes, queueRes, staffRes] = await Promise.all([
          apiClient.get(`/admin/reports?organization_id=${orgId}`),
          apiClient.get(`/admin/departments?organization_id=${orgId}`),
          apiClient.get(`/admin/counters?organization_id=${orgId}`),
          apiClient.get(`/admin/queues?organization_id=${orgId}`),
          apiClient.get(`/admin/staff?organization_id=${orgId}`),
        ])

        setReport(repRes.data?.data?.summary)
        setDepartments(deptRes.data?.data?.departments || [])
        setCounters(countRes.data?.data?.counters || [])
        setQueues(queueRes.data?.data?.queues || [])
        setStaffList(staffRes.data?.data?.staff || [])

        if (deptRes.data?.data?.departments?.length > 0) {
          const firstDeptId = deptRes.data.data.departments[0].id
          setCounterForm((prev) => ({ ...prev, department_id: firstDeptId }))
          setQueueForm((prev) => ({ ...prev, department_id: firstDeptId }))
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load administration data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  // Create Department
  const handleCreateDept = async (e) => {
    e.preventDefault()
    try {
      const res = await apiClient.post("/admin/departments", deptForm)
      if (res.data?.success) {
        setSuccessMsg("Department created successfully!")
        setDeptForm({ name: "", code: "", description: "" })
        loadAdminData()
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create department.")
    }
  }

  // Create Counter
  const handleCreateCounter = async (e) => {
    e.preventDefault()
    try {
      const res = await apiClient.post("/admin/counters", counterForm)
      if (res.data?.success) {
        setSuccessMsg("Counter created successfully!")
        setCounterForm((prev) => ({ ...prev, name: "", counter_number: Number(prev.counter_number) + 1 }))
        loadAdminData()
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create counter.")
    }
  }

  // Create Queue
  const handleCreateQueue = async (e) => {
    e.preventDefault()
    try {
      const res = await apiClient.post("/admin/queues", queueForm)
      if (res.data?.success) {
        setSuccessMsg("Service Queue created successfully!")
        setQueueForm((prev) => ({ ...prev, name: "", code: "", prefix: "TKN" }))
        loadAdminData()
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create queue.")
    }
  }

  // Assign staff to counter
  const handleAssignStaff = async (counterId, staffId) => {
    try {
      await apiClient.post("/admin/assign-staff", { counter_id: counterId, staff_id: staffId || null })
      setSuccessMsg("Staff assigned to counter.")
      loadAdminData()
    } catch (err) {
      setError("Failed to assign staff.")
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-nexus-muted">
        <div className="w-8 h-8 border-3 border-nexus-emerald border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold tracking-widest uppercase text-nexus-mint">
          Loading Organization Governance...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-nexus-text tracking-tight">Organization Administration</h1>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 uppercase tracking-wider">
              Control Panel
            </span>
          </div>
          <p className="text-xs text-nexus-muted mt-1 font-medium">Configure queues, departments, counters, and view system metrics</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-rose-200 shadow-sm">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "analytics" ? "bg-rose-600 text-white shadow-sm" : "text-nexus-muted hover:text-rose-600"
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("queues")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "queues" ? "bg-rose-600 text-white shadow-sm" : "text-nexus-muted hover:text-rose-600"
            }`}
          >
            Queues & QR
          </button>
          <button
            onClick={() => setActiveTab("counters")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "counters" ? "bg-rose-600 text-white shadow-sm" : "text-nexus-muted hover:text-rose-600"
            }`}
          >
            Counters
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "departments" ? "bg-rose-600 text-white shadow-sm" : "text-nexus-muted hover:text-rose-600"
            }`}
          >
            Departments
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between font-medium">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold ml-2">×</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs flex items-center justify-between font-medium">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-orange-600 hover:text-orange-800 font-bold ml-2">×</button>
        </div>
      )}

      {/* TAB 1: Analytics & Reports */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white shadow-sm">
              <div className="text-[11px] text-nexus-muted font-medium">Total Issued</div>
              <div className="text-2xl font-black text-nexus-text mt-1">{report?.total_tokens || 0}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white shadow-sm">
              <div className="text-[11px] text-rose-700 font-medium">Completed</div>
              <div className="text-2xl font-black text-rose-600 mt-1">{report?.completed || 0}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white shadow-sm">
              <div className="text-[11px] text-nexus-muted font-medium">Waiting Now</div>
              <div className="text-2xl font-black text-orange-600 mt-1">{report?.waiting || 0}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white shadow-sm">
              <div className="text-[11px] text-orange-700 font-medium">Serving Now</div>
              <div className="text-2xl font-black text-orange-600 mt-1">{report?.serving || 0}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white shadow-sm">
              <div className="text-[11px] text-rose-600 font-medium">Cancelled</div>
              <div className="text-2xl font-black text-rose-600 mt-1">{report?.cancelled || 0}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-rose-200/80 bg-white shadow-sm">
              <div className="text-[11px] text-rose-700 font-medium">Success Rate</div>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {report?.completion_rate_percent || 0}%
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-rose-200/80 bg-white shadow-sm">
            <h2 className="text-sm font-bold text-nexus-text uppercase tracking-wider mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-600" />
              Operational Summary & System Status
            </h2>
            <p className="text-xs text-nexus-muted leading-relaxed max-w-2xl font-medium">
              Real-time synchronization is running across all queues and counters. Monotonic sequence allocation enforces daily token number uniqueness, and atomic counters eliminate concurrency conflicts during peak hours.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Queues & QR Generator */}
      {activeTab === "queues" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-rose-200/80 bg-white shadow-sm lg:col-span-1">
            <h2 className="text-sm font-bold text-nexus-text uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-600" />
              Create Service Queue
            </h2>
            <form onSubmit={handleCreateQueue} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-nexus-text uppercase">Queue Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Doctor Consultation OPD"
                  value={queueForm.name}
                  onChange={(e) => setQueueForm({ ...queueForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-nexus-text text-xs font-medium focus:border-rose-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-nexus-text uppercase">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="HOSP-OPD"
                    value={queueForm.code}
                    onChange={(e) => setQueueForm({ ...queueForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-nexus-text text-xs font-mono uppercase focus:border-rose-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-nexus-text uppercase">Token Prefix</label>
                  <input
                    type="text"
                    required
                    placeholder="HOSP"
                    value={queueForm.prefix}
                    onChange={(e) => setQueueForm({ ...queueForm, prefix: e.target.value })}
                    className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-nexus-text text-xs font-mono uppercase focus:border-rose-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-nexus-text uppercase">Department</label>
                <select
                  value={queueForm.department_id}
                  onChange={(e) => setQueueForm({ ...queueForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-nexus-text text-xs font-medium focus:border-rose-500 focus:bg-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-nexus-text uppercase">Est. Minutes</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={queueForm.estimated_service_time}
                    onChange={(e) => setQueueForm({ ...queueForm, estimated_service_time: e.target.value })}
                    className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-nexus-text text-xs font-medium focus:border-rose-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-nexus-text uppercase">Daily Cap</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={queueForm.max_daily_capacity}
                    onChange={(e) => setQueueForm({ ...queueForm, max_daily_capacity: e.target.value })}
                    className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-nexus-text text-xs font-medium focus:border-rose-500 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
              >
                Create Queue
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-rose-200/80 bg-white shadow-sm lg:col-span-2">
            <h2 className="text-sm font-bold text-nexus-text uppercase tracking-wider mb-4">Active Queues & QR Passes</h2>
            <div className="space-y-3">
              {queues.map((q) => (
                <div key={q.id} className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 border border-orange-200">
                        {q.prefix}
                      </span>
                      <span className="font-bold text-sm text-nexus-text">{q.name}</span>
                    </div>
                    <div className="text-xs text-nexus-muted mt-1 font-medium">
                      Avg: ~{q.estimated_service_time} min | Daily Cap: {q.max_daily_capacity}
                    </div>
                  </div>

                  <button
                    onClick={() => setQrModalQueue(q)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-bold border border-rose-200 transition-colors cursor-pointer shadow-sm"
                  >
                    <QrCode className="w-3.5 h-3.5 text-orange-500" />
                    Print QR
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Counters & Staff Assignment */}
      {activeTab === "counters" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-rose-200/80 bg-white shadow-sm lg:col-span-1">
            <h2 className="text-sm font-bold text-nexus-text uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-600" />
              Add Counter
            </h2>
            <form onSubmit={handleCreateCounter} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-nexus-text uppercase">Station Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Doctor OPD Room 3"
                  value={counterForm.name}
                  onChange={(e) => setCounterForm({ ...counterForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-nexus-text text-xs font-medium focus:border-rose-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-nexus-text uppercase">Counter Number</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={counterForm.counter_number}
                  onChange={(e) => setCounterForm({ ...counterForm, counter_number: e.target.value })}
                  className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-nexus-text text-xs font-medium focus:border-rose-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-nexus-text uppercase">Department</label>
                <select
                  value={counterForm.department_id}
                  onChange={(e) => setCounterForm({ ...counterForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-nexus-text text-xs font-medium focus:border-rose-500 focus:bg-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
              >
                Create Counter
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-rose-200/80 bg-white shadow-sm lg:col-span-2">
            <h2 className="text-sm font-bold text-nexus-text uppercase tracking-wider mb-4">Counters & Staff Rostering</h2>
            <div className="space-y-3">
              {counters.map((c) => (
                <div key={c.id} className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-nexus-text">{c.name} (Counter #{c.counter_number})</div>
                    <div className="text-xs text-nexus-muted capitalize mt-0.5 font-medium">Status: {c.status}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-nexus-muted font-medium">Assigned:</span>
                    <select
                      value={c.assigned_staff_id || ""}
                      onChange={(e) => handleAssignStaff(c.id, e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg text-xs font-medium text-nexus-text"
                    >
                      <option value="">Unassigned</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Departments */}
      {activeTab === "departments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-rose-200/80 bg-white shadow-sm lg:col-span-1">
            <h2 className="text-sm font-bold text-nexus-text uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-600" />
              Add Department
            </h2>
            <form onSubmit={handleCreateDept} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-nexus-text uppercase">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clinical Healthcare"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-nexus-text text-xs font-medium focus:border-rose-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-nexus-text uppercase">Code</label>
                <input
                  type="text"
                  required
                  placeholder="HOSP"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-nexus-text text-xs font-mono uppercase focus:border-rose-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-nexus-text uppercase">Description</label>
                <textarea
                  rows={3}
                  placeholder="Services and purpose..."
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-nexus-text text-xs font-medium focus:border-rose-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
              >
                Save Department
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-rose-200/80 bg-white shadow-sm lg:col-span-2">
            <h2 className="text-sm font-bold text-nexus-text uppercase tracking-wider mb-4">Configured Departments</h2>
            <div className="space-y-3">
              {departments.map((d) => (
                <div key={d.id} className="p-4 bg-rose-50/50 rounded-xl border border-rose-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 border border-orange-200">
                      {d.code}
                    </span>
                    <span className="font-bold text-sm text-nexus-text">{d.name}</span>
                  </div>
                  <p className="text-xs text-nexus-muted font-medium">{d.description || "No description provided."}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModalQueue && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-200 bg-white max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-bold text-nexus-text text-base">QR Sign-in Pass</h3>
            <p className="text-xs text-nexus-muted font-medium">{qrModalQueue.name}</p>

            <div className="p-4 bg-white rounded-2xl shadow-md border border-rose-100 mx-auto w-fit">
              <QRCodeSVG value={`${window.location.origin}/join/${qrModalQueue.id}`} size={180} level="M" />
            </div>

            <p className="text-[11px] text-nexus-muted font-medium">
              Display or print this QR at entrance doors so visitors can join directly from their phone.
            </p>

            <button
              onClick={() => setQrModalQueue(null)}
              className="w-full py-2 bg-gradient-to-r from-rose-600 to-orange-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
