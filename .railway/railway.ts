import { defineRailway, project, service, volume } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "b2b-space";
export default defineRailway(() => {
  // Uploaded files live here — never drop this mount
  const data = volume("b2b-space-volume", { region: "europe-west4-drams3a", sizeMB: 50000 });
  const b2bSpace = service("b2b-space", {
    build: { buildCommand: "npm run build", buildEnvironment: "V3", builder: "RAILPACK" },
    start: "npx prisma migrate deploy && npx tsx prisma/seed.ts && npm run start",
    healthcheck: "/login",
    healthcheckTimeout: 120,
    volumeMounts: { "/data": data },
    replicas: { "europe-west4-drams3a": 1 },
  });

  return project("b2b-space", {
    variables: { managed: false },
    resources: [b2bSpace, data],
  });
});
