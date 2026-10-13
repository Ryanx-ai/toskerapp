import { spawn } from "node:child_process";

/** Auth travels only through stdin. Never persist or log request/response data.
 * Caller must verify the exact owned deployment before using this QA helper. */
export function protectedPost(origin: string, path: string, token: string, body: object,
  suppliedOrigin = origin): Promise<{ response: Response; networkMs: number }> {
  const cli = process.env.FP3_VERCEL_CLI;
  if (!cli || !/^https:\/\/tosker-[a-z0-9]+-pangea6\.vercel\.app$/.test(origin)
    || !["/api/location-sharing", "/api/realtime/token", "/api/live/join"].includes(path)) {
    throw new Error("Protected QA target denied.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "curl", path, "--deployment", origin, "--scope", "pangea6", "--",
      "--config", "-", "--silent", "--max-time", "20", "--include", "--write-out", "\nFP3_DURATION:%{time_total}"],
      { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; }); child.stderr.resume();
    child.on("error", () => reject(new Error("Protected QA transport unavailable.")));
    child.on("close", code => {
      try {
        if (code !== 0) throw new Error();
        const timing = output.lastIndexOf("\nFP3_DURATION:");
        const networkMs = Math.round(Number(output.slice(timing + 14)) * 1000);
        if (timing < 0 || !Number.isFinite(networkMs)) throw new Error();
        let raw = output.slice(0, timing), status = 0, headers = new Headers();
        // curl may include a proxy CONNECT or HTTP100 block before the response.
        do {
          const boundary = raw.indexOf("\r\n\r\n"); if (boundary < 0) throw new Error();
          const lines = raw.slice(0, boundary).split("\r\n");
          status = Number(lines.shift()?.split(" ")[1]); headers = new Headers();
          for (const line of lines) { const at = line.indexOf(":"); if (at > 0) headers.append(line.slice(0, at), line.slice(at + 1).trim()); }
          raw = raw.slice(boundary + 4);
        } while (raw.startsWith("HTTP/"));
        resolve({ response: new Response(raw, { status, headers }), networkMs });
      } catch { reject(new Error("Protected QA response unavailable.")); }
    });
    const field = (name: string, value: string) => `${name} = ${JSON.stringify(value)}\n`;
    child.stdin.end(field("request", "POST") + (token ? field("header", `Authorization: Bearer ${token}`) : "")
      + field("header", `Origin: ${suppliedOrigin}`) + field("header", "Content-Type: application/json") + field("data", JSON.stringify(body)));
  });
}
