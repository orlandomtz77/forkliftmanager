import Link from "next/link";

export default function EquipmentNotFound() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Equipo no encontrado</h1>
      <p className="text-sm text-slate-600">
        El equipo no existe o no tienes acceso a él.
      </p>
      <Link href="/equipment" className="text-sm underline">
        Volver a equipos
      </Link>
    </div>
  );
}
