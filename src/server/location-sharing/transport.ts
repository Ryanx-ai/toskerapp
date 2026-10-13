import "server-only";
import { Realtime } from "ably";
import { randomUUID } from "node:crypto";

type EphemeralDispatch = { channel: string; name: string; data: unknown };

/** Request-owned transport: attach before ephemeral publish, then always close.
 * No history/rewind, retained client, listener, retry queue or payload logging. */
export async function publishEphemeralBatch(messages: EphemeralDispatch[]) {
  if (!messages.length) return;
  if (messages.length > 50 || !process.env.ABLY_API_KEY) throw new Error("Snapshot transport unavailable.");
  const client = new Realtime({ key: process.env.ABLY_API_KEY, logLevel: 0, autoConnect: false, queueMessages: false, realtimeRequestTimeout: 5000, httpRequestTimeout: 5000 });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const delivery = (async () => {
      client.connect();
      const channels = [...new Set(messages.map(message => message.channel))];
      await Promise.all(channels.map(name => client.channels.get(name).attach()));
      const results = await Promise.allSettled(messages.map(message => client.channels.get(message.channel).publish({ id: randomUUID(), name: message.name, data: message.data, extras: { ephemeral: true } })));
      if (results.some(result => result.status === "rejected")) throw new Error("Snapshot delivery unavailable.");
    })();
    await Promise.race([delivery, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Snapshot transport timed out.")), 9000); })]);
  } finally {
    clearTimeout(timer);
    client.close();
  }
}
