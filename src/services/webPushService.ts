import axios from "axios";
import { api } from "@/lib/api";

export interface BrowserPushStatus {
  supported: boolean;
  configured: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
}

const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim();

function browserSupportsPush() {
  return typeof window !== "undefined"
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window;
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value + "=".repeat((4 - value.length % 4) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToBase64(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function getBrowserPushStatus(): Promise<BrowserPushStatus> {
  const supported = browserSupportsPush();
  if (!supported) {
    return { supported: false, configured: Boolean(vapidPublicKey), permission: "unsupported", subscribed: false };
  }
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  return {
    supported: true,
    configured: Boolean(vapidPublicKey),
    permission: Notification.permission,
    subscribed: Boolean(subscription),
  };
}

export async function enableBrowserPush(permissionRequest?: Promise<NotificationPermission>) {
  if (!browserSupportsPush()) throw new Error("This browser does not support web push notifications.");
  if (!vapidPublicKey) throw new Error("Browser push is not configured. Set VITE_WEB_PUSH_PUBLIC_KEY and rebuild the web app.");
  if (Notification.permission === "denied") throw new Error("Notifications are blocked for this site. Allow them in your browser site settings, then try again.");

  let permission = permissionRequest ? await permissionRequest : Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Allow notifications in the browser prompt to enable browser alerts.");

  const existingRegistration = await navigator.serviceWorker.getRegistration("/");
  const registration = existingRegistration ?? await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(vapidPublicKey),
    });
  }

  const p256dh = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");
  if (!p256dh || !auth) throw new Error("The browser did not provide the encryption keys required by the push service.");

  const { data } = await api.post<{ success: boolean; created: boolean; device_id: number }>("/users/auth/device/register/", {
    registration_id: subscription.endpoint,
    type: "web",
    name: "Fudz Hub web browser",
    p256dh: bytesToBase64(p256dh),
    auth: bytesToBase64(auth),
  });
  return data;
}

export async function disableBrowserPush() {
  if (!browserSupportsPush()) return { success: true, unsubscribed: false };
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return { success: true, unsubscribed: false };

  try {
    await api.delete("/users/auth/device/unregister/", { data: { registration_id: subscription.endpoint } });
  } catch (error) {
    // A local subscription can outlive a server-side device row; clean it up in either case.
    if (!(axios.isAxiosError(error) && error.response?.status === 404)) throw error;
  }
  await subscription.unsubscribe();
  return { success: true, unsubscribed: true };
}
