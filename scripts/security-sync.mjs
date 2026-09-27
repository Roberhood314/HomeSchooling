import fs from "node:fs";

const routePath = new URL("../app/api/sync/route.ts", import.meta.url);
const source = fs.readFileSync(routePath, "utf8");

const checks = [
  {
    name: "sync authenticates parent",
    ok: /authenticatedParentId\(req\)/.test(source),
  },
  {
    name: "sync verifies child ownership",
    ok: /SELECT id FROM child_profiles WHERE id=\$1 AND parent_id=\$2/.test(source),
  },
  {
    name: "progress write uses verified top-level childId",
    ok: /\[childId,p\.lessonId,/.test(source),
  },
  {
    name: "payload childId mismatch is rejected",
    ok: /progress event childId mismatch/.test(source),
  },
  {
    name: "progress write does not trust payload childId",
    ok: !/\[p\.childId,p\.lessonId,/.test(source),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} - ${check.name}`);
}

if (failed.length) {
  console.error(`Security regression: ${failed.length} sync ownership check(s) failed.`);
  process.exit(1);
}
