import "server-only";
import { db } from "./db";

/** Admin-managed lists for employees (Category kind POSITION / DEPARTMENT). */
export type PeopleLists = { positions: { id: string; name: string }[]; departments: { id: string; name: string }[] };

export async function getPeopleLists(): Promise<PeopleLists> {
  const rows = await db.category.findMany({
    where: { kind: { in: ["POSITION", "DEPARTMENT"] }, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, kind: true },
  });
  return {
    positions: rows.filter((r) => r.kind === "POSITION").map(({ id, name }) => ({ id, name })),
    departments: rows.filter((r) => r.kind === "DEPARTMENT").map(({ id, name }) => ({ id, name })),
  };
}

/**
 * Reads positionId / departmentId from a form and keeps them only when they point at an
 * active list entry of the right kind ("" = not specified). Returns null for a forged value.
 */
export async function readPeopleFields(formData: FormData) {
  const positionId = String(formData.get("positionId") ?? "") || null;
  const departmentId = String(formData.get("departmentId") ?? "") || null;
  const ids = [positionId, departmentId].filter(Boolean) as string[];
  if (ids.length) {
    const found = await db.category.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, kind: true } });
    const ok = (id: string | null, kind: string) => !id || found.some((f) => f.id === id && f.kind === kind);
    if (!ok(positionId, "POSITION") || !ok(departmentId, "DEPARTMENT")) return null;
  }
  return { positionId, departmentId };
}
