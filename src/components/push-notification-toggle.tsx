"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeToPush, unsubscribeFromPush, getPushSubscriptionStatus } from "@/actions/push";

// Converte a chave pública VAPID (base64url) pro formato Uint8Array que a
// Push API espera.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type Status = "checking" | "unsupported" | "subscribed" | "unsubscribed";

export function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function check() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setStatus("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const existing = await reg.pushManager.getSubscription();
        if (existing && Notification.permission === "granted") {
          const { subscribed } = await getPushSubscriptionStatus(existing.endpoint);
          setStatus(subscribed ? "subscribed" : "unsubscribed");
        } else {
          setStatus("unsubscribed");
        }
      } catch {
        setStatus("unsupported");
      }
    }
    check();
  }, []);

  async function activate() {
    setBusy(true);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setStatus("unsupported");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = sub.toJSON();
      await subscribeToPush({ endpoint: json.endpoint, keys: json.keys });
      setStatus("subscribed");
    } catch (err) {
      console.error("erro ao ativar notificações", err);
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch (err) {
      console.error("erro ao desativar notificações", err);
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;
  if (status === "unsupported") return null;

  if (status === "subscribed") {
    return (
      <Button variant="outline" size="sm" onClick={deactivate} disabled={busy} className="gap-2">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5 text-emerald-600" />}
        Notificações ativas
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={activate} disabled={busy} className="gap-2">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
      Ativar notificações
    </Button>
  );
}
