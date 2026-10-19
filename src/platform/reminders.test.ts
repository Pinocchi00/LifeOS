import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  dailyId,
  dailyNotification,
  disableReminders,
  enableReminder,
  reminderStatus,
  testId,
  testReminder,
} from "./reminders";
const mocks = vi.hoisted(() => ({
  android: true,
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  createChannel: vi.fn(),
  schedule: vi.fn(),
  getPending: vi.fn(),
  cancel: vi.fn(),
  removeDeliveredNotificationsById: vi.fn(),
}));
vi.mock("./runtime", () => ({ isAndroid: () => mocks.android }));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: mocks,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.android = true;
  mocks.checkPermissions.mockResolvedValue({ display: "prompt" });
  mocks.requestPermissions.mockResolvedValue({ display: "granted" });
  mocks.getPending.mockResolvedValue({ notifications: [] });
});
describe("rappels Android explicites", () => {
  it("n’attend jamais le Proxy natif lui-même comme une promesse", async () => {
    Object.defineProperty(mocks, "then", {
      configurable: true,
      get() {
        throw new Error(
          "Le Proxy natif ne doit pas être assimilé à une promesse.",
        );
      },
    });
    try {
      await enableReminder("09:00");
      expect(mocks.schedule).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.deleteProperty(mocks, "then");
    }
  });
  it("conserve uniquement une heure valide et un texte général, sans alarme exacte", () => {
    expect(() => dailyNotification("24:00")).toThrow();
    expect(() => dailyNotification("9:30")).toThrow();
    expect(dailyNotification("00:05")).toMatchObject({
      id: dailyId,
      isExactNotification: false,
      schedule: { on: { hour: 0, minute: 5, second: 0 }, repeats: true },
    });
  });
  it("consulter ne demande aucune permission et lit l’état du système", async () => {
    mocks.getPending.mockResolvedValue({
      notifications: [dailyNotification("18:45"), { id: testId }],
    });
    expect(await reminderStatus()).toMatchObject({
      time: "18:45",
      testPending: true,
    });
    expect(mocks.requestPermissions).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it("un refus ne crée ni canal ni rappel et conserve les rappels précédents", async () => {
    mocks.requestPermissions.mockResolvedValue({ display: "denied" });
    await expect(enableReminder("09:00")).rejects.toThrow(
      "Notifications refusées",
    );
    expect(mocks.createChannel).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it("un consentement existant n’est pas redemandé ; remplacer garde le même identifiant", async () => {
    mocks.checkPermissions.mockResolvedValue({ display: "granted" });
    await enableReminder("17:35");
    expect(mocks.requestPermissions).not.toHaveBeenCalled();
    expect(mocks.schedule).toHaveBeenCalledWith({
      notifications: [dailyNotification("17:35")],
    });
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
  it("l’essai est ponctuel et l’arrêt ne vise que nos deux notifications", async () => {
    await testReminder();
    const notification = mocks.schedule.mock.calls[0][0].notifications[0];
    expect(notification.id).toBe(testId);
    expect(notification.schedule.at.getTime()).toBeGreaterThan(
      Date.now() + 59000,
    );
    expect(notification.schedule.repeats).toBeUndefined();
    await disableReminders();
    expect(mocks.cancel).toHaveBeenCalledWith({
      notifications: [{ id: dailyId }, { id: testId }],
    });
    expect(mocks.removeDeliveredNotificationsById).toHaveBeenCalledWith({
      ids: [dailyId, testId],
    });
  });
  it("le navigateur ne propose ni permission ni programmation native", async () => {
    mocks.android = false;
    await expect(enableReminder("09:00")).rejects.toThrow("Android");
    await disableReminders();
    expect(mocks.requestPermissions).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
});
