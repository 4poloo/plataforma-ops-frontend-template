import { useRef, useState } from "react";
import { useFlashBanner } from "../../../global/components/FlashBanner";

const MAX_MB = 2;
const ACCEPTED = ["image/jpeg", "image/png"];

export default function CuentaAvatarUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const { showError } = useFlashBanner();

  const onPick = () => inputRef.current?.click();

  const onFile = (f?: File) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      showError("Formato inválido. Solo .jpg y .png");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      showError(`Archivo demasiado grande (máx ${MAX_MB}MB).`);
      return;
    }
    setFileName(f.name);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 rounded-full bg-gray-100 ring-2 ring-secondary/60 overflow-hidden">
          {preview ? (
            <img src={preview} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-gray-500">Preview</div>
          )}
        </div>
        <div className="text-xs text-gray-600">
          <p>Formatos: .jpg, .png — Máx {MAX_MB}MB</p>
          {fileName && <p className="mt-1">Seleccionado: <span className="font-medium">{fileName}</span></p>}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onPick} className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:text-white">
          Elegir imagen
        </button>
        <button
          type="button"
          onClick={() => { setPreview(null); setFileName(""); }}
          className="rounded-md border px-3 py-2 text-sm hover:bg-secondary hover:border-red-500 hover:text-white text-secondary "
        >
          Quitar
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
