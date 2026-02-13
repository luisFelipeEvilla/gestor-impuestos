import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ActaDetalle } from "@/lib/actions/actas-types";
import { stripHtml } from "./strip-html";

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
  primary: "#0f172a",
  primaryLight: "#1e293b",
  border: "#cbd5e1",
  borderLight: "#e2e8f0",
  muted: "#64748b",
  mutedBg: "#f8fafc",
  white: "#ffffff",
  text: "#334155",
  textMuted: "#64748b",
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: COLORS.text,
  },
  // —— Letterhead ——
  letterhead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  letterheadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  logo: {
    width: 100,
    height: 40,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  letterheadRight: {
    alignItems: "flex-end",
  },
  docTypeLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  docTypeValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  // —— Content area ——
  content: {
    paddingHorizontal: 40,
    paddingTop: 24,
    paddingBottom: 100,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  infoGrid: {
    flexDirection: "row",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.mutedBg,
  },
  infoCell: {
    flex: 1,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  infoCellLast: {
    flex: 1,
    padding: 12,
  },
  infoLabel: {
    fontSize: 7,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subsectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.primaryLight,
    marginTop: 12,
    marginBottom: 6,
  },
  sectionContent: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
    minHeight: 40,
  },
  sectionText: {
    fontSize: 9,
    lineHeight: 1.5,
    textAlign: "justify",
    color: COLORS.text,
  },
  // —— Tables ——
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.primaryLight,
  },
  tableHeaderCell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 7,
    fontWeight: "bold",
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.mutedBg,
  },
  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 8,
    color: COLORS.text,
  },
  // Compromisos columns
  colNum: { width: 22 },
  colDescripcion: { flex: 1, minWidth: 0 },
  colFechaLimite: { width: 68 },
  colResponsable: { width: 90 },
  colEstado: { width: 52 },
  // Asistentes columns (sin columna Tipo; se usan dos tablas)
  colNombre: { flex: 1, minWidth: 0 },
  colEmail: { width: 110 },
  colCargo: { width: 70 },
  estadoPendiente: { color: COLORS.muted },
  estadoCumplido: { color: "#15803d", fontWeight: "bold" },
  estadoNoCumplido: { color: "#b91c1c", fontWeight: "bold" },
  // —— Firma ——
  firmaSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  firmaLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  firmaLine: {
    width: 240,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    marginBottom: 6,
  },
  firmaCargo: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  // —— Footer ——
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.mutedBg,
  },
  footerCompany: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    fontSize: 8,
    color: COLORS.text,
  },
  footerLegal: {
    fontSize: 7,
    color: COLORS.muted,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 1.4,
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
  const cargoFirmante = empresa?.cargoFirmanteActas?.trim() || "Gerente general";
  const internos = acta.integrantes.filter((i) => (i.tipo ?? "externo") === "interno");
  const externos = acta.integrantes.filter((i) => (i.tipo ?? "externo") === "externo");

  const docTipoLabel = empresa?.tipoDocumento === "nit" ? "NIT" : "Cédula";
  const docTipoValue = empresa?.numeroDocumento ?? "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Letterhead */}
        <View style={styles.letterhead}>
          <View style={styles.letterheadLeft}>
            <Image src={logoPath} style={styles.logo} />
            {empresa && (
              <Text style={styles.companyName}>{empresa.nombre}</Text>
            )}
          </View>
          <View style={styles.letterheadRight}>
            <Text style={styles.docTypeLabel}>Documento</Text>
            <Text style={styles.docTypeValue}>{docTipoLabel} {docTipoValue}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.docTitle}>ACTA DE REUNIÓN N.º {acta.id}</Text>

          {/* Fecha y objetivo en grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Fecha</Text>
              <Text style={styles.infoValue}>{formatFecha(acta.fecha)}</Text>
            </View>
            <View style={[styles.infoCell, styles.infoCellLast]}>
              <Text style={styles.infoLabel}>Objetivo específico</Text>
              <Text style={[styles.infoValue, { fontSize: 9 }]}>{acta.objetivo}</Text>
            </View>
          </View>

          {/* Contenido */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Contenido</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionText}>
                {contenidoTexto || "Sin contenido registrado."}
              </Text>
            </View>
          </View>

          {/* Compromisos (tabla) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Compromisos</Text>
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
              <View style={styles.sectionContent}>
                <Text style={styles.sectionText}>{compromisosTexto}</Text>
              </View>
            ) : (
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionText, { color: COLORS.muted }]}>
                  Sin compromisos registrados.
                </Text>
              </View>
            )}
          </View>

          {/* Asistentes: dos tablas (internos y externos) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Asistentes</Text>

            {/* 3.1 Internos (empresa) */}
            <Text style={styles.subsectionTitle}>3.1 Asistentes de R&R Consultorias S.A.S</Text>
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
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionText, { color: COLORS.muted }]}>
                  No hay asistentes internos.
                </Text>
              </View>
            )}

            {/* 3.2 Externos */}
            <Text style={styles.subsectionTitle}>3.2 Asistentes externos</Text>
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
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionText, { color: COLORS.muted }]}>
                  No hay asistentes externos.
                </Text>
              </View>
            )}
          </View>

          {/* Firma */}
          <View style={styles.firmaSection}>
            <Text style={styles.firmaLabel}>Firma del representante legal</Text>
            <View style={styles.firmaLine} />
            <Text style={styles.firmaCargo}>{cargoFirmante}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          {empresa && (
            <View style={styles.footerCompany}>
              <Text>
                {empresa.nombre} · {docTipoLabel} {empresa.numeroDocumento}
              </Text>
              {empresa.direccion && <Text>{empresa.direccion}</Text>}
              {(empresa.telefonoContacto || empresa.numeroContacto) && (
                <Text>
                  Tel: {[empresa.telefonoContacto, empresa.numeroContacto].filter(Boolean).join(" · ")}
                </Text>
              )}
            </View>
          )}
          <Text style={styles.footerLegal}>
            Documento generado electrónicamente. Tiene plena validez y fuerza ejecutoria conforme a
            la Ley 527 de 1999 (mensajes de datos y firma digital), Decreto 2364 de 2012 y
            normatividad aplicable en Colombia.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
