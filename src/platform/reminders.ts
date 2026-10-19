import type { LocalNotificationSchema } from "@capacitor/local-notifications";
import { isAndroid } from "./runtime";

export const dailyId = 7301;
export const testId = 7302;
const channelId = "lifeos-rendezvous";
export function dailyNotification(time: string): LocalNotificationSchema {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error("Choisissez une heure valide.");
  const [hour, minute] = time.split(":").map(Number);
  return {
    id: dailyId,
    title: "Un moment pour votre journée",
    body: "Ouvrez LifeOS pour retrouver vos priorités.",
    channelId,
    schedule: { on: { hour, minute, second: 0 }, repeats: true },
    isExactNotification: false,
    extra: { lifeos: true },
  };
}
export async function reminderStatus() {
  if (!isAndroid())
    throw new Error("Les rappels sont disponibles dans l’application Android.");
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const [permission, pending] = await Promise.all([
    LocalNotifications.checkPermissions(),
    LocalNotifications.getPending(),
  ]);
  const daily = pending.notifications.find((item) => item.id === dailyId);
  const on = daily?.schedule?.on;
  return {
    permission: permission.display,
    time:
      on && typeof on.hour === "number" && typeof on.minute === "number"
        ? `${String(on.hour).padStart(2, "0")}:${String(on.minute).padStart(2, "0")}`
        : "",
    testPending: pending.notifications.some((item) => item.id === testId),
  };
}
async function authorize() {
  if (!isAndroid())
    throw new Error("Ouvrez l’application Android pour activer un rappel.");
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const current = await LocalNotifications.checkPermissions();
  const permission =
    current.display === "granted"
      ? current
      : await LocalNotifications.requestPermissions();
  if (permission.display !== "granted")
    throw new Error(
      "Notifications refusées. Vous pouvez les autoriser dans Paramètres Android → Applications → LifeOS → Notifications.",
    );
  await LocalNotifications.createChannel({
    id: channelId,
    name: "Rendez-vous LifeOS",
    description: "Le rappel quotidien que vous choisissez.",
    importance: 3,
    visibility: 0,
    vibration: false,
  });
  return LocalNotifications;
}
export async function enableReminder(time: string) {
  const notification = dailyNotification(time);
  const LocalNotifications = await authorize();
  await LocalNotifications.schedule({ notifications: [notification] });
}
export async function testReminder() {
  const LocalNotifications = await authorize();
  const notification = dailyNotification("09:00");
  await LocalNotifications.schedule({
    notifications: [
      {
        ...notification,
        id: testId,
        title: "Votre rappel LifeOS fonctionne",
        schedule: { at: new Date(Date.now() + 60000) },
      },
    ],
  });
}
export async function disableReminders() {
  if (!isAndroid()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({
    notifications: [{ id: dailyId }, { id: testId }],
  });
  await LocalNotifications.removeDeliveredNotificationsById({
    ids: [dailyId, testId],
  });
}
