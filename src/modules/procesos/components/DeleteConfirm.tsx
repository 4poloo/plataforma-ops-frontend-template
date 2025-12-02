type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  codigo?: string;
  nombre?: string;
};

export default function DeleteConfirm({ open, onClose, onConfirm, codigo, nombre }: Props) {
  if (!open) return null;
  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Eliminar proceso</h3>
        <p className="mt-2">¿Seguro que deseas eliminar <span className="font-mono font-semibold">{codigo}</span> — {nombre}?</p>
        <div className="alert alert-warning mt-3 text-sm">
          Esta acción no registra log aún (se implementará en backend).
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-error" onClick={async () => { await onConfirm(); onClose(); }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}
