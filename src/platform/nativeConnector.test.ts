import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  info: vi.fn(),
  configure: vi.fn(),
  forget: vi.fn(),
  request: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  registerPlugin: () => mock,
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
}));
import {
  nativeOrigin,
  nativeConnectorInfo,
  configureNativeConnector,
  forgetNativeConnector,
  nativeConnectorRequest,
} from "./nativeConnector";
import {
  connectorStatus,
  pairConnector,
  readPrivateGithub,
  supportsConnector,
} from "./connector";
const status = {
  version: 1,
  githubConfigured: true,
  paired: true,
  expiresAt: "2026-10-21T13:00:00Z",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
  mock.cancel.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());
it("adresse HTTPS canonique seule ; pas de chemin, secret, requête, fragment ou repli HTTP", () => {
  expect(nativeOrigin("https://lifeos.example:8443")).toBe(
    "https://lifeos.example:8443",
  );
  for (const value of [
    "http://example.com",
    "https://example.com/",
    "https://example.com/path",
    "https://u:p@example.com",
    "https://example.com?q=x",
    "https://example.com#x",
    "https://Example.com",
    "https://example.com:443",
    "https://example.com.",
  ])
    expect(() => nativeOrigin(value)).toThrow();
});
it("réglage local lu, enregistré et oublié sans réseau ni secret JavaScript", async () => {
  mock.info.mockResolvedValue({
    origin: "https://lifeos.example",
    sessionActive: false,
  });
  mock.configure.mockResolvedValue({
    origin: "https://lifeos.example",
    sessionActive: false,
  });
  mock.forget.mockResolvedValue({ origin: "", sessionActive: false });
  await nativeConnectorInfo();
  await configureNativeConnector("https://lifeos.example");
  await forgetNativeConnector();
  expect(mock.configure).toHaveBeenCalledWith({
    origin: "https://lifeos.example",
  });
  expect(mock.request).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  await expect(
    configureNativeConnector("http://lifeos.example"),
  ).rejects.toThrow();
  expect(mock.configure).toHaveBeenCalledTimes(1);
});
it("statut et appairage passent par le pont Android sans cookie, bearer ou requête fournisseur JS", async () => {
  mock.request.mockResolvedValue({ status: 200, value: status });
  expect(supportsConnector()).toBe(true);
  expect(await connectorStatus()).toEqual(status);
  expect(await pairConnector("one-time-native-code")).toEqual(status);
  expect(mock.request.mock.calls.map(([value]) => value.path)).toEqual([
    "status",
    "pair",
  ]);
  expect(mock.request.mock.calls[1][0]).toMatchObject({
    body: '{"code":"one-time-native-code"}',
    durationMs: 18000,
  });
  expect(JSON.stringify(mock.request.mock.calls)).not.toMatch(
    /Authorization|Bearer|Cookie/,
  );
  expect(fetch).not.toHaveBeenCalled();
});
it("annulation avant et pendant le pont, sans relance", async () => {
  const before = new AbortController();
  before.abort();
  await expect(
    nativeConnectorRequest("status", undefined, before.signal, 18000),
  ).rejects.toThrow("annulée");
  expect(mock.request).not.toHaveBeenCalled();
  mock.request.mockReturnValue(new Promise(() => {}));
  const during = new AbortController();
  const promise = nativeConnectorRequest(
    "github/read",
    {},
    during.signal,
    18000,
  );
  during.abort();
  await expect(promise).rejects.toThrow("facturé");
  expect(mock.cancel).toHaveBeenCalledWith({
    id: mock.request.mock.calls[0][0].id,
  });
  expect(mock.request).toHaveBeenCalledTimes(1);
});
it("refus, erreur TLS et réponse native incompatible ne déclenchent aucun repli", async () => {
  mock.request
    .mockResolvedValueOnce({
      status: 401,
      value: { error: "Session expirée." },
    })
    .mockRejectedValueOnce(new Error("Certificat refusé."))
    .mockResolvedValueOnce({
      status: 200,
      value: { ...status, nativeSession: "forbidden" },
    });
  await expect(connectorStatus()).rejects.toThrow("Session expirée");
  await expect(connectorStatus()).rejects.toThrow("Certificat refusé");
  await expect(pairConnector("code")).rejects.toThrow("incompatible");
  expect(fetch).not.toHaveBeenCalled();
  expect(mock.request).toHaveBeenCalledTimes(3);
  await expect(
    nativeConnectorRequest("https://evil.example", {}, undefined, 18000),
  ).rejects.toThrow("refusée");
});
it("relevé strict : une réponse native pour une autre référence n’est pas conservée", async () => {
  mock.request.mockResolvedValue({
    status: 200,
    value: {
      target: { owner: "other", repo: "private", kind: "pull", number: 42 },
      check: {
        id: "check",
        checkedAt: "2026-10-21T12:00:00Z",
        kind: "pull",
        title: "Fictif",
        remoteUpdatedAt: "2026-10-21T12:00:00Z",
        state: "closed",
        merged: true,
        draft: false,
        headSha: "a".repeat(40),
      },
    },
  });
  await expect(
    readPrivateGithub({
      owner: "example",
      repo: "private",
      kind: "pull",
      number: 42,
    }),
  ).rejects.toThrow("autre lien");
});
