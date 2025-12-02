type Props = {
  onBuscar: () => void;
  onCrear: () => void;
  onCarga: () => void;
  canCreate?: boolean;
  canCarga?: boolean;
};

export default function RightActions({
  onBuscar,
  onCrear,
  onCarga,
  canCreate = true,
  canCarga = true,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onBuscar} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-100 hover:border-warning">
        Buscar
      </button>
      <button
        onClick={onCrear}
        disabled={!canCreate}
        className={`rounded-xl px-3 py-2 text-sm text-white ${
          canCreate
            ? "bg-primary hover:bg-success"
            : "bg-gray-400 cursor-not-allowed"
        }`}
        title={canCreate ? "Crear producto" : "Sin permisos para crear"}
      >
        Agregar
      </button>
      <button
        onClick={onCarga}
        disabled={!canCarga}
        className={`rounded-xl px-3 py-2 text-sm text-white ${
          canCarga
            ? "bg-primary hover:bg-success"
            : "bg-gray-400 cursor-not-allowed"
        }`}
        title={canCarga ? "Importar productos" : "Sin permisos para importar"}
      >
        Carga masiva
      </button>
    </div>
  );

}
