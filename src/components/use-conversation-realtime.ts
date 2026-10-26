"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useSession } from "@clerk/nextjs";
import { useWorkspaceRealtimeOwner } from "./workspace-realtime-provider";
import { LiveSession } from "@/lib/live-session";
import { LIVE_BETA_ENABLED } from "@/lib/beta-features";
import { liveChannel, REALTIME_SIGNOUT, type LiveParticipant } from "@/lib/live-contract";
import { communicationTiming, deliveryTrace } from "@/lib/communication-performance";
import { PROFILE_CHANGED, PROFILE_REFRESH } from "@/lib/realtime-contract";
import { MAP_PING, MAP_PING_RECEIVED, MAP_PING_CLEAR, validPing } from "@/lib/maps/ping-contract";
import { LOCATION_CHANGED, LOCATION_REFRESH, LOCATION_CLEAR, LOCATION_HEALTH, LOCATION_HEALTH_REQUEST } from "@/lib/shared-location-contract";
import { TRIP_CHANGED, TRIP_REFRESH } from "@/lib/realtime-contract";
import { conversationChannel, typingChannel, userChannel, MESSAGE_CHANGED, TYPING_CHANGED, TYPING_TTL, USER_ACTIVITY, ACTIVITY_REFRESH, CHAT_REFRESH, HALL_REFRESH, CONVERSATION_ACCESS_LOST } from "@/lib/realtime-contract";

/** One workspace transport; demos never request a token or connect. */
export function useConversationRealtime(conversationId: string | undefined, userId: string | undefined) {
  const { session, isLoaded } = useSession();
  const owner = useWorkspaceRealtimeOwner();
  const sessionId = session?.id;
  // Identity/context changes must create a fresh store with no retained Join intent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const live = useMemo(() => new LiveSession(), [conversationId, userId, sessionId]);
  const [typingCount, setTypingCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const sendRef = useRef<(active: boolean) => void>(() => undefined);
  const sendTyping = useCallback((active: boolean) => sendRef.current(active), []);
  const onChange = useEffectEvent(() => { window.dispatchEvent(new Event(CHAT_REFRESH)); });
  const sessionToken = useEffectEvent(async () => {
    // Clerk's session JWT expires after one minute. Recovery can beat its
    // background cookie refresh; obtain a current token before authenticated I/O.
    const token = await session?.getToken();
    if (!token) throw new Error("Session unavailable.");
    return token;
  });
  useEffect(() => {
    if (!userId || !isLoaded || !sessionId || !owner) return;
    let disposed = false;
    const denied = () => {
      if (disposed) return;
      live.revoke();
      if (conversationId) window.dispatchEvent(new CustomEvent(CONVERSATION_ACCESS_LOST, { detail: conversationId }));
    };
    const release = owner.acquire({ userId, sessionId, conversationId, token: sessionToken, denied }, realtime => {
      setConnected(false); setTypingCount(0);
      const presence = LIVE_BETA_ENABLED && conversationId ? realtime.channels.get(liveChannel(conversationId)) : undefined;
      let observing = false;
      const unbindLive = presence && conversationId ? live.bind({
        connected: () => realtime.connection.state === "connected",
        authorize: async () => {
          const token = await sessionToken();
          const response = await fetch("/api/live/join", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ conversationId }), signal: AbortSignal.timeout(10000) });
          if ((response.status === 401 || response.status === 403) && !disposed) denied();
          if (!response.ok || disposed) throw new Error("Live join unavailable.");
        },
        observe: async changed => {
          if (!observing) { observing = true; await presence.presence.subscribe(changed); }
          await presence.attach();
        },
        unobserve: () => { observing = false; presence.presence.unsubscribe(); },
        enter: () => presence.presence.enter({ v: 1 }),
        leave: () => presence.presence.leave(),
        detach: () => presence.detach(),
        members: () => presence.presence.get(),
        profiles: async userIds => {
          const token = await sessionToken();
          const response = await fetch("/api/live/roster", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ conversationId, userIds }), signal: AbortSignal.timeout(10000) });
          if ((response.status === 401 || response.status === 403) && !disposed) {
            live.revoke();
            window.dispatchEvent(new CustomEvent(CONVERSATION_ACCESS_LOST, { detail: conversationId }));
          }
          if (!response.ok || disposed) throw new Error("Live roster unavailable.");
          return (await response.json()).participants as LiveParticipant[];
        },
        onConnection: changed => {
          const events = ["connected", "disconnected", "suspended", "failed", "closed"] as const;
          for (const event of events) realtime.connection.on(event, changed);
          return () => { for (const event of events) realtime.connection.off(event, changed); };
        },
        closeUnsafeConnection: owner.fail,
      }) : undefined;
      live.setVisible(!document.hidden);
      const channel = conversationId ? realtime.channels.get(conversationChannel(conversationId)) : undefined;
      const typing = conversationId ? realtime.channels.get(typingChannel(conversationId)) : undefined;
      const feed = realtime.channels.get(userChannel(userId));
      const locationHealth = () => {
        if (!disposed && conversationId) window.dispatchEvent(new CustomEvent(LOCATION_HEALTH, { detail: { conversationId, ready: !document.hidden && realtime.connection.state === "connected" && channel?.state === "attached" } }));
      };
      const refreshLocation = () => {
        locationHealth();
        if (!disposed && !document.hidden && conversationId) window.dispatchEvent(new CustomEvent(LOCATION_REFRESH, { detail: conversationId }));
      };
      void channel?.subscribe(LOCATION_CHANGED, refreshLocation).then(refreshLocation).catch(() => undefined);
      window.addEventListener(LOCATION_HEALTH_REQUEST, locationHealth);
      const updateHealth = () => { if (!disposed) { setConnected(realtime.connection.state === "connected" && feed.state === "attached" && (!channel || channel.state === "attached")); locationHealth(); } };
      feed.on(updateHealth); channel?.on(updateHealth);
      const refreshActivity = () => { if (!disposed) window.dispatchEvent(new Event(ACTIVITY_REFRESH)); };
      const refreshTrip = () => { if (!disposed) window.dispatchEvent(new Event(TRIP_REFRESH)); };
      void channel?.subscribe(MAP_PING, message=>{
        if(!disposed&&!document.hidden&&validPing(message.data))window.dispatchEvent(new CustomEvent(MAP_PING_RECEIVED,{detail:{conversationId,ping:message.data}}));
      }).catch(()=>undefined);
      void channel?.subscribe(TRIP_CHANGED, refreshTrip).then(refreshTrip).catch(() => undefined);
      channel?.on("attached", refreshTrip);
      void feed.subscribe(PROFILE_CHANGED, () => {
        if (disposed) return;
        refreshActivity();
        live.refresh();
        window.dispatchEvent(new Event(PROFILE_REFRESH));
        window.dispatchEvent(new Event(CHAT_REFRESH));
        window.dispatchEvent(new Event(HALL_REFRESH));
      }).catch(() => undefined);
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
      const changed = (message?: { data?: { trace?: unknown } }) => {
        if (disposed) return;
        const trace = deliveryTrace(message?.data?.trace);
        if (trace) communicationTiming("signal", { traceId: trace.id, commitToSignalMs: Date.now() - trace.committedAt, publishToSignalMs: Date.now() - trace.publishedAt });
        onChange();
      };
      void channel?.subscribe(MESSAGE_CHANGED, changed).then(() => changed()).catch(() => undefined);
      // Attachment/re-attachment closes the fetch-before-subscribe race.
      channel?.on("attached", () => changed());
      let previouslyConnected = false;
      const connectionChanged = (state: { current: string }) => {
        if (disposed) return;
        updateHealth();
        if (state.current === "connected") { changed(); refreshActivity(); window.dispatchEvent(new Event(HALL_REFRESH)); if (previouslyConnected) window.dispatchEvent(new Event(PROFILE_REFRESH)); previouslyConnected = true; }
        else { peers.clear(); updatePeers(); wasTyping = false; refreshActivity(); window.dispatchEvent(new Event(MAP_PING_CLEAR)); window.dispatchEvent(new Event(LOCATION_CLEAR)); }
      };
      realtime.connection.on(connectionChanged);
      const onVisible = () => {
        live.setVisible(!document.hidden);
        locationHealth();
        if (document.hidden) { sendRef.current(false); peers.clear(); updatePeers(); window.dispatchEvent(new Event(MAP_PING_CLEAR)); window.dispatchEvent(new Event(LOCATION_CLEAR)); }
        else { realtime.connect(); changed(); refreshActivity(); window.dispatchEvent(new Event(HALL_REFRESH)); window.dispatchEvent(new Event(PROFILE_REFRESH)); }
      };
      const onOnline = () => { realtime.connect(); changed(); refreshActivity(); window.dispatchEvent(new Event(HALL_REFRESH)); window.dispatchEvent(new Event(PROFILE_REFRESH)); };
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("online", onOnline);
      const onPageHide = () => live.setVisible(false);
      const onSignOut = () => { live.revoke(); owner.retire(); };
      const onAccessLost = (event: Event) => { if ((event as CustomEvent<string>).detail === conversationId) { live.revoke(); owner.retire(); } };
      window.addEventListener("pagehide", onPageHide);
      window.addEventListener(REALTIME_SIGNOUT, onSignOut);
      window.addEventListener(CONVERSATION_ACCESS_LOST, onAccessLost);
      return async () => {
        disposed = true;
        window.removeEventListener(LOCATION_HEALTH_REQUEST, locationHealth);
        if (conversationId) window.dispatchEvent(new CustomEvent(LOCATION_HEALTH, { detail: { conversationId, ready: false } }));
        const liveStopped = unbindLive?.();
        sendRef.current(false); sendRef.current = () => undefined;
        clearTimeout(expiry); channel?.unsubscribe(); typing?.unsubscribe(); feed.unsubscribe();
        channel?.off(); typing?.off(); feed.off();
        realtime.connection.off(connectionChanged);
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("online", onOnline);
        window.removeEventListener("pagehide", onPageHide);
        window.removeEventListener(REALTIME_SIGNOUT, onSignOut);
        window.removeEventListener(CONVERSATION_ACCESS_LOST, onAccessLost);
        await liveStopped;
        for (const attached of [presence, channel, typing, feed]) {
          if (!attached) continue;
          await attached.detach();
          realtime.channels.release(attached.name);
        }
      };
    });
    return () => { disposed = true; release(); };
  }, [conversationId, userId, sessionId, isLoaded, live, owner]);
  return { typingCount, connected, sendTyping, live };
}
