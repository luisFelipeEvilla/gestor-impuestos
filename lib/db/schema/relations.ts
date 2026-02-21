import { relations } from "drizzle-orm";
import { usuarios } from "./usuarios";
import { cargosEmpresa } from "./cargos-empresa";
import { empresa } from "./empresa";
import { clientes, clientesMiembros } from "./clientes";
import { impuestos } from "./impuestos";
import { contribuyentes } from "./contribuyentes";
import {
  procesos,
  historialProceso,
  documentosProceso,
  ordenesResolucion,
  acuerdosPago,
  cobrosCoactivos,
} from "./procesos";
import { obligaciones, actividades } from "./obligaciones";
import {
  actasReunion,
  actasIntegrantes,
  compromisosActa,
  compromisosActaHistorial,
  documentosCompromisoActa,
  aprobacionesActaParticipante,
  documentosActa,
  historialActa,
  actasReunionActividades,
  actasReunionClientes,
} from "./actas";

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  cargo: one(cargosEmpresa, { fields: [usuarios.cargoId], references: [cargosEmpresa.id] }),
  procesosAsignados: many(procesos),
  historiales: many(historialProceso),
  actasCreadas: many(actasReunion),
  historialesActa: many(historialActa),
}));

export const cargosEmpresaRelations = relations(cargosEmpresa, ({ many }) => ({
  usuarios: many(usuarios),
}));

export const empresaRelations = relations(empresa, () => ({}));

export const clientesRelations = relations(clientes, ({ many }) => ({
  impuestos: many(impuestos),
  miembros: many(clientesMiembros),
  actasReunionClientes: many(actasReunionClientes),
}));

export const clientesMiembrosRelations = relations(clientesMiembros, ({ one }) => ({
  cliente: one(clientes),
}));

export const impuestosRelations = relations(impuestos, ({ one }) => ({
  cliente: one(clientes, { fields: [impuestos.clienteId], references: [clientes.id] }),
}));

export const contribuyentesRelations = relations(contribuyentes, ({ many }) => ({
  procesos: many(procesos),
}));

export const procesosRelations = relations(procesos, ({ one, many }) => ({
  contribuyente: one(contribuyentes),
  asignadoA: one(usuarios),
  historial: many(historialProceso),
  documentos: many(documentosProceso),
  ordenResolucion: one(ordenesResolucion),
  acuerdosPago: many(acuerdosPago),
  cobroCoactivo: one(cobrosCoactivos),
}));

export const historialProcesoRelations = relations(historialProceso, ({ one }) => ({
  proceso: one(procesos),
  usuario: one(usuarios),
}));

export const documentosProcesoRelations = relations(documentosProceso, ({ one }) => ({
  proceso: one(procesos),
}));

export const ordenesResolucionRelations = relations(ordenesResolucion, ({ one }) => ({
  proceso: one(procesos),
}));

export const acuerdosPagoRelations = relations(acuerdosPago, ({ one }) => ({
  proceso: one(procesos),
}));

export const cobrosCoactivosRelations = relations(cobrosCoactivos, ({ one }) => ({
  proceso: one(procesos),
}));

export const actasReunionRelations = relations(actasReunion, ({ one, many }) => ({
  creadoPor: one(usuarios, { fields: [actasReunion.creadoPorId], references: [usuarios.id] }),
  aprobadoPor: one(usuarios, { fields: [actasReunion.aprobadoPorId], references: [usuarios.id] }),
  integrantes: many(actasIntegrantes),
  compromisos: many(compromisosActa),
  aprobacionesParticipantes: many(aprobacionesActaParticipante),
  documentos: many(documentosActa),
  historial: many(historialActa),
  actasReunionClientes: many(actasReunionClientes),
  actasReunionActividades: many(actasReunionActividades),
}));

export const obligacionesRelations = relations(obligaciones, ({ many }) => ({
  actividades: many(actividades),
}));

export const actividadesRelations = relations(actividades, ({ one, many }) => ({
  obligacion: one(obligaciones, {
    fields: [actividades.obligacionId],
    references: [obligaciones.id],
  }),
  actasReunionActividades: many(actasReunionActividades),
}));

export const actasReunionActividadesRelations = relations(
  actasReunionActividades,
  ({ one }) => ({
    acta: one(actasReunion),
    actividad: one(actividades),
  })
);

export const actasReunionClientesRelations = relations(actasReunionClientes, ({ one }) => ({
  acta: one(actasReunion),
  cliente: one(clientes),
}));

export const actasIntegrantesRelations = relations(actasIntegrantes, ({ one, many }) => ({
  acta: one(actasReunion),
  usuario: one(usuarios),
  aprobacion: many(aprobacionesActaParticipante),
  compromisosAsignados: many(compromisosActa),
}));

export const compromisosActaRelations = relations(compromisosActa, ({ one, many }) => ({
  acta: one(actasReunion),
  actaIntegrante: one(actasIntegrantes),
  clienteMiembro: one(clientesMiembros),
  actualizadoPor: one(usuarios, {
    fields: [compromisosActa.actualizadoPorId],
    references: [usuarios.id],
  }),
  historial: many(compromisosActaHistorial),
}));

export const compromisosActaHistorialRelations = relations(
  compromisosActaHistorial,
  ({ one, many }) => ({
    compromisoActa: one(compromisosActa),
    creadoPor: one(usuarios, {
      fields: [compromisosActaHistorial.creadoPorId],
      references: [usuarios.id],
    }),
    documentos: many(documentosCompromisoActa),
  })
);

export const documentosCompromisoActaRelations = relations(
  documentosCompromisoActa,
  ({ one }) => ({
    compromisoActaHistorial: one(compromisosActaHistorial),
  })
);

export const aprobacionesActaParticipanteRelations = relations(
  aprobacionesActaParticipante,
  ({ one }) => ({
    acta: one(actasReunion),
    actaIntegrante: one(actasIntegrantes),
  })
);

export const documentosActaRelations = relations(documentosActa, ({ one }) => ({
  acta: one(actasReunion),
}));

export const historialActaRelations = relations(historialActa, ({ one }) => ({
  acta: one(actasReunion),
  usuario: one(usuarios),
}));
