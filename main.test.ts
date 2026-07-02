import { assertEquals } from "https://deno.land/std@0.213.0/testing/asserts.ts";
import { buildCoreGsuiteToolsUrl, buildWorkerHeaders } from "./main.ts";

Deno.test("buildCoreGsuiteToolsUrl normalizes slashes", () => {
  assertEquals(
    buildCoreGsuiteToolsUrl("https://core-gsuite-tools.hacolby.workers.dev/", "/api/health"),
    "https://core-gsuite-tools.hacolby.workers.dev/api/health",
  );
});

Deno.test("buildWorkerHeaders defaults to bearer auth", () => {
  assertEquals(buildWorkerHeaders("secret"), { Authorization: "Bearer secret" });
});

Deno.test("buildWorkerHeaders supports custom header names", () => {
  assertEquals(buildWorkerHeaders("secret", "X-Worker-Key"), { "X-Worker-Key": "secret" });
});
