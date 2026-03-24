import { useState, useCallback, useEffect, useRef } from "react";
import { urlBase64ToUint8Array } from "@/lib/utils";

export function usePushNotifications(
  headers: () => Record<string, string>
) {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const sendSubscriptionToServer = useCallback(
    async (subscription: PushSubscription) => {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) {
        throw new Error(`Failed to save subscription: ${res.status}`);
      }
    },
    [headers]
  );

  const setupPush = useCallback(
    async ({ interactive = false } = {}) => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushError("Push notifications are not supported in this browser.");
        return;
      }

      if (interactive) setPushLoading(true);

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });
        registrationRef.current = registration;
        await navigator.serviceWorker.ready;

        // Listen for new service worker updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "activated" &&
              navigator.serviceWorker.controller
            ) {
              setUpdateAvailable(true);
            }
          });
        });

        // Check if the user revoked permission after we got a subscription
        if (Notification.permission === "denied") {
          setPushEnabled(false);
          setPushError(
            "Notifications are blocked. Please enable them in your browser settings."
          );
          return;
        }

        const existingSub = await registration.pushManager.getSubscription();

        // If we have an existing subscription AND permission is still granted, we're good
        if (existingSub && Notification.permission === "granted") {
          await sendSubscriptionToServer(existingSub);
          setPushEnabled(true);
          return;
        }

        // For non-interactive (initial page load), don't prompt — just show the enable button
        if (!interactive && Notification.permission !== "granted") {
          setPushError("Enable notifications to get alerts when venues open.");
          return;
        }

        // Interactive click or permission already granted: request permission and subscribe
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setPushError(
            permission === "denied"
              ? "Notifications are blocked. Please enable them in your browser settings."
              : "Enable notifications to get alerts when venues open."
          );
          setPushEnabled(false);
          return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          setPushError("VAPID public key not configured.");
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        await sendSubscriptionToServer(subscription);
        setPushError(null);
        setPushEnabled(true);
      } catch (err) {
        console.error("Push setup failed:", err);
        setPushError("Something went wrong setting up notifications.");
      } finally {
        setPushLoading(false);
      }
    },
    [sendSubscriptionToServer]
  );

  useEffect(() => {
    const timeout = setTimeout(() => setupPush({ interactive: false }), 200);
    return () => clearTimeout(timeout);
  }, [setupPush]);

  // Periodically check for SW updates (important for iOS which doesn't check reliably)
  useEffect(() => {
    const interval = setInterval(() => {
      registrationRef.current?.update();
    }, 60 * 1000); // Check every 60s
    return () => clearInterval(interval);
  }, []);

  const applyUpdate = useCallback(() => {
    window.location.reload();
  }, []);

  return { pushEnabled, pushError, pushLoading, setupPush, updateAvailable, applyUpdate };
}
