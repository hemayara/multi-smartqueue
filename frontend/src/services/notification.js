import apiClient from "../api/client"

class NotificationClient {
  constructor() {
    this.isSupported = "Notification" in window
    this.permission = this.isSupported ? Notification.permission : "denied"
  }

  async requestPermission() {
    if (!this.isSupported) {
      console.warn("Desktop notifications not supported in this browser.")
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      this.permission = permission

      if (permission === "granted") {
        this.showLocalNotification("SmartQueue Notifications Enabled", {
          body: "You will receive timely alerts when your turn is called.",
          icon: "/favicon.svg",
        })
        return true
      }
      return false
    } catch (err) {
      console.error("Error requesting notification permission:", err)
      return false
    }
  }

  showLocalNotification(title, options = {}) {
    if (this.isSupported && Notification.permission === "granted") {
      try {
        new Notification(title, {
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          ...options,
        })
      } catch (e) {
        console.warn("Failed to trigger local notification:", e)
      }
    }
  }

  async registerDeviceToken(fcmToken) {
    if (!fcmToken) return false
    try {
      await apiClient.post("/auth/fcm-token", { fcm_token: fcmToken })
      return true
    } catch (err) {
      console.warn("Failed to register device token with backend:", err)
      return false
    }
  }
}

export const notificationService = new NotificationClient()
export default notificationService
