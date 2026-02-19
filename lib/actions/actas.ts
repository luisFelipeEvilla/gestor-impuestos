/**
 * Punto de entrada de acciones de actas. Re-exporta desde módulos internos
 * (queries y mutations tienen "use server") para mantener la API pública
 * en @/lib/actions/actas.
 */

export {
  obtenerActas,
  obtenerUsuariosParaFiltroActas,
  obtenerAsistentesExternosParaFiltro,
  obtenerActaParaPreviewParticipante,
  obtenerActaPorId,
  obtenerHistorialActa,
  validarEnlaceAprobacionParticipante,
  yaAprobadoParticipante,
  obtenerRespuestaParticipante,
  obtenerAprobacionesPorActa,
} from "./actas/queries";

export {
  crearActa,
  actualizarActa,
  enviarActaAprobacion,
  aprobarActa,
  devolverActaABorrador,
  enviarActaPorCorreo,
  eliminarActa,
  aprobarParticipanteFromPreviewAction,
  registrarAprobacionParticipante,
  registrarRechazoParticipante,
  rechazarParticipanteFromPreviewAction,
  enviarActaAprobacionAction,
  aprobarActaAction,
  devolverActaABorradorAction,
  enviarActaPorCorreoAction,
  eliminarActaAction,
} from "./actas/mutations";

export type { SnapshotAuditoriaActa, SnapshotDespuesEdicionActa } from "./actas/auditoria";
