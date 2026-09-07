"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { conversationChannel, typingChannel, userChannel, MESSAGE_CHANGED, TYPING_CHANGED, TYPING_TTL, USER_ACTIVITY, ACTIVITY_REFRESH, CHAT_REFRESH, HALL_REFRESH } from "@/lib/realtime-contract";

/** One workspace transport; demos never request a token or connect. */
export function useConversationRealtime(conversationId: string | undefined, userId: string | undefined) {
  const [typingCount, setTypingCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const sendRef = useRef<(active: boolean) => void>(() => undefined);
  const sendTyping = useCallback((active: boolean) => sendRef.current(active), []);
  const onChange = useEffectEvent(() => { window.dispatchEvent(new Event(CHAT_REFRESH)); });
  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    let close: (() => void) | undefined;
    void import("ably/modular").then(({ BaseRealtime, WebSocketTransport, FetchRequest }) => {
      if (disposed) return;
      setConnected(false); setTypingCount(0);
      const realtime = new BaseRealtime({
        plugins: { WebSocketTransport, FetchRequest },
        logLevel: 0,
        queueMessages: false,
        authCallback: async (_params, callback) => {
          try {
            const response = await fetch("/api/realtime/token", {
              method: "POST", credentials: "same-origin", cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversationId }), signal: AbortSignal.timeout(10000),
            });
            if (!response.ok || disposed) throw new Error("Realtime authorization unavailable.");
            callback(null, await response.json());
          } catch { callback("Realtime authorization unavailable.", null); }
        },
      });
      const channel = conversationId ? realtime.channels.get(conversationChannel(conversationId)) : undefined;
      const typing = conversationId ? realtime.channels.get(typingChannel(conversationId)) : undefined;
      const feed = realtime.channels.get(userChannel(userId));
      const updateHealth = () => { if (!disposed) setConnected(realtime.connection.state === "connected" && feed.state === "attached" && (!channel || channel.state === "attached")); };
      feed.on(updateHealth); channel?.on(updateHealth);
      const refreshActivity = () => { if (!disposed) window.dispatchEvent(new Event(ACTIVITY_REFRESH)); };
      void feed.subscribe(USER_ACTIVITY, (message) => {
        refreshActivity();
        if (!disposed && message.data?.conversationId === conversationId) {
          window.dispatchEvent(new Event(message.data.surface === "hall" ? HALL_REFRESH : CHAT_REFRESH));
        }
      }).then(refreshActivity).catch(() => undefined);
      const peers = new Map<string, number>();
      let expiry: ReturnType<typeof setTimeout> | undefined;
      let lastSent = 0, wasTyping = false;
      const updatePeers = () => {
        clearTimeout(expiry);
        for (const [id, until] of peers) if (until <= Date.now()) peers.delete(id);
        if (!disposed) setTypingCount(peers.size);
        if (peers.size) expiry = setTimeout(updatePeers, Math.max(1, Math.min(...peers.values()) - Date.now()));
      };
      sendRef.current = (active) => {
        if (realtime.connection.state !== "connected" || typing?.state !== "attached") return;
        if (active && wasTyping && Date.now() - lastSent < 2000) return;
        if (!active && !wasTyping) return;
        lastSent = Date.now(); wasTyping = active;
        void typing.publish({ name: TYPING_CHANGED, data: { active }, extras: { ephemeral: true } }).catch(() => undefined);
      };
      void typing?.subscribe(TYPING_CHANGED, (message) => {
        // The provider fixes clientId to the token's actor; payload cannot forge it.
        if (disposed || !message.clientId || message.clientId === userId || document.hidden) return;
        if (typeof message.data?.active !== "boolean" || !message.timestamp || Date.now() - message.timestamp > TYPING_TTL) return;
        if (message.data.active && peers.size < 20) peers.set(message.clientId, message.timestamp + TYPING_TTL);
        else peers.delete(message.clientId);
        updatePeers();
      }).catch(() => undefined);
      const changed = () => { if (!disposed) onChange(); };
      void channel?.subscribe(MESSAGE_CHANGED, changed).then(changed).catch(() => undefined);
      // Attachment/re-attachment closes the fetch-before-subscribe race.
      channel?.on("attached", changed);
      realtime.connection.on((state) => {
        if (disposed) return;
        updateHealth();
        if (state.current === "connected") { changed(); refreshActivity(); window.dispatchEvent(new Event(HALL_REFRESH)); }
        else { peers.clear(); updatePeers(); wasTyping = false; }
      });
      const onVisible = () => {
        if (document.hidden) { sendRef.current(false); peers.clear(); updatePeers(); }
        else { realtime.connect(); changed(); refreshActivity(); window.dispatchEvent(new Event(HALL_REFRESH)); }
      };
      const onOnline = () => { realtime.connect(); changed(); refreshActivity(); window.dispatchEvent(new Event(HALL_REFRESH)); };
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("online", onOnline);
      close = () => {
        sendRef.current(false); sendRef.current = () => undefined;
        clearTimeout(expiry); channel?.unsubscribe(); typing?.unsubscribe(); feed.unsubscribe(); realtime.close();
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("online", onOnline);
      };
    }).catch(() => undefined);
    return () => { disposed = true; close?.(); };
  }, [conversationId, userId]);
  return { typingCount, connected, sendTyping };
}
