export default function ImportPreviewTable({ columns, rows }: { columns: string[]; rows: Array<Record<string, any>> }) {
  if (!rows || rows.length === 0) {
    return <div className="p-6 text-center text-gray-500">Sube un archivo para previsualizar.</div>;
  }
  return (
    <table className="min-w-full border-separate border-spacing-0">
      <thead className="bg-gray-50">
        <tr>
          {columns.map((h) => (
            <th key={h} className="sticky top-0 z-10 border-b px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, 50).map((r, idx) => (
          <tr key={idx} className="hover:bg-gray-50">
            {columns.map((c) => (
              <td key={c} className="border-b px-3 py-2 text-sm">{String(r[c] ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
