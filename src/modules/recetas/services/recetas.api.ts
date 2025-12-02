// src/modules/recetas/services/recetas.api.ts
import type {
  RecetaDetalleDTO,
  RecetaListadoDTO,
  MaterialLinea,
} from '../models/receta.model';

/* ============================================================================
   BASE URL ROBUSTA
   - Si VITE_API_BASE_URL viene vacío, usamos /api (proxy de Vite).
   - Si viene sin /api, lo agregamos.
   - Sin barras dobles al final.
============================================================================ */
const RAW = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
const API_ROOT = RAW || ''; // permite usar proxy del devserver si tienes /api proxied
const API = API_ROOT === '' || API_ROOT.endsWith('/api') ? (API_ROOT || '/api') : `${API_ROOT}/api`;
const R = `${API}/v1/recipes`;
const P = `${API}/v1/products`;

/* -------------------- utils -------------------- */
function q(params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}
const isObjectId = (s: string) => /^[0-9a-fA-F]{24}$/.test(s);
const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`HTTP ${r.status} → ${url}${body ? `\n${body}` : ''}`);
  }
  return r.json();
}

/* -------------------- mapeos Back → Front -------------------- */
async function mapListado(doc: any, productCache?: Map<string, any>): Promise<RecetaListadoDTO> {
  const productId =
    doc.productPTId ?? doc.productId ?? doc.product_id ?? doc.product ?? '';
  let sku = doc.skuPT ?? doc.sku ?? doc.codigo ?? '';
  let nombre = doc.nombre ?? doc.descripcion ?? doc.name ?? '';

  if ((!sku || isObjectId(String(sku))) && productId && isObjectId(String(productId))) {
    try {
      let prod: any;
      if (productCache?.has(productId)) {
        prod = productCache.get(productId);
      } else {
        prod = await fetchJson<any>(`${P}/${productId}`);
        productCache?.set(productId, prod);
      }
      const skuFromProd = prod?.skuPT ?? prod?.sku ?? prod?.codigo ?? '';
      if (skuFromProd) sku = String(skuFromProd);
      if (!nombre && typeof prod?.nombre === 'string') {
        nombre = prod.nombre;
      } else if (!nombre && typeof prod?.descripcion === 'string') {
        nombre = prod.descripcion;
      }
    } catch {
      // seguimos con lo disponible
    }
  }

  const vigenteVersion = doc.vigenteVersion ?? null;
  const versiones: any[] = Array.isArray(doc.versiones) ? doc.versiones : [];
  const lastVersion =
    versiones
      .map((v) => Number(v?.version ?? 0))
      .filter(Number.isFinite)
      .sort((a, b) => b - a)[0] ?? 1;

  return {
    id: sku || (productId ?? ''), // preferimos SKU; si no hay, usamos productPTId
    codigo: sku || (productId ?? ''),
    descripcion: nombre || '(sin nombre)',
    version: vigenteVersion ?? lastVersion,
    vigente: vigenteVersion != null,
    habilitada: vigenteVersion != null, // aproximación (vigenteVersion seteado)
    actualizadoEn: doc.audit?.updatedAt ?? doc.audit?.createdAt ?? '',
    actualizadoPor: doc.audit?.updatedBy ?? '',
  };
}

/* ============================================================================
   API PUBLICA
============================================================================ */
export const recetasApi = {
  /** Listado simple usando /recipes/by-mixed (name/sku + paginación). */
  async search(query: {
    codigo?: string;        // (no usado por back)
    descripcion?: string;   // mapea a q=
    habilitada?: boolean;   // filtramos en cliente
    page?: number;
    limit?: number;
  }) {
    const { descripcion = '', codigo = '', page = 1, limit = 15 } = query;
    const skip = (page - 1) * limit;

    const searchParams = {
      limit,
      skip,
      name: descripcion.trim() || undefined,
      sku: codigo.trim() || undefined,
    };

    const url = `${R}/by-mixed/${q(searchParams)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Error listando recetas (${res.status}): ${body || url}`);
    }
    const payload = await res.json();
    const headerTotalRaw = res.headers.get('X-Total-Count') ?? res.headers.get('x-total-count');
    const headerTotal = headerTotalRaw ? Number(headerTotalRaw) : undefined;

    let data: any[] = [];
    let bodyTotal: number | undefined;

    if (Array.isArray(payload)) {
      data = payload;
    } else if (payload && typeof payload === 'object') {
      if (Array.isArray(payload.items)) {
        data = payload.items;
      } else if (Array.isArray(payload.results)) {
        data = payload.results;
      } else if (Array.isArray(payload.data)) {
        data = payload.data;
      } else {
        data = [];
      }
      const totals = [
        (payload as any).total,
        (payload as any).count,
        (payload as any).totalItems,
        (payload as any).total_count,
      ].find((val) => typeof val === 'number');
      if (typeof totals === 'number') {
        bodyTotal = totals;
      }
    }

    const guessedTotal =
      headerTotal ??
      bodyTotal ??
      (data.length === limit ? skip + data.length + 1 : skip + data.length);
    const productCache = new Map<string, any>();
    let items = await Promise.all(data.map((doc) => mapListado(doc, productCache)));

    if (query.habilitada !== undefined) {
      items = items.filter((r) => r.habilitada === query.habilitada);
    }

    return { items, total: guessedTotal, page, limit };
  },

  /** Búsqueda directa por código PT/SKU con coincidencia exacta. */
  async searchByPtId(ptId: string): Promise<RecetaListadoDTO[]> {
    const normalized = (ptId ?? '').trim();
    if (!normalized) return [];

    const url = `${R}/by-pt-id/${encodeURIComponent(normalized)}`;
    const res = await fetch(url);
    if (res.status === 404) {
      return [];
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Error buscando receta por código ${normalized} (${res.status}): ${body || url}`
      );
    }

    const payload = await res.json();
    let rows: any[] = [];

    if (Array.isArray(payload)) {
      rows = payload;
    } else if (payload && typeof payload === 'object') {
      if (Array.isArray((payload as any).items)) {
        rows = (payload as any).items;
      } else if (Array.isArray((payload as any).results)) {
        rows = (payload as any).results;
      } else if (Array.isArray((payload as any).data)) {
        rows = (payload as any).data;
      } else {
        rows = [payload];
      }
    } else {
      rows = [];
    }

    const productCache = new Map<string, any>();
    return Promise.all(rows.map((doc) => mapListado(doc, productCache)));
  },

  /** Detalle: si `id` parece ObjectId → busca por productPTId (by-mixed/). Si no, trata como SKU.
   *  Enriquecemos componentes con /products/{productId} para obtener sku/nombre/unidad.
   */
  async getById(id: string): Promise<RecetaDetalleDTO> {
    // 1) Traer el documento base (por SKU o por productPTId)
    let base: any | null = null;

    if (isObjectId(id)) {
      const qs = q({ productPTId: id, limit: 1, skip: 0 });
      const url = `${R}/by-mixed/${qs}`;
      const arr = await fetchJson<any[]>(url);
      base = Array.isArray(arr) ? arr[0] : null;
    } else {
      base = await fetchJson<any>(`${R}/${encodeURIComponent(id)}`);
    }

    if (!base) throw new Error('Receta no encontrada');

    // 2) Determinar versión activa (vigente o la última)
    let skuPT = base.skuPT ?? base.sku ?? base.codigo ?? '';
    let nombrePT = base.nombre ?? base.descripcion ?? base.name ?? '';
    const productIdRaw = base.productPTId ?? base.productId ?? base.product_id ?? base.product ?? '';
    const productId = productIdRaw ? String(productIdRaw) : '';
    const vigenteVersion = base.vigenteVersion ?? null;
    const versiones: any[] = Array.isArray(base.versiones) ? base.versiones : [];

    const versionActivo =
      versiones.find(v => Number(v?.version) === Number(vigenteVersion)) ??
      versiones.slice().sort((a, b) => num(b?.version) - num(a?.version))[0] ??
      {};

    const compRaw: any[] = Array.isArray(versionActivo?.componentes) ? versionActivo.componentes : [];
    const unidadPTRaw = versionActivo?.unidad_PT;
    const unidadBase = unidadPTRaw == null ? '' : String(unidadPTRaw);

    // 3) Enriquecer componentes por productId → /v1/products/{productId}
    const materiales: MaterialLinea[] = await Promise.all(
      compRaw.map(async (c: any): Promise<MaterialLinea> => {
        const cantidad = num(c.cantidadPorBase ?? c.cantidad, 0);
        const mermaPct = num(c.merma_pct, 0);
        let sku = (c.sku ?? '').toString();
        let descripcion = (c.descripcion ?? '').toString();
        let unidad = (c.unidad ?? '').toString();

        // si falta info, intentamos resolver por productId
        const pid = c.productId;
        if (isObjectId(String(pid))) {
          try {
            const p = await fetchJson<any>(`${P}/${pid}`);
            // campos estrictos: nombre / unidad
            if (!sku && typeof p?.sku === 'string') sku = p.sku;
            if (!descripcion && typeof p?.nombre === 'string') descripcion = p.nombre;
            if (!unidad && typeof p?.unidad === 'string') unidad = p.unidad;
          } catch {
            // si falla, seguimos con lo que haya
          }
        }

        return {
          sku,
          descripcion,
          unidad,
          cantidad,
          mermaPct,
        };
      })
    );

    // 3.5) Resolver SKU efectivo si lo que tenemos parece ObjectId
    let codigoEff = (skuPT || productId || '').toString();
    if (isObjectId(codigoEff) && productId) {
      try {
        const pd = await fetchJson<any>(`${P}/${productId}`);
        const skuFromProd = pd?.skuPT ?? pd?.sku ?? pd?.codigo ?? '';
        if (skuFromProd) {
          codigoEff = String(skuFromProd);
        }
        if (!skuPT && skuFromProd) {
          skuPT = String(skuFromProd);
        }
        if (!nombrePT && typeof pd?.nombre === 'string') {
          nombrePT = pd.nombre;
        } else if (!nombrePT && typeof pd?.descripcion === 'string') {
          nombrePT = pd.descripcion;
        }
      } catch {
        // si falla, dejamos el valor como vino
      }
    }

    // 4) Armar DTO final usando el SKU efectivo
    const dto: RecetaDetalleDTO = {
      id: codigoEff || productId,
      codigo: codigoEff || productId,
      descripcion: nombrePT || '(sin nombre)',
      version: num(versionActivo?.version, 1),
      vigente: vigenteVersion != null && num(versionActivo?.version) === num(vigenteVersion),
      habilitada: vigenteVersion != null,
      cantidadBase: num(versionActivo?.base_qty, 1),
      unidadBase,
      materiales,
      auditoria: {
        creadoPor: base.audit?.createdBy ?? '',
        creadoEn: base.audit?.createdAt ?? '',
        modPor: base.audit?.updatedBy ?? '',
        modEn: base.audit?.updatedAt ?? '',
      },
    };

    return dto;
  },

  /** Historial derivado (placeholder simple). Mejora cuando el back exponga historial real. */
  async getHistory(id: string): Promise<Array<{ version: number; fecha: string; usuario: string; notas?: string }>> {
    const doc = await this.getById(id);
    return [
      {
        version: doc.version,
        fecha: doc.auditoria.modEn || doc.auditoria.creadoEn,
        usuario: doc.auditoria.modPor || doc.auditoria.creadoPor || '—',
        notas: doc.vigente ? 'vigente' : '',
      },
    ];
  },

  /** Busca un material por SKU y devuelve nombre/U.M. si existe. */
  async getMaterialBySku(
    sku: string,
    opts?: { signal?: AbortSignal }
  ): Promise<{ sku: string; descripcion: string; unidad: string } | null> {
    const raw = (sku ?? '').trim();
    if (!raw) return null;
    const normalized = raw.toUpperCase();
    const url = `${P}/by-sku/${encodeURIComponent(normalized)}`;

    let res: Response;
    try {
      res = await fetch(url, { signal: opts?.signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      throw new Error('No se pudo conectar para buscar el material.');
    }

    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(body || `Error ${res.status} buscando material ${normalized}`);
    }

    const data: any = await res.json();
    const descripcion =
      typeof data?.nombre === 'string' && data.nombre.trim()
        ? data.nombre.trim()
        : typeof data?.descripcion === 'string' && data.descripcion.trim()
          ? data.descripcion.trim()
          : typeof data?.name === 'string' && data.name.trim()
            ? data.name.trim()
            : '';
    const unidad =
      typeof data?.unidad === 'string' && data.unidad.trim()
        ? data.unidad.trim()
        : typeof data?.uom === 'string' && data.uom.trim()
          ? data.uom.trim()
          : '';
    const resolvedSku =
      typeof data?.skuPT === 'string' && data.skuPT.trim()
        ? data.skuPT.trim()
        : typeof data?.sku === 'string' && data.sku.trim()
          ? data.sku.trim()
          : normalized;

    return {
      sku: resolvedSku,
      descripcion,
      unidad: unidad || 'UN',
    };
  },

  /** Publicar una versión (si no pasas `version`, publica la actual). */
  async publish(id: string, version?: number): Promise<void> {
    let v = version;
    let key = id; // puede ser sku o objectId
    if (!v || isObjectId(id)) {
      const det = await this.getById(id);
      v = v ?? det.version;
      key = det.codigo; // aseguramos sku para la ruta /{skuPT}/versions/{version}/enable
    }
    const res = await fetch(`${R}/${encodeURIComponent(key)}/versions/${v}/enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) throw new Error(await res.text().catch(() => 'No se pudo habilitar la versión'));
  },

  /** Deshabilitar receta completa (limpia vigenteVersion). */
  async toggleHabilitada(id: string, habilitar: boolean): Promise<void> {
    if (habilitar) {
      const det = await this.getById(id);
      await this.publish(det.codigo, det.version);
      return;
    }
    // Para deshabilitar necesitamos el SKU real
    const det = await this.getById(id);
    const res = await fetch(`${R}/${encodeURIComponent(det.codigo)}/disable`, { method: 'POST' });
    if (!res.ok) throw new Error(await res.text().catch(() => 'No se pudo deshabilitar la receta'));
  },

  /** Update parcial: puede modificar nombre (descripcion), baseQty/unidad y/o componentes.
   *  - Si viene `materiales`, enviamos PATCH /{sku}/versions/{version}/componentes.
   *  - Si viene `cantidadBase`/`unidadBase`, usamos PUT /{sku}/versions/{version}.
   *  - Si viene `descripcion`, hacemos PATCH /{sku} con { nombre }.
   */
  async update(
    id: string,
    patch: Partial<Omit<RecetaDetalleDTO, 'id' | 'codigo'>>
  ): Promise<RecetaDetalleDTO> {
    const det = await this.getById(id); // resolvemos sku y versión vigente/actual
    const sku = det.codigo;
    const version = det.version;

    // 1) Nombre (descripcion) → PATCH /recipes/{sku}  { nombre }
    if (typeof patch.descripcion === 'string') {
      const urlNombre = `${R}/${encodeURIComponent(sku)}`;
      const resNombre = await fetch(urlNombre, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: patch.descripcion }),
      });
      if (!resNombre.ok) {
        throw new Error(await resNombre.text().catch(() => 'Error actualizando nombre de receta'));
      }
    }

    // 2) Componentes (si vienen) → PATCH /{sku}/versions/{version}/componentes
    if (patch.materiales) {
      const componentes = patch.materiales.map((m) => ({
        skuMP: m.sku,
        cantidadPorBase: m.cantidad,
        unidad: m.unidad,
        mermaPct: (m as any).mermaPct ?? 0,
      }));
      const urlComp = `${R}/${encodeURIComponent(sku)}/versions/${version}/componentes`;
      const resComp = await fetch(urlComp, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentes }),
      });
      if (!resComp.ok) throw new Error(await resComp.text().catch(() => 'Error actualizando componentes'));
    }

    // 3) Metadatos de versión → PUT /{sku}/versions/{version}
    const body: Record<string, any> = {};
    if (patch.cantidadBase !== undefined) body.baseQty = patch.cantidadBase;
    if (patch.unidadBase !== undefined) body.unidadPT = String(patch.unidadBase ?? '');

    if (Object.keys(body).length > 0) {
      const urlVersion = `${R}/${encodeURIComponent(sku)}/versions/${version}`;
      const resVersion = await fetch(urlVersion, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resVersion.ok) throw new Error(await resVersion.text().catch(() => 'Error actualizando versión'));
    }

    return this.getById(sku);
  },

  /** 🔹 Crear receta (versión 1) con opción de publicarla de inmediato.
   *  - POST /v1/recipes
   *  - Si mandas `descripcion`, luego se hace PATCH /v1/recipes/{skuPT} { nombre }
   */
  async create(input: {
    codigo: string;
    descripcion?: string;
    cantidadBase: number;
    unidadBase: string;
    materiales: MaterialLinea[];
    publicar?: boolean;
  }): Promise<RecetaDetalleDTO> {
    const sku = input.codigo;
    const numero = 1;

    // cuerpo CreateRecetaIn
    const body = {
      skuPT: sku,
      vigenteVersion: input.publicar ? numero : null,
      version: {
        numero,
        estado: input.publicar ? 'vigente' as const : 'borrador' as const,
        marcarVigente: !!input.publicar,
        fechaPublicacion: null,
        publicadoPor: null,
        baseQty: input.cantidadBase,
        unidadPT: String(input.unidadBase ?? ''),
        proceso: null,
        componentes: input.materiales.map(m => ({
          skuMP: m.sku,
          cantidadPorBase: m.cantidad,
          unidad: m.unidad,
          mermaPct: (m as any).mermaPct ?? 0,
        })),
      },
    };

    // crea
    const res = await fetch(R, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(`No se pudo crear la receta (${res.status}) ${msg}`);
    }

    // si viene nombre, actualizamos nombre por el endpoint PATCH /{skuPT}
    if (input.descripcion && input.descripcion.trim()) {
      const r2 = await fetch(`${R}/${encodeURIComponent(sku)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: input.descripcion }),
      });
      if (!r2.ok) {
        const msg = await r2.text().catch(() => '');
        throw new Error(`Receta creada, pero falló actualizar el nombre (${r2.status}) ${msg}`);
      }
    }

    // devolver detalle actualizado
    return this.getById(sku);
  },

  /** Clonar como nueva versión (borrador) desde la versión actual. */
  async cloneVersion(id: string): Promise<RecetaDetalleDTO> {
    const det = await this.getById(id);
    const sku = det.codigo;
    const nextVersion = det.version + 1;

    const body = {
      numero: nextVersion,
      estado: 'borrador',
      fechaPublicacion: null,
      publicadoPor: null,
      baseQty: det.cantidadBase,
      unidadPT: det.unidadBase,
      proceso: null,
      componentes: det.materiales.map((m) => ({
        skuMP: m.sku,
        cantidadPorBase: m.cantidad,
        unidad: m.unidad,
        mermaPct: (m as any).mermaPct ?? 0,
      })),
      marcarVigente: false,
    };

    const res = await fetch(`${R}/${encodeURIComponent(sku)}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => 'No se pudo clonar la versión'));

    return this.getById(sku);
  },

  /** Importar materiales: REPLACE (reemplaza todo) o UPSERT (mezcla por SKU). */
  async importMaterials(
    id: string,
    modo: 'REPLACE' | 'UPSERT',
    materiales: MaterialLinea[]
  ): Promise<RecetaDetalleDTO> {
    const det = await this.getById(id);
    const sku = det.codigo;
    const version = det.version;

    let next: MaterialLinea[] = materiales;

    if (modo === 'UPSERT') {
      const map = new Map<string, MaterialLinea>();
      for (const m of det.materiales) map.set(m.sku, m);
      for (const m of materiales) map.set(m.sku, { ...map.get(m.sku), ...m });
      next = Array.from(map.values());
    }

    const componentes = next.map((m) => ({
      skuMP: m.sku,
      cantidadPorBase: m.cantidad,
      unidad: m.unidad,
      mermaPct: (m as any).mermaPct ?? 0,
    }));

    const url = `${R}/${encodeURIComponent(sku)}/versions/${version}/componentes`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ componentes }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => 'Error importando materiales'));

    return this.getById(sku);
  },

  /** Exportar: usamos el mismo detalle. */
  async exportReceta(id: string): Promise<RecetaDetalleDTO> {
    return this.getById(id);
  },

  async updateNombre(id: string, nombre: string): Promise<void> {
    // Puede venir SKU o ObjectId → resolvemos el SKU real
    const det = await this.getById(id);
    const sku = det.codigo;

    const res = await fetch(`${R}/${encodeURIComponent(sku)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(`No se pudo actualizar el nombre (${res.status}) ${msg}`);
    }
  },
};
