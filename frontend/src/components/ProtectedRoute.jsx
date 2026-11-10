import React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../App"

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Redirect to login page and preserve requested path
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // User is logged in but lacks the required permission
    return <Navigate to="/" replace />
  }

  return children
}
