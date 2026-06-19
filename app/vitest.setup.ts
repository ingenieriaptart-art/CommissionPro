import "fake-indexeddb/auto";

// Dexie/engine consultan navigator.onLine; en node no existe → stub editable por test.
if (typeof (globalThis as { navigator?: unknown }).navigator === "undefined") {
  (globalThis as { navigator: { onLine: boolean } }).navigator = { onLine: true };
}
