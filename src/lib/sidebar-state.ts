"use client";
const key = "tosker.sidebar.collapsed";
/** Local geometry only, never an authorization or conversation-data cache. */
export const collapseStore = {
  subscribe(listener: () => void) {
    window.addEventListener("tosker:sidebar",listener); window.addEventListener("storage",listener);
    return () => { window.removeEventListener("tosker:sidebar",listener); window.removeEventListener("storage",listener); };
  },
  getSnapshot() { return window.localStorage.getItem(key) === "true"; },
  getServerSnapshot() { return false; },
  toggle() { window.localStorage.setItem(key,String(!collapseStore.getSnapshot())); window.dispatchEvent(new Event("tosker:sidebar")); },
};
