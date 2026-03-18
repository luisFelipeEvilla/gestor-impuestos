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

Font.registerHyphenationCallback((word: string) => [word]);

export type MandamientoPagoData = {
  proyectorNombre: string | null;
  firmadorNombre: string | null;
  proceso: {
    id: number;
    noComparendo: string | null;
    montoCop: string;
    montoMultaCop: string | null;
    vigencia: number;
    periodo: string | null;
    fechaAplicacionImpuesto: string | null;
    vehiculoPlaca: string | null;
  };
  contribuyente: {
    nombreRazonSocial: string;
    nit: string;
    tipoDocumento: string;
    direccion: string | null;
    email: string | null;
    ciudad: string | null;
  };
  ordenResolucion: {
    numeroResolucion: string;
    fechaResolucion: string | null;
    codigoInfraccion: string | null;
  } | null;
  logoPath: string;
  fechaGeneracion: Date;
  /** Imagen de firma en base64 data URL (ej: data:image/png;base64,...) para embeber en el PDF */
  signatureImageBase64?: string | null;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFechaLarga(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-CO", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatFechaCorta(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-CO", { timeZone: "UTC", dateStyle: "short" });
}

function formatMonto(value: string | null | undefined): string {
  if (!value) return "—";
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(num);
}

function labelTipoDoc(tipo: string): string {
  const map: Record<string, string> = {
    nit: "NIT",
    cedula: "C.C.",
    cedula_ecuatoriana: "C.C. Ecuatoriana",
    cedula_venezolana: "C.C. Venezolana",
    cedula_extranjeria: "C.E.",
    pasaporte: "Pasaporte",
    permiso_proteccion_temporal: "PPT",
    tarjeta_identidad: "T.I.",
  };
  return map[tipo] ?? tipo.toUpperCase();
}

/** Convierte un entero positivo a su representación en palabras en español (Colombia). */
function numberToWords(input: number): string {
  const n = Math.round(input);
  if (n === 0) return "CERO";

  const ONES = [
    "", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
    "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS",
    "DIECISIETE", "DIECIOCHO", "DIECINUEVE",
  ];
  const TENS = [
    "", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA",
    "SESENTA", "SETENTA", "OCHENTA", "NOVENTA",
  ];
  const HUNDREDS = [
    "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
    "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS",
  ];
  const VEINTI = [
    "", "VEINTIÚN", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO",
    "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE",
  ];

  const below100 = (num: number): string => {
    if (num < 20) return ONES[num]!;
    const t = Math.floor(num / 10);
    const o = num % 10;
    if (num <= 29) return VEINTI[o]!;
    return TENS[t]! + (o > 0 ? " Y " + ONES[o]! : "");
  };

  const below1000 = (num: number): string => {
    if (num === 0) return "";
    if (num === 100) return "CIEN";
    const h = Math.floor(num / 100);
    const rest = num % 100;
    return [h > 0 ? HUNDREDS[h]! : "", rest > 0 ? below100(rest) : ""]
      .filter(Boolean)
      .join(" ");
  };

  const billions  = Math.floor(n / 1_000_000_000);
  const millions  = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;
  const hasHigherThanThousands = billions > 0 || millions > 0;

  const parts: string[] = [];
  if (billions > 0)
    parts.push(below1000(billions) + (billions === 1 ? " MIL MILLÓN" : " MIL MILLONES"));
  if (millions > 0)
    parts.push(millions === 1 ? "UN MILLÓN" : below1000(millions) + " MILLONES");
  if (thousands > 0)
    parts.push(
      thousands === 1
        ? hasHigherThanThousands ? "UN MIL" : "MIL"
        : below1000(thousands) + " MIL",
    );
  if (remainder > 0) parts.push(below1000(remainder));

  return parts.join(" ");
}

/**
 * Devuelve el monto en letras más el valor numérico entre paréntesis.
 * Ej: "UN MILLÓN CUARENTA Y CINCO MIL QUINIENTOS NOVENTA PESOS ($1.045.590)"
 */
function formatMontoEnLetras(value: string | null | undefined): string {
  if (!value) return "CERO PESOS ($0)";
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return "CERO PESOS ($0)";
  const rounded = Math.round(num);
  const enLetras = numberToWords(rounded);
  const numerico = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(rounded);
  return `${enLetras} PESOS (${numerico})`;
}

// ─── Colors ─────────────────────────────────────────────────────────────────

const C = {
  black: "#000000",
  white: "#ffffff",
  yellow: "#FCD116",
  blue: "#003087",
  red: "#CE1126",
  border: "#cccccc",
  muted: "#555555",
};

// ─── Layout constants ────────────────────────────────────────────────────────

const H_PAD = 50;
const FOOTER_H = 36;

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  underline: {
    textDecoration: "underline",
  },
  page: {
    paddingBottom: FOOTER_H + 10,
    paddingLeft: H_PAD,
    paddingRight: H_PAD,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.black,
  },

  // ── Fixed header ──
  header: {
    marginLeft: -H_PAD,
    marginRight: -H_PAD,
    marginBottom: 12,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logo: {
    width: 180,
    height: 33,
    objectFit: "contain",
  },
  tricolorBar: {
    flexDirection: "row",
    height: 6,
  },
  barYellow: { flex: 2, backgroundColor: C.yellow },
  barBlue: { flex: 1, backgroundColor: C.blue },
  barRed: { flex: 1, backgroundColor: C.red },
  titleBlock: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    alignItems: "center",
  },
  titleLine: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    lineHeight: 1.4,
  },
  docInfoBlock: {
    paddingHorizontal: H_PAD,
    paddingTop: 6,
    alignItems: "center",
  },
  docInfoLine: {
    fontSize: 9,
    textAlign: "center",
    lineHeight: 1.45,
  },
  subtitleBlock: {
    paddingHorizontal: H_PAD,
    paddingTop: 4,
    paddingBottom: 10,
    alignItems: "center",
  },
  subtitleLine: {
    fontSize: 9,
    textAlign: "center",
    lineHeight: 1.5,
  },

  // ── Fixed footer ──
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingHorizontal: H_PAD,
    paddingVertical: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 6.5,
    color: C.muted,
    lineHeight: 1.4,
  },
  pageNumber: {
    position: "absolute",
    bottom: 14,
    right: H_PAD,
    fontSize: 8,
    color: C.muted,
  },

  // ── Content ──
  dataBlock: {
    marginBottom: 14,
    marginTop: 4,
  },
  dataRow: {
    flexDirection: "row",
    marginBottom: 3,
    flexWrap: "wrap",
  },
  dataLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  dataValue: {
    fontSize: 10,
  },

  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 10,
    marginTop: 6,
  },

  para: {
    marginBottom: 10,
    fontSize: 10,
    textAlign: "justify",
    lineHeight: 1.5,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  italic: {
    fontFamily: "Helvetica-Oblique",
  },

  // ── Table ──
  table: {
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    marginTop: 6,
  },
  tHRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tHCell: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: C.border,
    lineHeight: 1.3,
  },
  tRow: {
    flexDirection: "row",
  },
  tCell: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontSize: 9,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  colNo: { width: 130 },
  colFecha: { width: 52 },
  colNoRes: { width: 115 },
  colFechaRes: { width: 60 },
  colValor: { width: 78 },
  colCodigo: { width: 55, borderRightWidth: 0 },

  // ── Resuelve ──
  resuelveTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  notifTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 14,
    marginBottom: 6,
  },

  // ── Signature ──
  signBlock: {
    marginTop: 16,
    alignItems: "center",
  },
  signLine: {
    fontSize: 10,
    lineHeight: 1.6,
    textAlign: "center",
  },

  // ── Author block ──
  authorBlock: {
    marginTop: 20,
  },
  authorRow: {
    marginBottom: 14,
  },
  authorLabel: {
    fontSize: 10,
    lineHeight: 1.5,
  },
});

// ─── Sub-components ──────────────────────────────────────────────────────────

function PageHeader({
  logoPath,
  expediente,
  resolucion,
  fechaGeneracion,
}: {
  logoPath: string;
  expediente: string;
  resolucion: string;
  fechaGeneracion: string;
}) {
  return (
    <View style={s.header} fixed>
      {/* Logo row */}
      <View style={s.logoRow}>
        <Image src={logoPath} style={s.logo} />
      </View>

      {/* Colombian flag tricolor */}
      <View style={s.tricolorBar}>
        <View style={s.barYellow} />
        <View style={s.barBlue} />
        <View style={s.barRed} />
      </View>

      {/* Institution title */}
      <View style={s.titleBlock}>
        <Text style={s.titleLine}>REPÚBLICA DE COLOMBIA</Text>
        <Text style={s.titleLine}>GOBERNACIÓN DEL MAGDALENA</Text>
        <Text style={s.titleLine}>SECRETARIA DE HACIENDA - OFICINA DE COBRO COACTIVO</Text>
      </View>

      {/* Document info */}
      <View style={s.docInfoBlock}>
        <Text style={s.docInfoLine}>Expediente No. {expediente}</Text>
        <Text style={s.docInfoLine}>Resolución No. {resolucion}</Text>
        <Text style={s.docInfoLine}>{fechaGeneracion}</Text>
      </View>

      {/* Subtitle */}
      <View style={s.subtitleBlock}>
        <Text style={s.subtitleLine}>
          Por medio de la cual se libra mandamiento de pago en un proceso de cobro administrativo
        </Text>
        <Text style={s.subtitleLine}>coactivo</Text>
      </View>
    </View>
  );
}

function PageFooter() {
  return (
    <>
      <View style={s.footer} fixed>
        <Text style={s.footerText}>
          {"Carrera 1c Nº 16-15 Palacio Tayrona  ·  PBX: 5-4381144  ·  Código Postal: 470004\nwww.magdalena.gov.co  ·  contactenos@magdalena.gov.co"}
        </Text>
        <Text style={s.footerText}>
          {"@gobernaciondelmagdalena  ·  @MagdalenaGober  ·  @magdalenaGober"}
        </Text>
      </View>
      <Text
        style={s.pageNumber}
        fixed
        render={({ pageNumber }) => `${pageNumber}`}
      />
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function MandamientoPagoPdfDocument({ data }: { data: MandamientoPagoData }) {
  const { proceso, contribuyente, ordenResolucion, logoPath, fechaGeneracion, proyectorNombre, firmadorNombre, signatureImageBase64 } = data;

  const expedienteNo = proceso.noComparendo ?? "—";
  const resolucionNo = ordenResolucion?.numeroResolucion ?? proceso.noComparendo ?? "—";
  const fechaResolucionStr = ordenResolucion?.fechaResolucion
    ? formatFechaCorta(ordenResolucion.fechaResolucion)
    : proceso.fechaAplicacionImpuesto
      ? formatFechaCorta(proceso.fechaAplicacionImpuesto)
      : "—";
  const fechaAplicacionImpuestoStr = proceso.fechaAplicacionImpuesto
    ? formatFechaLarga(proceso.fechaAplicacionImpuesto)
    : "—";
  const ciudadFecha = `${"SANTA MARTA"}, ${formatFechaLarga(fechaGeneracion)}`;
  const tipoDocLabel = labelTipoDoc(contribuyente.tipoDocumento);
  const identificacion = `${tipoDocLabel} ${contribuyente.nit}`;
  const montoFormateado = formatMonto(proceso.montoMultaCop);
  const codigoInfraccion = ordenResolucion?.codigoInfraccion ?? proceso.periodo ?? "—";
  const placa = proceso.vehiculoPlaca ?? "";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Fixed header (every page) ── */}
        <PageHeader
          logoPath={logoPath}
          expediente={expedienteNo}
          resolucion={resolucionNo}
          fechaGeneracion={formatFechaLarga(fechaGeneracion)}
        />

        {/* ── Fixed footer (every page) ── */}
        <PageFooter />

        {/* ════════════════════════════════════════
            PAGE 1 CONTENT
            ════════════════════════════════════════ */}

        {/* Infractor data block */}
        <View style={s.dataBlock}>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>CIUDAD Y FECHA</Text>
            <Text style={s.dataValue}> : {ciudadFecha}</Text>
          </View>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>INFRACTOR</Text>
            <Text style={s.dataValue}> : {contribuyente.nombreRazonSocial}</Text>
          </View>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>IDENTIFICACIÓN</Text>
            <Text style={s.dataValue}> : {identificacion}</Text>
          </View>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>DIRECCIÓN</Text>
            <Text style={s.dataValue}> : {contribuyente.direccion ?? "—"}</Text>
          </View>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>CORREO ELECTRÓNICO:</Text>
            <Text style={s.dataValue}> {contribuyente.email ?? "—"}</Text>
          </View>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>VEHÍCULO DE PLACAS</Text>
            <Text style={s.dataValue}> : {placa}</Text>
          </View>
        </View>

        {/* CONSIDERANDO */}
        <Text style={s.sectionTitle}>CONSIDERANDO</Text>

        {/* PRIMERO */}
        <Text style={s.para}>
          <Text style={s.bold}>PRIMERO.- </Text>
          <Text>
            {"Que la Oficina de Gestión Tributaria y Cobro Coactivo del Magdalena, con fundamento en las facultades conferidas en el artículo 136 de la Ley 769 de 2002 modificada por el artículo 24 de la Ley 1383 de 2010, modificado por el artículo 205 del Decreto 019 de 2002 expidió la resolución Sanción No. "}
          </Text>
          <Text style={s.bold}>{resolucionNo}</Text>
          <Text>{" de fecha "}</Text>
          <Text style={s.bold}>
            {ordenResolucion?.fechaResolucion ? formatFechaLarga(ordenResolucion.fechaResolucion) : "—"}
          </Text>
          <Text>{", "}</Text>
          <Text style={s.italic}>{'"Por medio de la cual se impone una medida correctiva de una Multa a un conductor infractor"'}</Text>
          <Text>{", contra el señor(a) "}</Text>
          <Text style={s.bold}>{contribuyente.nombreRazonSocial}</Text>
          <Text>{", identificado(a) con cédula de ciudadanía y/o Nit No. "}</Text>
          <Text style={s.bold}>{contribuyente.nit}</Text>
          <Text>{", en calidad de conductor del vehículo de placa "}</Text>
          <Text style={s.bold}>{placa}</Text>
          <Text>{" con el cual se realizó la infracción."}</Text>
        </Text>

        {/* SEGUNDO */}
        <Text style={s.para}>
          <Text style={s.bold}>SEGUNDO.- </Text>
          <Text>
            Que de conformidad con el artículo 140 y artículo 159 de la Ley 769 del 2002, modificado
            por el artículo 26 de la Ley 1383 de 2010, modificado por el artículo 206 del Decreto 019
            de 2012, la ejecución de las sanciones que se impongan por violación a las normas de
            tránsito quedan a cargo de las autoridades de tránsito de la jurisdicción donde se cometió
            el hecho, quien(es) estarán investidas de jurisdicción coactiva para el cobro, en uso de
            las facultades legales que le confiere el artículo 59 de la Ley 788 de 2002.
          </Text>
        </Text>

        {/* TERCERO */}
        <Text style={s.para}>
          <Text style={s.bold}>TERCERO.- </Text>
          <Text>
            {"Que según el acervo probatorio y la base de datos que reposa en la Oficina de Tránsito y Transporte del Departamento del Magdalena, se encuentran registradas como obligaciones impagadas por el ciudadano "}
          </Text>
          <Text style={s.bold}>{contribuyente.nombreRazonSocial}</Text>
          <Text>{", identificado(a) con cédula de ciudadanía y/o Nit No. "}</Text>
          <Text style={s.bold}>{contribuyente.nit}</Text>
          <Text>{", la Multa impuesta por violación a las normas del Código Nacional de Tránsito que a continuación se detalla:"}</Text>
        </Text>

        {/* Table */}
        <View style={s.table} wrap={false}>
          <View style={s.tHRow}>
            <Text style={[s.tHCell, s.colNo]}>No. Comparendo</Text>
            <Text style={[s.tHCell, s.colFecha]}>FECHA{"\n"} Comparendo</Text>
            <Text style={[s.tHCell, s.colNoRes]}>No. RESOLUCIÓN{"\n"}SANCIÓN</Text>
            <Text style={[s.tHCell, s.colFechaRes]}>FECHA DE RESOLUCIÓN{"\n"}SANCIÓN</Text>
            <Text style={[s.tHCell, s.colValor]}>VALOR INFRACCIÓN</Text>
            <Text style={[s.tHCell, s.colCodigo]}>CÓDIGO DE{"\n"}INFRACCIÓN</Text>
          </View>
          <View style={s.tRow}>
            <Text style={[s.tCell, s.colNo]}>{proceso.noComparendo ?? "—"}</Text>
            <Text style={[s.tCell, s.colFecha]}>
              {proceso.fechaAplicacionImpuesto
                ? formatFechaCorta(proceso.fechaAplicacionImpuesto)
                : "—"}
            </Text>
            <Text style={[s.tCell, s.colNoRes]}>{proceso.noComparendo ?? "—"}</Text>
            <Text style={[s.tCell, s.colFechaRes]}>{fechaResolucionStr}</Text>
            <Text style={[s.tCell, s.colValor]}>{montoFormateado}</Text>
            <Text style={[s.tCell, s.colCodigo]}>{codigoInfraccion}</Text>
          </View>
        </View>

        {/* CUARTO */}
        <Text style={s.para}>
          <Text style={s.bold}>CUARTO.- </Text>
          <Text>
            Que la multa impuesta al infractor {contribuyente.nombreRazonSocial} fue notificada {fechaAplicacionImpuestoStr}, sin que dentro del término de
            Ley se presentara recurso alguno por el deudor, razón por la cual el acto administrativo
            se encuentra debidamente ejecutoriado. Que la obligación contenida en el acto
            administrativo en referencia no ha sido cancelada por el deudor debiéndose liquidar la
            deuda hasta cuando se efectúe el pago, además de los gastos y costas del proceso.
          </Text>
        </Text>

        {/* ════════════════════════════════════════
            PAGE 2 CONTENT (continues naturally)
            ════════════════════════════════════════ */}

        {/* QUINTO */}
        <Text style={s.para}>
          <Text style={s.bold}>QUINTO.- </Text>
          <Text>
            Que los documentos referidos en el considerando No. (3) TERCERO de este acto
            administrativo que obran en la actuación, prestan mérito ejecutivo al contener en su
            conjunto como título ejecutivo complejo una obligación clara, expresa y exigible en contra
            del deudor, siendo procedente librar mandamiento de pago para que mediante los trámites
            del proceso administrativo coactivo establecido en el título VIII del Estatuto Tributario
            Nacional se obtenga su pago.
          </Text>
        </Text>

        {/* SEXTO */}
        <Text style={s.para}>
          <Text style={s.bold}>SEXTO.- </Text>
          <Text>
            Que para efectos de hacer efectivo el crédito perseguido, procédase a ordenar en
            resolución separada el embargo y secuestro de bienes muebles inmuebles y productos
            financieros existentes en entidades bancarias de propiedad del deudor.
          </Text>
        </Text>

        {/* Expositive paragraph */}
        <Text style={s.para}>
          <Text>{"Por lo antes expuesto, el(la) suscrito(a) "}</Text>
          <Text style={s.bold}>SECRETARIO(A) DE HACIENDA DEPARTAMENTAL DEL MAGDALENA</Text>
          <Text>{" en uso de sus facultades legales,"}</Text>
        </Text>

        {/* RESUELVE */}
        <Text style={s.resuelveTitle}>RESUELVE</Text>

        {/* RESUELVE PRIMERO */}
        <Text style={s.para}>
          <Text style={s.bold}>PRIMERO: </Text>
          <Text style={s.bold}>LÍBRESE MANDAMIENTO DE PAGO</Text>
          <Text>{" en favor de la  "}</Text>
          <Text style={s.bold}>GOBERNACIÓN DEL DEPARTAMENTO DEL MAGDALENA</Text>
          <Text>{", identificada con Nit No. "}</Text>
          <Text style={s.bold}>800.103.920-6 </Text>
          <Text>{" y en contra de "}</Text>
          <Text style={s.bold}>{contribuyente.nombreRazonSocial}</Text>
          <Text>{", identificado(a) con cédula de ciudadanía y/o Nit No. "}</Text>
          <Text style={s.bold}>{contribuyente.nit}</Text>
          <Text>{", por la suma de "}</Text>
          <Text style={s.bold}>{formatMontoEnLetras(proceso.montoMultaCop)} M/L</Text>
          <Text>
            {", por concepto de multas impuestas por la Oficina de Tránsito, según consta en los documentos relacionados en el (3) TERCER considerando de este acto administrativo que obran en la actuación, "}
          </Text>

          <Text style={s.underline}>
             {"más los intereses moratorios que se causen desde la fecha de vencimiento de la obligación y hasta su pago total,"}
          </Text>

          <Text>
            {", liquidados conforme al "}
          </Text>
          <Text style={s.bold}>artículo 836-1 del Estatuto Tributario Nacional</Text>
          <Text>
            {", más los gastos que ha demandado el trámite pertinente para hacer efectiva la deuda y las costas del presente proceso."}
          </Text>
        </Text>

        {/* RESUELVE SEGUNDO */}
        <Text style={s.para}>
          <Text style={s.bold}>SEGUNDO: </Text>
          <Text>
            Notifíquese el presente mandamiento de pago personalmente al ejecutado, previa citación
            para que comparezca en un término de diez (10) días. Si vencido el término no comparece,
            el mandamiento de pago se notificará por correo de conformidad con lo dispuesto en los
            artículos 565 y 826 del Estatuto Tributario.
          </Text>
        </Text>

        {/* RESUELVE TERCERO */}
        <Text style={s.para}>
          <Text style={s.bold}>TERCERO: </Text>
          <Text>
            Adviértase al deudor que dispone de quince (15) días, contados a partir de la notificación
            de esta resolución, para cancelar el monto de la deuda con sus respectivos intereses,
            gastos y costas del proceso. Dentro del mismo término, podrá proponer mediante escrito las
            excepciones legales que estime pertinentes de acuerdo con lo dispuesto en los artículos
            830 y 831 del Estatuto Tributario. Contra el presente acto administrativo no procede
            recurso alguno.
          </Text>
        </Text>

        {/* RESUELVE CUARTO */}
        <Text style={s.para}>
          <Text style={s.bold}>CUARTO: </Text>
          <Text>
            Por resolución separada y con las previsiones de Ley, procédase a decretar el embargo y
            secuestro de bienes de propiedad del deudor a efectos de hacer efectivo el crédito
            impagado.
          </Text>
        </Text>

        {/* NOTIFÍQUESE Y CÚMPLASE */}
        <Text style={s.notifTitle}>NOTIFÍQUESE Y CÚMPLASE</Text>

        {/* Signature */}
        <View style={s.signBlock}>
          {signatureImageBase64 ? (
            <Image src={signatureImageBase64} style={{ width: 160, height: 60, objectFit: "contain", alignSelf: "center" }} />
          ) : (
            <Text style={s.signLine}>(-)</Text>
          )}
          <Text style={[s.signLine, s.bold]}>VIRNA LIZI JOHNSON SALCEDO</Text>
          <Text style={[s.signLine, s.bold]}>
            SECRETARIA DE HACIENDA DEL DEPARTAMENTO DEL MAGDALENA
          </Text>
        </View>

      </Page>

      {/* ════════════════════════════════════════
          ÚLTIMA PÁGINA: atribución de autoría
          ════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader
          logoPath={logoPath}
          expediente={expedienteNo}
          resolucion={resolucionNo}
          fechaGeneracion={formatFechaLarga(fechaGeneracion)}
        />
        <PageFooter />
        <View style={s.authorBlock}>
          <View style={s.authorRow}>
            <Text style={s.authorLabel}>Proyectó: {proyectorNombre ?? "(-)"}</Text>
            <Text style={[s.authorLabel, s.bold]}>Abogado R&R Consultorías SAS.</Text>
          </View>
          <View style={s.authorRow}>
            <Text style={s.authorLabel}>Revisó: {firmadorNombre ?? "(-)"}</Text>
            <Text style={[s.authorLabel, s.bold]}>Abogado Secretaría de Hacienda.</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
