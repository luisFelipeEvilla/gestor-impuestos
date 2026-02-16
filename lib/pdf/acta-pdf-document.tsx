import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { ActaDetalle } from "@/lib/actions/actas-types";
import { stripHtml } from "./strip-html";

Font.registerHyphenationCallback((word: string) => [word]);

type EmpresaData = {
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  direccion: string | null;
  telefonoContacto: string | null;
  numeroContacto: string | null;
  cargoFirmanteActas: string | null;
} | null;

const COLORS = {
  navy: "#1e3a5f",
  navyLight: "#2c5282",
  slate: "#475569",
  slateLight: "#64748b",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  bgSection: "#fafbfc",
  white: "#ffffff",
  text: "#1e293b",
  textSecondary: "#475569",
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.text,
  },
  // —— Encabezado ——
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 48,
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.navy,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  logo: {
    width: 88,
    height: 44,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.navy,
    letterSpacing: 0.3,
    lineHeight: 1.3,
  },
  // —— Contenido principal ——
  main: {
    paddingHorizontal: 48,
    paddingTop: 28,
    paddingBottom: 120,
  },
  docTitleBlock: {
    marginBottom: 24,
    alignItems: "center",
  },
  docTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.navy,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  docSubtitle: {
    fontSize: 11,
    color: COLORS.slate,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  // —— Bloque de datos del acta ——
  metaBlock: {
    marginBottom: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: COLORS.bgSection,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.navy,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  metaRowLast: {
    flexDirection: "row",
    marginBottom: 0,
  },
  metaLabel: {
    fontSize: 8,
    color: COLORS.slateLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    width: 100,
    flexShrink: 0,
  },
  metaValue: {
    fontSize: 10,
    color: COLORS.text,
    flex: 1,
    lineHeight: 1.4,
  },
  // —— Secciones ——
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.navy,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    letterSpacing: 0.2,
  },
  sectionBody: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 32,
  },
  sectionText: {
    fontSize: 10,
    lineHeight: 1.55,
    textAlign: "justify",
    color: COLORS.text,
  },
  sectionEmpty: {
    fontSize: 10,
    color: COLORS.slateLight,
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  subsectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.navyLight,
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 0.15,
  },
  // —— Tablas ——
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.navy,
  },
  tableHeaderCell: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 8,
    fontWeight: "bold",
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bgSection,
  },
  tableCell: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 9,
    lineHeight: 1.35,
    color: COLORS.text,
  },
  colNum: { width: 28 },
  colCodigo: { width: 36 },
  colDescripcion: { flex: 1, minWidth: 90 },
  colFechaLimite: { width: 76 },
  colResponsable: { width: 110 },
  colEstado: { width: 58 },
  colNombre: { flex: 1, minWidth: 90 },
  colEmail: { width: 140 },
  colCargo: { width: 72 },
  estadoPendiente: { color: COLORS.slateLight },
  estadoCumplido: { color: "#0d9488", fontWeight: "bold" },
  estadoNoCumplido: { color: "#dc2626", fontWeight: "bold" },
  // —— Firma ——
  firmaBlock: {
    marginTop: 36,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  firmaLabel: {
    fontSize: 8,
    color: COLORS.slateLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 14,
  },
  firmaLine: {
    width: 220,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.navy,
    marginBottom: 6,
  },
  firmaCargo: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.navy,
  },
  // —— Pie de página ——
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bgSection,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    fontSize: 8,
    color: COLORS.textSecondary,
    lineHeight: 1.45,
  },
  footerLegal: {
    fontSize: 7,
    color: COLORS.slateLight,
    textAlign: "center",
    lineHeight: 1.5,
  },
});

function formatFecha(date: Date): string {
  return new Date(date).toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatFechaCorta(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-CO", { dateStyle: "short" });
}

function estadoLabel(estado?: "pendiente" | "cumplido" | "no_cumplido" | null): string {
  if (!estado) return "—";
  const map = { pendiente: "Pendiente", cumplido: "Cumplido", no_cumplido: "No cumplido" };
  return map[estado] ?? estado;
}

function formatAsignado(nombre: string | null, cargo: string | null): string {
  if (!nombre) return "—";
  if (cargo?.trim()) return `${nombre} — ${cargo.trim()}`;
  return nombre;
}

type ActaPdfDocumentProps = {
  acta: ActaDetalle;
  empresa: EmpresaData;
  logoPath: string;
};

export function ActaPdfDocument({ acta, empresa, logoPath }: ActaPdfDocumentProps) {
  const contenidoTexto = stripHtml(acta.contenido);
  const compromisosTexto = acta.compromisos ? stripHtml(acta.compromisos) : null;
  const tieneCompromisosLista = acta.compromisosLista?.length > 0;
  const cargoFirmante = empresa?.cargoFirmanteActas?.trim() || "Representante legal";
  const nombreEmpresa = empresa?.nombre ?? "R&R Consultorías S.A.S";
  const internos = acta.integrantes.filter((i) => (i.tipo ?? "externo") === "interno");
  const externos = acta.integrantes.filter((i) => (i.tipo ?? "externo") === "externo");
  const tieneActividades = (acta.actividades?.length ?? 0) > 0;
  const numContenido = 1;
  const numActividades = 2;
  const numCompromisos = tieneActividades ? 3 : 2;
  const numAsistentes = tieneActividades ? 4 : 3;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={logoPath} style={styles.logo} />
            {empresa && (
              <Text style={styles.companyName}>{empresa.nombre}</Text>
            )}
          </View>
        </View>

        <View style={styles.main}>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>Acta de reunión</Text>
            <Text style={styles.docSubtitle}>No. {acta.id}</Text>
          </View>

          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Fecha</Text>
              <Text style={styles.metaValue}>{formatFecha(acta.fecha)}</Text>
            </View>
            <View style={styles.metaRowLast}>
              <Text style={styles.metaLabel}>Objetivo</Text>
              <Text style={styles.metaValue}>{acta.objetivo}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{numContenido}. Contenido</Text>
            <View style={styles.sectionBody}>
              <Text style={contenidoTexto ? styles.sectionText : styles.sectionEmpty}>
                {contenidoTexto || "Sin contenido registrado."}
              </Text>
            </View>
          </View>

          {acta.actividades?.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{numActividades}. Actividades desarrolladas</Text>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, styles.colCodigo]}>Cód.</Text>
                  <Text style={[styles.tableHeaderCell, styles.colDescripcion]}>Descripción</Text>
                </View>
                {acta.actividades.map((a, idx) => (
                  <View
                    key={a.id}
                    style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                  >
                    <Text style={[styles.tableCell, styles.colCodigo]}>{a.codigo}</Text>
                    <Text style={[styles.tableCell, styles.colDescripcion]}>{a.descripcion}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{numCompromisos}. Compromisos</Text>
            {tieneCompromisosLista ? (
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
                  <Text style={[styles.tableHeaderCell, styles.colDescripcion]}>Descripción</Text>
                  <Text style={[styles.tableHeaderCell, styles.colFechaLimite]}>Fecha límite</Text>
                  <Text style={[styles.tableHeaderCell, styles.colResponsable]}>Responsable</Text>
                  <Text style={[styles.tableHeaderCell, styles.colEstado]}>Estado</Text>
                </View>
                {acta.compromisosLista.map((c, idx) => (
                  <View
                    key={c.id}
                    style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                  >
                    <Text style={[styles.tableCell, styles.colNum]}>{idx + 1}</Text>
                    <Text style={[styles.tableCell, styles.colDescripcion]}>{c.descripcion}</Text>
                    <Text style={[styles.tableCell, styles.colFechaLimite]}>
                      {formatFechaCorta(c.fechaLimite)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colResponsable]}>
                      {formatAsignado(c.asignadoNombre ?? null, c.asignadoCargo ?? null)}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.colEstado,
                        ...(c.estado === "cumplido" ? [styles.estadoCumplido] : []),
                        ...(c.estado === "no_cumplido" ? [styles.estadoNoCumplido] : []),
                        ...((c.estado === "pendiente" || !c.estado) ? [styles.estadoPendiente] : []),
                      ]}
                    >
                      {estadoLabel(c.estado)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : compromisosTexto ? (
              <View style={styles.sectionBody}>
                <Text style={styles.sectionText}>{compromisosTexto}</Text>
              </View>
            ) : (
              <View style={styles.sectionBody}>
                <Text style={styles.sectionEmpty}>Sin compromisos registrados.</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{numAsistentes}. Asistentes</Text>
            <Text style={styles.subsectionTitle}>Asistentes de {nombreEmpresa}</Text>
            {internos.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, styles.colNombre]}>Nombre</Text>
                  <Text style={[styles.tableHeaderCell, styles.colEmail]}>Correo electrónico</Text>
                  <Text style={[styles.tableHeaderCell, styles.colCargo]}>Cargo</Text>
                </View>
                {internos.map((inv, idx) => (
                  <View
                    key={inv.id}
                    style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                  >
                    <Text style={[styles.tableCell, styles.colNombre]}>{inv.nombre}</Text>
                    <Text style={[styles.tableCell, styles.colEmail]}>{inv.email}</Text>
                    <Text style={[styles.tableCell, styles.colCargo]}>{inv.cargo ?? "—"}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.sectionBody}>
                <Text style={styles.sectionEmpty}>No hay asistentes internos.</Text>
              </View>
            )}

            <Text style={styles.subsectionTitle}>Asistentes externos</Text>
            {externos.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, styles.colNombre]}>Nombre</Text>
                  <Text style={[styles.tableHeaderCell, styles.colEmail]}>Correo electrónico</Text>
                  <Text style={[styles.tableHeaderCell, styles.colCargo]}>Cargo</Text>
                </View>
                {externos.map((inv, idx) => (
                  <View
                    key={inv.id}
                    style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                  >
                    <Text style={[styles.tableCell, styles.colNombre]}>{inv.nombre}</Text>
                    <Text style={[styles.tableCell, styles.colEmail]}>{inv.email}</Text>
                    <Text style={[styles.tableCell, styles.colCargo]}>{inv.cargo ?? "—"}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.sectionBody}>
                <Text style={styles.sectionEmpty}>No hay asistentes externos.</Text>
              </View>
            )}
          </View>

          <View style={styles.firmaBlock}>
            <Text style={styles.firmaLabel}>Firma del representante legal</Text>
            <View style={styles.firmaLine} />
            <Text style={styles.firmaCargo}>{cargoFirmante}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          {empresa && (
            <View style={styles.footerRow}>
              <View>
                <Text>{empresa.nombre}</Text>
                {empresa.direccion ? <Text>{empresa.direccion}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {(empresa.telefonoContacto || empresa.numeroContacto) ? (
                  <Text>
                    Tel: {[empresa.telefonoContacto, empresa.numeroContacto].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
          <Text style={styles.footerLegal}>
            Documento generado electrónicamente. Tiene plena validez conforme a la Ley 527 de 1999
            (mensajes de datos y firma digital), Decreto 2364 de 2012 y normatividad aplicable en Colombia.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
