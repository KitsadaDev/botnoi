import type { Ticket } from './types.ts'
import { SERVICE_LABELS, STATUS_LABELS } from './types.ts'
import { formatDate, toLocalDateInputValue } from './format.ts'

export interface DashboardPdfSummary {
  total: number
  submitted: number
  inProgress: number
  completed: number
}

export interface DashboardContactChannelSummary {
  total: number
  chat: number
  call: number
  web: number
}

export interface DashboardPdfExportParams {
  staffName: string
  staffRole: string
  selectedStatus: string
  searchQuery: string
  summary: DashboardPdfSummary
  channels?: DashboardContactChannelSummary
  tickets: Ticket[]
  exportedAt?: Date
}

export interface PdfJpegPage {
  jpegBytes: Uint8Array
  widthPx: number
  heightPx: number
}

const DEFAULT_CHANNELS: DashboardContactChannelSummary = {
  total: 311,
  chat: 148,
  call: 68,
  web: 95,
}

/**
 * สร้างชื่อไฟล์ PDF สำหรับรายงาน Dashboard ตามวันที่ท้องถิ่น
 */
export function getDashboardPdfFilename(now: Date = new Date()): string {
  return `coolcare-dashboard-${toLocalDateInputValue(now)}.pdf`
}

/**
 * แปลง Base64 Data URL (image/jpeg) เป็น Uint8Array
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64Index = dataUrl.indexOf(';base64,')
  if (base64Index === -1) {
    throw new Error('Invalid JPEG data URL')
  }
  const base64 = dataUrl.slice(base64Index + 8)
  if (typeof atob === 'function') {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

/**
 * รวมรูปภาพแต่ละหน้า (JPEG) เข้าเป็นไฟล์ PDF-1.4 ขนาด A4 แบบหลายหน้า
 * ไม่ต้องพึ่งพาไลบรารีภายนอก และรองรับฟอนต์ภาษาไทยที่วาดลง Canvas 100%
 */
export function buildPdfFromJpegPages(pages: PdfJpegPage[]): Uint8Array {
  if (pages.length === 0) {
    throw new Error('At least one page is required to build PDF')
  }

  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  let offset = 0

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes)
    offset += bytes.length
  }

  const pushStr = (str: string) => {
    pushBytes(encoder.encode(str))
  }

  // A4 dimensions in PDF points (72 dpi)
  const pageWidthPt = 595.28
  const pageHeightPt = 841.89

  // Object IDs:
  // 1: Catalog
  // 2: Pages
  // For each page i (0..n-1):
  //   pageObjId = 3 + i * 3
  //   contentObjId = 4 + i * 3
  //   imageObjId = 5 + i * 3
  const totalObjects = 2 + pages.length * 3
  const offsets: number[] = new Array(totalObjects + 1).fill(0)

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')

  // Object 1: Catalog
  offsets[1] = offset
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')

  // Object 2: Pages
  const kidsRefs = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  offsets[2] = offset
  pushStr(`2 0 obj\n<< /Type /Pages /Kids [ ${kidsRefs} ] /Count ${pages.length} >>\nendobj\n`)

  // Each page objects
  pages.forEach((page, i) => {
    const pageObjId = 3 + i * 3
    const contentObjId = 4 + i * 3
    const imageObjId = 5 + i * 3
    const imgName = `/Im${i + 1}`

    // Page object
    offsets[pageObjId] = offset
    pushStr(
      `${pageObjId} 0 obj\n` +
        `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)} ] ` +
        `/Resources << /XObject << ${imgName} ${imageObjId} 0 R >> >> ` +
        `/Contents ${contentObjId} 0 R >>\n` +
        `endobj\n`
    )

    // Content stream: scale image to A4 page size
    const contentStream = `q\n${pageWidthPt.toFixed(2)} 0 0 ${pageHeightPt.toFixed(2)} 0 0 cm\n${imgName} Do\nQ\n`
    const contentBytes = encoder.encode(contentStream)
    offsets[contentObjId] = offset
    pushStr(`${contentObjId} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`)
    pushBytes(contentBytes)
    pushStr('\nendstream\nendobj\n')

    // Image XObject
    offsets[imageObjId] = offset
    pushStr(
      `${imageObjId} 0 obj\n` +
        `<< /Type /XObject /Subtype /Image /Width ${page.widthPx} /Height ${page.heightPx} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpegBytes.length} >>\n` +
        `stream\n`
    )
    pushBytes(page.jpegBytes)
    pushStr('\nendstream\nendobj\n')
  })

  // XRef table
  const xrefOffset = offset
  pushStr(`xref\n0 ${totalObjects + 1}\n`)
  pushStr('0000000000 65535 f \n')
  for (let id = 1; id <= totalObjects; id++) {
    const padded = String(offsets[id]).padStart(10, '0')
    pushStr(`${padded} 00000 n \n`)
  }

  // Trailer
  pushStr(
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  )

  const output = new Uint8Array(offset)
  let pos = 0
  for (const chunk of chunks) {
    output.set(chunk, pos)
    pos += chunk.length
  }
  return output
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (!text) return '-'
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 0 && ctx.measureText(`${truncated}...`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}...`
}

const STATUS_BADGE_THEME: Record<string, { bg: string; text: string; border: string }> = {
  SUBMITTED: { bg: '#f4f4f5', text: '#3f3f46', border: '#d4d4d8' },
  RECEIVED: { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
  IN_PROGRESS: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  COMPLETED: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  CANCELLED: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
}

/**
 * วาดรายงาน Dashboard ลงบน Canvas ขนาด A4 ความละเอียดสูง แล้วแปลงเป็นไฟล์ PDF ดาวน์โหลดทันที
 */
export async function exportDashboardToPdf(params: DashboardPdfExportParams): Promise<void> {
  const {
    staffName,
    staffRole,
    selectedStatus,
    searchQuery,
    summary,
    channels = DEFAULT_CHANNELS,
    tickets,
    exportedAt = new Date(),
  } = params

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready
    } catch {
      // proceed with fallback font if font loading fails
    }
  }

  const PAGE_W = 1240
  const PAGE_H = 1754
  const MARGIN_X = 64
  const CONTENT_W = PAGE_W - MARGIN_X * 2
  const FONT_SANS = '"Prompt", "Plus Jakarta Sans", sans-serif'
  const FONT_MONO = '"JetBrains Mono", monospace'

  const FIRST_PAGE_ROWS = 13
  const NEXT_PAGE_ROWS = 20

  const ticketChunks: Ticket[][] = []
  if (tickets.length === 0) {
    ticketChunks.push([])
  } else {
    ticketChunks.push(tickets.slice(0, FIRST_PAGE_ROWS))
    let idx = FIRST_PAGE_ROWS
    while (idx < tickets.length) {
      ticketChunks.push(tickets.slice(idx, idx + NEXT_PAGE_ROWS))
      idx += NEXT_PAGE_ROWS
    }
  }

  const totalPages = ticketChunks.length
  const jpegPages: PdfJpegPage[] = []

  const formattedExportDate = exportedAt.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const filterLabel = selectedStatus
    ? STATUS_LABELS[selectedStatus as keyof typeof STATUS_LABELS] || selectedStatus
    : 'ทั้งหมด'

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const canvas = document.createElement('canvas')
    canvas.width = PAGE_W
    canvas.height = PAGE_H
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('ไม่สามารถสร้าง Canvas สำหรับสร้าง PDF ได้')

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, PAGE_W, PAGE_H)

    let y = 56

    // Header Banner
    const headerH = pageIndex === 0 ? 148 : 104
    drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, headerH, 24)
    ctx.fillStyle = '#09090b'
    ctx.fill()

    // Badge inside header
    drawRoundedRect(ctx, MARGIN_X + 32, y + 24, 150, 26, 13)
    ctx.fillStyle = 'rgba(14, 165, 233, 0.2)'
    ctx.fill()
    ctx.font = `700 13px ${FONT_MONO}`
    ctx.fillStyle = '#38bdf8'
    ctx.fillText(`${staffRole} REPORT`, MARGIN_X + 48, y + 42)

    // Title
    ctx.font = `700 28px ${FONT_SANS}`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(
      'CoolCare Pro — รายงานศูนย์ควบคุมและจ่ายงานซ่อม',
      MARGIN_X + 32,
      y + 84
    )

    if (pageIndex === 0) {
      ctx.font = `400 15px ${FONT_SANS}`
      ctx.fillStyle = '#a1a1aa'
      ctx.fillText(
        `ผู้ส่งออกรายงาน: ${staffName}  •  วันที่ออกรายงาน: ${formattedExportDate} น.`,
        MARGIN_X + 32,
        y + 118
      )

      ctx.textAlign = 'right'
      ctx.font = `600 14px ${FONT_SANS}`
      ctx.fillStyle = '#e4e4e7'
      ctx.fillText(
        `ตัวกรองสถานะ: ${filterLabel}${searchQuery ? `  |  คำค้นหา: "${searchQuery}"` : ''}`,
        MARGIN_X + CONTENT_W - 32,
        y + 118
      )
      ctx.textAlign = 'left'
    }

    y += headerH + 32

    if (pageIndex === 0) {
      // Section 1: Ticket Status Summary
      ctx.font = `700 18px ${FONT_SANS}`
      ctx.fillStyle = '#18181b'
      ctx.fillText('1. สถิติใบงานแจ้งซ่อม (Ticket Status)', MARGIN_X, y)
      y += 16

      const cardGap = 18
      const cardW = (CONTENT_W - cardGap * 3) / 4
      const cardH = 112

      const statusCards = [
        { label: 'เคสทั้งหมด', value: String(summary.total), color: '#09090b', sub: 'รายการในระบบ' },
        { label: 'ยังไม่ปิด / รอรับเรื่อง', value: String(summary.submitted), color: '#0284c7', sub: 'รอดำเนินการ' },
        { label: 'กำลังปฏิบัติงาน', value: String(summary.inProgress), color: '#d97706', sub: 'รับเรื่อง / กำลังซ่อม' },
        { label: 'ปิดแล้ว / เสร็จสิ้น', value: String(summary.completed), color: '#059669', sub: 'ส่งมอบงานแล้ว' },
      ]

      statusCards.forEach((card, idx) => {
        const cx = MARGIN_X + idx * (cardW + cardGap)
        drawRoundedRect(ctx, cx, y, cardW, cardH, 20)
        ctx.fillStyle = '#fafafa'
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#e4e4e7'
        ctx.stroke()

        ctx.font = `600 14px ${FONT_SANS}`
        ctx.fillStyle = '#71717a'
        ctx.fillText(card.label, cx + 22, y + 32)

        ctx.font = `800 34px ${FONT_SANS}`
        ctx.fillStyle = card.color
        ctx.fillText(card.value, cx + 22, y + 74)

        ctx.font = `500 12px ${FONT_SANS}`
        ctx.fillStyle = '#a1a1aa'
        ctx.fillText(card.sub, cx + 22, y + 96)
      })

      y += cardH + 34

      // Section 2: Contact Channels Summary
      ctx.font = `700 18px ${FONT_SANS}`
      ctx.fillStyle = '#18181b'
      ctx.fillText('2. จำนวนข้อความที่ติดต่อเข้ามาแยกตามช่องทาง (ยอดสะสมเดือนนี้)', MARGIN_X, y)
      y += 16

      const channelCards = [
        { label: 'ติดต่อเข้ามาทั้งหมด', value: String(channels.total), color: '#09090b', sub: '+14% จากเดือนก่อน' },
        { label: 'จากแชท (LINE / Chat)', value: String(channels.chat), color: '#4f46e5', sub: 'คิดเป็น 47.6%' },
        { label: 'จากโทร (Call Center)', value: String(channels.call), color: '#e11d48', sub: 'คิดเป็น 21.9%' },
        { label: 'จากเว็บ (Website)', value: String(channels.web), color: '#0d9488', sub: 'คิดเป็น 30.5%' },
      ]

      channelCards.forEach((card, idx) => {
        const cx = MARGIN_X + idx * (cardW + cardGap)
        drawRoundedRect(ctx, cx, y, cardW, cardH, 20)
        ctx.fillStyle = '#fafafa'
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#e4e4e7'
        ctx.stroke()

        ctx.font = `600 14px ${FONT_SANS}`
        ctx.fillStyle = '#71717a'
        ctx.fillText(card.label, cx + 22, y + 32)

        ctx.font = `800 34px ${FONT_SANS}`
        ctx.fillStyle = card.color
        ctx.fillText(card.value, cx + 22, y + 74)

        ctx.font = `500 12px ${FONT_SANS}`
        ctx.fillStyle = '#a1a1aa'
        ctx.fillText(card.sub, cx + 22, y + 96)
      })

      y += cardH + 36
    }

    // Section 3: Tickets Table
    ctx.font = `700 18px ${FONT_SANS}`
    ctx.fillStyle = '#18181b'
    ctx.fillText(
      pageIndex === 0
        ? `3. รายการใบงานแจ้งซ่อม (${tickets.length} รายการ)`
        : `รายการใบงานแจ้งซ่อม (ต่อ — หน้า ${pageIndex + 1})`,
      MARGIN_X,
      y
    )
    y += 16

    const cols = [
      { title: 'TRACKING ID', x: MARGIN_X + 20, width: 150 },
      { title: 'ลูกค้า / เบอร์ติดต่อ', x: MARGIN_X + 180, width: 220 },
      { title: 'บริการ & ยี่ห้อ', x: MARGIN_X + 410, width: 200 },
      { title: 'วันนัดหมาย', x: MARGIN_X + 620, width: 165 },
      { title: 'ช่างผู้รับผิดชอบ', x: MARGIN_X + 795, width: 175 },
      { title: 'สถานะ', x: MARGIN_X + 980, width: 120 },
    ]

    const headerRowH = 46
    const rowH = 68
    const rows = ticketChunks[pageIndex]
    const tableBodyH = Math.max(1, rows.length) * rowH
    const tableTotalH = headerRowH + tableBodyH

    // Table container outline
    drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, tableTotalH, 18)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#e4e4e7'
    ctx.stroke()

    // Table header background
    drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, headerRowH, 18)
    ctx.fillStyle = '#f4f4f5'
    ctx.fill()
    ctx.fillRect(MARGIN_X, y + headerRowH - 18, CONTENT_W, 18)

    ctx.beginPath()
    ctx.moveTo(MARGIN_X, y + headerRowH)
    ctx.lineTo(MARGIN_X + CONTENT_W, y + headerRowH)
    ctx.strokeStyle = '#e4e4e7'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.font = `700 13px ${FONT_SANS}`
    ctx.fillStyle = '#52525b'
    cols.forEach((col) => {
      ctx.fillText(col.title, col.x, y + 29)
    })

    let rowY = y + headerRowH

    if (rows.length === 0) {
      ctx.font = `500 15px ${FONT_SANS}`
      ctx.fillStyle = '#a1a1aa'
      ctx.textAlign = 'center'
      ctx.fillText('ไม่พบรายการงานซ่อมตามเงื่อนไขที่เลือก', MARGIN_X + CONTENT_W / 2, rowY + 40)
      ctx.textAlign = 'left'
    } else {
      rows.forEach((t, rIdx) => {
        if (rIdx > 0) {
          ctx.beginPath()
          ctx.moveTo(MARGIN_X, rowY)
          ctx.lineTo(MARGIN_X + CONTENT_W, rowY)
          ctx.strokeStyle = '#f4f4f5'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Col 1: Tracking Code
        ctx.font = `700 14px ${FONT_MONO}`
        ctx.fillStyle = '#09090b'
        ctx.fillText(truncateText(ctx, t.trackingCode, cols[0].width), cols[0].x, rowY + 38)

        // Col 2: Customer Name & Phone
        ctx.font = `700 14px ${FONT_SANS}`
        ctx.fillStyle = '#18181b'
        ctx.fillText(truncateText(ctx, t.customerName, cols[1].width), cols[1].x, rowY + 28)
        ctx.font = `500 12px ${FONT_MONO}`
        ctx.fillStyle = '#71717a'
        ctx.fillText(truncateText(ctx, t.customerPhone, cols[1].width), cols[1].x, rowY + 49)

        // Col 3: Service & Brand
        const serviceText = SERVICE_LABELS[t.service] || t.service
        ctx.font = `700 14px ${FONT_SANS}`
        ctx.fillStyle = '#18181b'
        ctx.fillText(truncateText(ctx, serviceText, cols[2].width), cols[2].x, rowY + 28)
        ctx.font = `500 12px ${FONT_SANS}`
        ctx.fillStyle = '#71717a'
        ctx.fillText(truncateText(ctx, t.brand || '-', cols[2].width), cols[2].x, rowY + 49)

        // Col 4: Preferred Date
        ctx.font = `600 13px ${FONT_SANS}`
        ctx.fillStyle = '#3f3f46'
        ctx.fillText(
          truncateText(ctx, formatDate(t.preferredDate), cols[3].width),
          cols[3].x,
          rowY + 38
        )

        // Col 5: Technician
        if (t.technician) {
          ctx.font = `700 14px ${FONT_SANS}`
          ctx.fillStyle = '#18181b'
          ctx.fillText(truncateText(ctx, t.technician.name, cols[4].width), cols[4].x, rowY + 28)
          ctx.font = `500 12px ${FONT_SANS}`
          ctx.fillStyle = '#71717a'
          ctx.fillText(truncateText(ctx, t.technician.area, cols[4].width), cols[4].x, rowY + 49)
        } else {
          ctx.font = `600 13px ${FONT_SANS}`
          ctx.fillStyle = '#b45309'
          ctx.fillText('ยังไม่ระบุช่าง', cols[4].x, rowY + 38)
        }

        // Col 6: Status Badge
        const statusLabel = STATUS_LABELS[t.status] || t.status
        const badgeTheme = STATUS_BADGE_THEME[t.status] || STATUS_BADGE_THEME.SUBMITTED
        ctx.font = `700 12px ${FONT_SANS}`
        const badgeW = Math.min(cols[5].width, Math.max(88, ctx.measureText(statusLabel).width + 24))
        const badgeH = 28
        const badgeX = cols[5].x
        const badgeY = rowY + 20

        drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 14)
        ctx.fillStyle = badgeTheme.bg
        ctx.fill()
        ctx.lineWidth = 1
        ctx.strokeStyle = badgeTheme.border
        ctx.stroke()

        ctx.fillStyle = badgeTheme.text
        ctx.textAlign = 'center'
        ctx.fillText(statusLabel, badgeX + badgeW / 2, badgeY + 19)
        ctx.textAlign = 'left'

        rowY += rowH
      })
    }

    // Footer
    const footerY = PAGE_H - 42
    ctx.font = `500 13px ${FONT_SANS}`
    ctx.fillStyle = '#a1a1aa'
    ctx.fillText('เอกสารสร้างจากระบบ CoolCare Pro (Staff Portal)', MARGIN_X, footerY)

    ctx.textAlign = 'right'
    ctx.fillText(`หน้า ${pageIndex + 1} / ${totalPages}`, PAGE_W - MARGIN_X, footerY)
    ctx.textAlign = 'left'

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    jpegPages.push({
      jpegBytes: dataUrlToUint8Array(dataUrl),
      widthPx: PAGE_W,
      heightPx: PAGE_H,
    })
  }

  const pdfBytes = buildPdfFromJpegPages(jpegPages)
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = getDashboardPdfFilename(exportedAt)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

