import 'server-only'
import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer'

// Paleta institucional (aproximaciones hex de las CSS custom props de la app)
const INK = '#1a1a1a'      // var(--ink-deep)
const BRASS = '#b08d57'    // var(--brass)
const BONE = '#f5f0e6'     // var(--bone)
const GRAPHITE = '#5c5c5c'

export interface CertificateData {
  fullName: string
  gradeLabel: string
  codigoCgbvp: string | null
  courseTitle: string
  /** Nota final sobre 20, ya formateada (ej. "16.50") */
  finalGrade: string
  /** Fecha de emisión ya formateada en es-PE (ej. "21 de julio de 2026") */
  issueDateEs: string
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: BONE,
    padding: 24,
    fontFamily: 'Helvetica',
  },
  frame: {
    flex: 1,
    borderWidth: 3,
    borderColor: BRASS,
    padding: 4,
  },
  frameInner: {
    flex: 1,
    borderWidth: 1,
    borderColor: INK,
    paddingVertical: 34,
    paddingHorizontal: 54,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
  },
  institution: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 15,
    color: INK,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  subInstitution: {
    fontSize: 9,
    color: GRAPHITE,
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  rule: {
    marginTop: 12,
    width: 120,
    height: 2,
    backgroundColor: BRASS,
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 30,
    color: BRASS,
    letterSpacing: 3,
    textAlign: 'center',
  },
  lead: {
    fontSize: 11,
    color: GRAPHITE,
    textAlign: 'center',
  },
  name: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 26,
    color: INK,
    textAlign: 'center',
  },
  meta: {
    fontSize: 10,
    color: GRAPHITE,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  course: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 16,
    color: INK,
    textAlign: 'center',
  },
  grade: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: BRASS,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
  },
  footerBlock: {
    alignItems: 'center',
    width: 220,
  },
  sigLine: {
    width: 200,
    height: 1,
    backgroundColor: INK,
    marginBottom: 6,
  },
  sigLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: INK,
    textAlign: 'center',
  },
  sigSub: {
    fontSize: 8,
    color: GRAPHITE,
    marginTop: 2,
    textAlign: 'center',
  },
  dateLabel: {
    fontSize: 10,
    color: INK,
    textAlign: 'center',
  },
})

function CertificateDoc({ data }: { data: CertificateData }) {
  const metaParts = [data.gradeLabel]
  if (data.codigoCgbvp) metaParts.push(`Código CGBVP ${data.codigoCgbvp}`)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.frameInner}>
            {/* Encabezado */}
            <View style={styles.header}>
              <Text style={styles.institution}>
                COMPAÑÍA DE BOMBEROS VOLUNTARIOS ANCÓN N.° 163
              </Text>
              <Text style={styles.subInstitution}>
                Cuerpo General de Bomberos Voluntarios del Perú
              </Text>
              <View style={styles.rule} />
            </View>

            {/* Título */}
            <Text style={styles.title}>CERTIFICADO DE APROBACIÓN</Text>

            {/* Cuerpo */}
            <View style={{ alignItems: 'center', width: '100%' }}>
              <Text style={styles.lead}>Se otorga el presente certificado a</Text>
              <Text style={[styles.name, { marginTop: 8 }]}>{data.fullName}</Text>
              <Text style={[styles.meta, { marginTop: 4 }]}>{metaParts.join('  ·  ')}</Text>

              <Text style={[styles.lead, { marginTop: 16 }]}>
                por haber aprobado satisfactoriamente el curso
              </Text>
              <Text style={[styles.course, { marginTop: 6 }]}>{data.courseTitle}</Text>
              <Text style={[styles.grade, { marginTop: 10 }]}>
                Calificación final: {data.finalGrade} / 20
              </Text>
            </View>

            {/* Pie: fecha + firma */}
            <View style={styles.footerRow}>
              <View style={styles.footerBlock}>
                <Text style={styles.dateLabel}>Ancón, {data.issueDateEs}</Text>
              </View>
              <View style={styles.footerBlock}>
                <View style={styles.sigLine} />
                <Text style={styles.sigLabel}>Jefe de la Sección de Instrucción</Text>
                <Text style={styles.sigSub}>C.B.V. Ancón N.° 163</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

/** Genera el PDF del certificado y devuelve el buffer (Lambda-compatible). */
export async function renderCertificatePdf(data: CertificateData): Promise<Buffer> {
  return renderToBuffer(<CertificateDoc data={data} />)
}
