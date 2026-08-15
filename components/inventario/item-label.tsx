"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import bwipjs from "bwip-js"
import { Button } from "@/components/ui/button"
import { Printer, Loader2 } from "lucide-react"

interface LabelData {
  itemId: string
  name: string
  category: string
  serialNumber?: string | null
  unitMeasure?: string | null
}

interface Props {
  items: LabelData[]
  baseUrl: string
}

function ItemLabelCard({ item, baseUrl, index }: { item: LabelData; baseUrl: string; index: number }) {
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const barcodeRef = useRef<HTMLCanvasElement>(null)

  const movUrl = `${baseUrl}/registro/movimiento/${item.itemId}`
  // Barcode text: short item code (first 12 chars of UUID without hyphens)
  const barText = item.itemId.replace(/-/g, '').slice(0, 12).toUpperCase()

  useEffect(() => {
    QRCode.toDataURL(movUrl, { width: 96, margin: 1, color: { dark: '#000', light: '#fff' } })
      .then(setQrSrc)
      .catch(console.error)
  }, [movUrl])

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        bwipjs.toCanvas(barcodeRef.current, {
          bcid: 'code128',
          text: barText,
          scale: 2,
          height: 10,
          includetext: true,
          textsize: 8,
          textxalign: 'center',
        })
      } catch (e) {
        console.error(e)
      }
    }
  }, [barText])

  return (
    <div
      className="label-card"
      style={{
        width: '7cm',
        minHeight: '4cm',
        border: '1px solid #222',
        borderRadius: '6px',
        padding: '8px',
        background: '#fff',
        color: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      {/* Header */}
      <div style={{ width: '100%', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '2px' }}>
        <p style={{ fontSize: '7px', fontWeight: 700, letterSpacing: '0.1em', color: '#c00', textTransform: 'uppercase', fontFamily: 'monospace' }}>
          CGBVP · CIA. 163 ANCÓN
        </p>
      </div>

      {/* Nombre */}
      <p style={{ fontSize: '9px', fontWeight: 700, textAlign: 'center', maxWidth: '100%', wordBreak: 'break-word' }}>
        {item.name}
      </p>
      {item.unitMeasure && (
        <p style={{ fontSize: '7px', color: '#555' }}>Unidad: {item.unitMeasure}</p>
      )}

      {/* QR + Barcode side by side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        {qrSrc ? (
          <img src={qrSrc} alt="QR" style={{ width: '72px', height: '72px', imageRendering: 'pixelated' }} />
        ) : (
          <div style={{ width: '72px', height: '72px', background: '#eee', borderRadius: '4px' }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <canvas ref={barcodeRef} style={{ maxWidth: '90px' }} />
        </div>
      </div>

      {/* ID corto */}
      <p style={{ fontSize: '6px', color: '#888', fontFamily: 'monospace', marginTop: '2px' }}>
        ID: {item.itemId.slice(0, 8).toUpperCase()}
      </p>
    </div>
  )
}

export function ItemLabels({ items, baseUrl }: Props) {
  function handlePrint() {
    window.print()
  }

  return (
    <div>
      {/* Botón (oculto al imprimir) */}
      <div className="no-print flex justify-end mb-4">
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir etiquetas ({items.length})
        </Button>
      </div>

      {/* Grid de etiquetas */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'flex-start',
        }}
      >
        {items.map((item, i) => (
          <ItemLabelCard key={item.itemId} item={item} baseUrl={baseUrl} index={i} />
        ))}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .label-card, .label-card * { visibility: visible; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  )
}
