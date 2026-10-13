import Link from "next/link";

export default function WorkOrderNotFound() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Orden no encontrada</h1>
      <p className="text-sm text-slate-600">
        La orden de trabajo no existe o no tienes acceso a ella.
      </p>
      <Link href="/work-orders" className="text-sm underline">
        Volver a órdenes de trabajo
      </Link>
    </div>
  );
}
