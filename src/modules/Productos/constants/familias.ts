// constants/familias.ts
// --------------------------------------------------------------
// 🔧 Mapa centralizado de Familias/Subfamilias ↔ Códigos
// - Edita SOLO este archivo para agregar/actualizar familias.
// - La UI muestra NOMBRES; al backend se envían NOMBRES + CÓDIGOS.
// - Incluye helpers directos (nombre→código) e inversos (código→nombre).
// --------------------------------------------------------------

/** Estructura base del mapa:
 * FAMILIAS = {
 *   "Nombre Familia": {
 *     code: <código numérico de la familia>,
 *     subs: {
 *       "Nombre Subfamilia": <código numérico de la subfamilia>,
 *       ...
 *     }
 *   },
 *   ...
 * }
 */
export type FamiliaMap = Record<
  string,
  {
    code: number;
    subs: Record<string, number>;
  }
>;

/* ==============================================================
 * 🗂️ DATA DE EJEMPLO — REEMPLAZA/AMPLÍA CON TU LISTA REAL
 * - Puedes borrar las familias/subfamilias demo y pegar tu data.
 * - Respeta el formato: claves = nombres; valores = códigos numéricos.
 * ============================================================== */
export const FAMILIAS: FamiliaMap = {
  AUTOMOTRIZ: {
    code: 1,
    subs: {
      REFRIGERANTES: 1,
      CARCARE: 2,
      LUBRICANTES: 3,
    },
  },
  LIMPIEZA: {
    code: 2,
    subs: {
      DETERGENTES: 4,
      LIMPIADORES: 5,
      AROMATIZANTES: 6,
      OTROS: 7,
    },
  },
  MAQUINARIA: {
    code: 3,
    subs: {
      JARDINERIA: 8,
      INDUSTRIAL: 9,
    },
  },
  ELABORACION: {
    code: 4,
    subs: {
      AUTOMOTRIZ: 10,
      LIMPIEZA: 11,
    },
  },
  INSUMOS: {
    code: 5,
    subs: {
      ENVASES: 12,
      CAJAS: 13,
      ETIQUETAS: 14,
      CONSUMIBLES: 15,
      QUIMICOS: 16,
    },
  },
  FIESTA: {
    code: 6,
    subs: {
        FIESTA: 17
    },
  },
};

/* ==============================================================
 * 🧠 Helpers nombre → código
 * ============================================================== */

const norm = (s?: string | null) => (s ?? "").trim();

/** Nombres de familias (para <select>) */
export const getFamilyNames = (): string[] => Object.keys(FAMILIAS);

/** Nombres de subfamilias para una familia (para <select> dependiente) */
export const getSubfamilyNames = (familyName?: string | null): string[] => {
  const fam = FAMILIAS[norm(familyName)];
  return fam ? Object.keys(fam.subs) : [];
};

/** Código de familia por nombre */
export const getFamilyCode = (familyName?: string | null): number | undefined => {
  const fam = FAMILIAS[norm(familyName)];
  return fam?.code;
};

/** Código de subfamilia por (familia, subfamilia) */
export const getSubfamilyCode = (
  familyName?: string | null,
  subfamilyName?: string | null
): number | undefined => {
  const fam = FAMILIAS[norm(familyName)];
  if (!fam) return undefined;
  return fam.subs[norm(subfamilyName)];
};

/** 
 * Completa códigos faltantes a partir de nombres (no sobreescribe si ya existen).
 * Útil antes de enviar PATCH/POST al backend.
 */
export const resolveCodes = (input: {
  groupName?: string | null;    // nombre familia (dg)
  subgroupName?: string | null; // nombre subfamilia (dsg)
  groupCode?: number | null;    // código familia (codigo_g)
  subgroupCode?: number | null; // código subfamilia (codigo_sg)
}): { groupCode?: number; subgroupCode?: number } => {
  const groupCode = input.groupCode ?? getFamilyCode(input.groupName);
  const subgroupCode =
    input.subgroupCode ?? getSubfamilyCode(input.groupName, input.subgroupName);
  return { groupCode, subgroupCode };
};

/* ==============================================================
 * 🔄 Helpers inversos código → nombre
 * - Útiles si el backend devuelve solo códigos y no nombres.
 * ============================================================== */

/** Índices inversos cacheados para búsqueda por código */
let _familyCodeToName: Map<number, string> | null = null;
let _subCodeToNameByFamilyCode: Map<number, Map<number, string>> | null = null;

const ensureIndexes = () => {
  if (_familyCodeToName && _subCodeToNameByFamilyCode) return;

  _familyCodeToName = new Map<number, string>();
  _subCodeToNameByFamilyCode = new Map<number, Map<number, string>>();

  for (const [famName, { code: famCode, subs }] of Object.entries(FAMILIAS)) {
    _familyCodeToName.set(famCode, famName);
    const subMap = new Map<number, string>();
    for (const [subName, subCode] of Object.entries(subs)) {
      subMap.set(subCode, subName);
    }
    _subCodeToNameByFamilyCode.set(famCode, subMap);
  }
};

/** Nombre de familia por código */
export const getFamilyNameByCode = (familyCode?: number | null): string | undefined => {
  if (familyCode == null) return undefined;
  ensureIndexes();
  return _familyCodeToName!.get(familyCode);
};

/** Nombre de subfamilia por (código familia, código subfamilia) */
export const getSubfamilyNameByCodes = (
  familyCode?: number | null,
  subfamilyCode?: number | null
): string | undefined => {
  if (familyCode == null || subfamilyCode == null) return undefined;
  ensureIndexes();
  const subMap = _subCodeToNameByFamilyCode!.get(familyCode);
  return subMap?.get(subfamilyCode);
};

/** 
 * Completa nombres faltantes a partir de códigos (no sobreescribe si ya existen).
 * Útil para adaptar respuestas del backend a la UI.
 */
export const resolveNamesByCodes = (input: {
  groupCode?: number | null;    // código familia
  subgroupCode?: number | null; // código subfamilia
  groupName?: string | null;    // nombre familia
  subgroupName?: string | null; // nombre subfamilia
}): { groupName?: string; subgroupName?: string } => {
  const groupName = input.groupName ?? getFamilyNameByCode(input.groupCode ?? undefined);
  let subgroupName = input.subgroupName;

  if (!subgroupName && input.groupCode != null && input.subgroupCode != null) {
    subgroupName = getSubfamilyNameByCodes(input.groupCode, input.subgroupCode);
  }

  return { groupName: groupName ?? undefined, subgroupName: subgroupName ?? undefined };
};

/* ==============================================================
 * 📝 Guía para editar la DATA rápidamente
 * 
 * 1) Agregar familia:
 *    FAMILIAS["Nueva Familia"] = { code: 123, subs: {} }
 * 
 * 2) Agregar subfamilia:
 *    FAMILIAS["Limpieza"].subs["Nueva Sub"] = 99
 * 
 * 3) Cambiar código:
 *    FAMILIAS["Automotriz"].code = 7
 *    FAMILIAS["Automotriz"].subs["Lubricantes"] = 70
 * 
 * 4) Renombrar familia/subfamilia:
 *    FAMILIAS["Autocuidado"] = FAMILIAS["Limpieza"]; delete FAMILIAS["Limpieza"];
 *    // ⚠️ Revisa si hay filtros/semillas que usen el nombre antiguo.
 * 
 * 5) Consistencia:
 *    - Usa nombres EXACTOS que mostrará la UI (incluye tildes si aplica).
 *    - Evita códigos duplicados.
 * ============================================================== */
