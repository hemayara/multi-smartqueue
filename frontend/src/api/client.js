import axios from "axios"

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api"

const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
})

// Attach Bearer token to all outgoing requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Intercept responses for auth handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and not already retrying, try to use refresh token
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes("/auth/login")) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem("refresh_token")

      if (refreshToken) {
        try {
          const res = await axios.post(`${baseURL}/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` }
          })

          if (res.data?.success && res.data?.data?.access_token) {
            const newAccessToken = res.data.data.access_token
            localStorage.setItem("access_token", newAccessToken)
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
            return apiClient(originalRequest)
          }
        } catch (refreshErr) {
          // Refresh token expired or invalid
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
          if (window.location.pathname !== "/login") {
            window.location.href = "/login"
          }
        }
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
