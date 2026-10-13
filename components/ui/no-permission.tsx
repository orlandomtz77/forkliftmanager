import Link from "next/link";

export function NoPermission({ backHref }: { backHref: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p className="font-medium">No tienes permiso para realizar esta acción.</p>
      <Link href={backHref} className="mt-2 inline-block underline">
        Volver
      </Link>
    </div>
  );
}
