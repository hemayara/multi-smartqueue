import React, { createContext, useContext, useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import apiClient from "./api/client"
import Navbar from "./components/Navbar"
import ProtectedRoute from "./components/ProtectedRoute"

// Pages
import LandingPage from "./pages/LandingPage"
import StudentDashboard from "./pages/StudentDashboard"
import AnalyticsPage from "./pages/AnalyticsPage"
import JoinQueue from "./pages/JoinQueue"
import MyToken from "./pages/MyToken"
import StaffDashboard from "./pages/StaffDashboard"
import AdminDashboard from "./pages/AdminDashboard"
import Login from "./pages/Login"
import Register from "./pages/Register"
import NotFound from "./pages/NotFound"

export const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export default function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem("access_token") || null)
  const [loading, setLoading] = useState(true)

  // Fetch current user on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("access_token")
      if (storedToken) {
        try {
          const res = await apiClient.get("/auth/me")
          if (res.data?.success && res.data?.data?.user) {
            setUser(res.data.data.user)
          } else {
            logout()
          }
        } catch (err) {
          console.warn("Session expired or token invalid:", err?.message)
          logout()
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [token])

  const login = (userData, accessToken, refreshToken) => {
    setUser(userData)
    setToken(accessToken)
    localStorage.setItem("access_token", accessToken)
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-nexus-bg flex flex-col items-center justify-center text-nexus-muted">
        <div className="w-10 h-10 border-4 border-nexus-emerald border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold tracking-widest uppercase text-nexus-mint">
          Initializing SmartQueue Nexus...
        </p>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-nexus-bg text-nexus-text selection:bg-nexus-emerald selection:text-nexus-bg relative">
          {/* Global Ambient Grid Layer */}
          <div className="nexus-grid-overlay absolute inset-0 pointer-events-none -z-10 h-full w-full" />

          <Navbar />

          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Routes>
              {/* Public Landing & Overview */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/services" element={<StudentDashboard />} />
              <Route path="/dashboard" element={<StudentDashboard />} />
              <Route path="/analytics" element={<AnalyticsPage />} />

              {/* Queue Entry & Tracking */}
              <Route path="/join" element={<JoinQueue />} />
              <Route path="/join/:queueId" element={<JoinQueue />} />
              <Route path="/token/:tokenId" element={<MyToken />} />

              {/* Auth Routes */}
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
              <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />

              {/* Staff Routes */}
              <Route
                path="/staff"
                element={
                  <ProtectedRoute allowedRoles={["staff", "admin"]}>
                    <StaffDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
