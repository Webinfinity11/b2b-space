import { ka } from "@/i18n/ka";
import { logoutAction } from "@/actions/auth";

export function UserMenu({ name, sub }: { name: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-sm font-medium leading-tight text-ink">{name}</div>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
      <div aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#B8D9F1] to-[#5A7F9D] text-sm font-bold text-navy">
        {name.slice(0, 1)}
      </div>
      <form action={logoutAction}>
        <button type="submit" className="h-9 rounded-lg px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink">
          {ka.nav.logout}
        </button>
      </form>
    </div>
  );
}
