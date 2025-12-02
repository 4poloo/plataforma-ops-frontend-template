type Props = {
  page: number;
  pages: number;
  onPageChange?: (p: number) => void;
};

// Botonera igual a la de "procesos" que compartiste (hover, primary/secondary).
function renderPageTabs(page: number, pages: number, onPageChange?: (p:number)=>void) {
  const tabs = [];
  for (let i = 1; i <= pages; i++) {
    tabs.push(
      <button
        key={i}
        onClick={() => onPageChange?.(i)}
        className={`rounded-md border px-3 py-1 text-sm ${i === page ? "bg-primary text-white" : "hover:bg-primary hover:text-white"}`}
      >
        {i}
      </button>
    );
  }
  return <div className="flex items-center gap-2">{tabs}</div>;
}

export default function UsuariosPaginacion({ page, pages, onPageChange }: Props) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        disabled={page <= 1}
        className="rounded-md border px-3 py-1 text-sm disabled:opacity-50 hover:bg-primary hover:border-secondary hover:text-white"
        onClick={() => onPageChange?.(page - 1)}
      >
        Anterior
      </button>
      {renderPageTabs(page, pages, onPageChange)}
      <button
        disabled={page >= pages}
        className="rounded-md border px-3 py-1 text-sm disabled:opacity-50 hover:bg-primary hover:border-secondary hover:text-white"
        onClick={() => onPageChange?.(page + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}
