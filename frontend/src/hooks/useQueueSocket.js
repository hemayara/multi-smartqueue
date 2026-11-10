import { useEffect, useRef, useState, useCallback } from "react"
import { io } from "socket.io-client"

export function useQueueSocket(queueId, onEventCallback) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)

  // Audio notification chime when token called
  const playChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.6)
    } catch (e) {
      // AudioContext blocked or unavailable
    }
  }, [])

  useEffect(() => {
    if (!queueId) return

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin
    const token = localStorage.getItem("access_token")

    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      setConnected(true)
      // Join the queue room
      socket.emit("join_queue_room", { queue_id: queueId })
      // Request authoritative state sync on connect / reconnect
      socket.emit("request_queue_state", { queue_id: queueId })
    })

    socket.on("disconnect", () => {
      setConnected(false)
    })

    // Listen for queue updates
    const handleEvent = (eventName) => (data) => {
      if (eventName === "token:called") {
        playChime()
      }
      if (onEventCallback) {
        onEventCallback(eventName, data)
      }
    }

    const eventNames = [
      "queue_state_sync",
      "queue:updated",
      "token:created",
      "token:called",
      "token:serving",
      "token:completed",
      "token:cancelled",
      "token:skipped",
      "queue:paused",
      "queue:resumed",
      "counter:updated",
    ]

    eventNames.forEach((ev) => {
      socket.on(ev, handleEvent(ev))
    })

    return () => {
      socket.emit("leave_queue_room", { queue_id: queueId })
      socket.disconnect()
    }
  }, [queueId, onEventCallback, playChime])

  const requestSync = useCallback(() => {
    if (socketRef.current && socketRef.current.connected && queueId) {
      socketRef.current.emit("request_queue_state", { queue_id: queueId })
    }
  }, [queueId])

  return { connected, requestSync }
}
