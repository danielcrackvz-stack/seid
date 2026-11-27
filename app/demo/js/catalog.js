/* Catálogo de servicios, precios 2026 (Bs) y lista de verificación de aire. */

export const SERVICIOS = [
  { key: 'instalacion-aire', label: 'Instalación de aire acondicionado', corto: 'Instalación de aire', grupo: 'Climatización', aire: 'instalacion' },
  { key: 'mantenimiento-aire', label: 'Mantenimiento de aire', corto: 'Mantenimiento de aire', grupo: 'Climatización', aire: 'mantenimiento' },
  { key: 'instalacion-inverter', label: 'Instalación inverter', corto: 'Instalación inverter', grupo: 'Climatización', aire: 'instalacion' },
  { key: 'electricidad-industrial', label: 'Electricidad industrial', corto: 'Electricidad industrial', grupo: 'Electricidad' },
  { key: 'electricidad-domiciliaria', label: 'Electricidad domiciliaria', corto: 'Electricidad domiciliaria', grupo: 'Electricidad' },
  { key: 'panel-trifasico', label: 'Panel trifásico', corto: 'Panel trifásico', grupo: 'Electricidad' },
  { key: 'transformadores', label: 'Transformadores', corto: 'Transformadores', grupo: 'Electricidad' },
  { key: 'proyectos-electricos', label: 'Proyectos eléctricos', corto: 'Proyectos eléctricos', grupo: 'Electricidad' },
  { key: 'plomeria', label: 'Plomería', corto: 'Plomería', grupo: 'Instalaciones' },
  { key: 'gas', label: 'Gas', corto: 'Gas', grupo: 'Instalaciones' },
  { key: 'camaras', label: 'Cámaras de seguridad', corto: 'Cámaras de seguridad', grupo: 'Seguridad' },
  { key: 'cerco-electrico', label: 'Cerco eléctrico', corto: 'Cerco eléctrico', grupo: 'Seguridad' },
  { key: 'otro', label: 'Otro trabajo', corto: 'Otro trabajo', grupo: 'Otros' }
];

export function servicio(key) {
  return SERVICIOS.find((s) => s.key === key) || { key, label: key || 'Trabajo', corto: key || 'Trabajo', grupo: 'Otros' };
}

/** Genera próximo mantenimiento a los 6 meses. */
export function generaRecordatorio(key) {
  const s = servicio(key);
  return s.aire === 'instalacion' || s.aire === 'mantenimiento';
}

export const PRECIOS_MANTENIMIENTO = [
  { key: 'm-9-18', label: '9.000 a 18.000 BTU', monto: 665 },
  { key: 'm-24-30', label: '24.000 a 30.000 BTU', monto: 840 },
  { key: 'm-36-60', label: '36.000 a 60.000 BTU', monto: 1060 }
];

export const PRECIOS_INSTALACION = [
  { key: 'i-9-12', label: '9.000 a 12.000 BTU', monto: 840 },
  { key: 'i-18-24', label: '18.000 a 24.000 BTU', monto: 1060 },
  { key: 'i-30-64', label: '30.000 a 64.000 BTU', monto: 1750 }
];

export const EXTRAS_AIRE = [
  { key: 'montaje', label: 'Montaje sin mantenimiento', monto: 700 },
  { key: 'traslado', label: 'Traslado sin mantenimiento', monto: 400 },
  { key: 'fuga', label: 'Corrección de fuga y reposición de refrigerante', monto: 900 },
  { key: 'visita', label: 'Visita técnica y diagnóstico', monto: 200 },
  { key: 'placa', label: 'Reparación de placa', monto: 700 },
  { key: 'soldadura', label: 'Soldadura en unidad condensadora', monto: 600 },
  { key: 'tuberia', label: 'Extensión de tubería', monto: 200, porMetro: true },
  { key: 'drenaje', label: 'Drenaje', monto: 150 }
];

export const CHECKLIST_AIRE = [
  { key: 'evapClean', label: 'Limpiador externo «Evap Clean»' },
  { key: 'flashFlush', label: 'Limpiador interno de sistemas «Flash Flush»' },
  { key: 'evaporador', label: 'Limpieza de evaporador' },
  { key: 'filtros', label: 'Limpieza de filtros' },
  { key: 'compresor', label: 'Limpieza de compresor' },
  { key: 'olores', label: 'Eliminación de olores' },
  { key: 'gas', label: 'Medición de gas refrigerante' },
  { key: 'voltaje', label: 'Medición de voltaje' }
];

export const TIPOS_EQUIPO = ['Split / minisplit', 'Inverter', 'Ventana', 'Piso techo', 'Cassette', 'Central'];

export const ESTADOS = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'en-curso', label: 'En curso' },
  { key: 'terminado', label: 'Terminado' }
];

export function estadoLabel(key) {
  return (ESTADOS.find((e) => e.key === key) || { label: key }).label;
}
