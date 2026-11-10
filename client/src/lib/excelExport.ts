import type { Ticket } from './types.ts'
import { SERVICE_LABELS, STATUS_LABELS } from './types.ts'
import { formatDate, toLocalDateInputValue } from './format.ts'
import type { DashboardPdfSummary, DashboardContactChannelSummary } from './pdfExport.ts'

export interface DashboardExcelExportParams {
  staffName: string
  staffRole: string
  selectedStatus: string
  searchQuery: string
  summary: DashboardPdfSummary
  channels?: DashboardContactChannelSummary
  tickets: Ticket[]
  exportedAt?: Date
}

const DEFAULT_CHANNELS: DashboardContactChannelSummary = {
  total: 311,
  chat: 148,
  call: 68,
  web: 95,
}

/**
 * สร้างชื่อไฟล์ Excel (.xlsx) สำหรับรายงาน Dashboard ตามวันที่ท้องถิ่น
 */
export function getDashboardExcelFilename(now: Date = new Date()): string {
  return `plasom-dashboard-${toLocalDateInputValue(now)}.xlsx`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function columnNumberToName(colNumber: number): string {
  let n = colNumber
  let name = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

type CellValue = string | number

interface CellSpec {
  value: CellValue
  style?: number
}

function buildWorksheetXml(
  rows: (CellValue | CellSpec)[][],
  colWidths: number[]
): string {
  const colsXml =
    colWidths.length > 0
      ? `<cols>${colWidths
          .map(
            (w, idx) =>
              `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`
          )
          .join('')}</cols>`
      : ''

  const rowsXml = rows
    .map((row, rIdx) => {
      const rowNum = rIdx + 1
      const cellsXml = row
        .map((cell, cIdx) => {
          const ref = `${columnNumberToName(cIdx + 1)}${rowNum}`
          const isSpec = typeof cell === 'object' && cell !== null
          const val = isSpec ? cell.value : cell
          const styleAttr = isSpec && cell.style !== undefined ? ` s="${cell.style}"` : ''

          if (typeof val === 'number' && Number.isFinite(val)) {
            return `<c r="${ref}"${styleAttr}><v>${val}</v></c>`
          }
          const strVal = escapeXml(String(val ?? ''))
          return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${strVal}</t></is></c>`
        })
        .join('')
      return `<row r="${rowNum}" ht="22" customHeight="1">${cellsXml}</row>`
    })
    .join('')

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    colsXml +
    `<sheetData>${rowsXml}</sheetData>` +
    `</worksheet>`
  )
}

/**
 * คำนวณ CRC-32 สำหรับสร้างไฟล์ ZIP (.xlsx)
 */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * รวมไฟล์ XML เข้าเป็น ZIP Archive (STORE mode) ตามมาตรฐาน OpenXML (.xlsx)
 */
export function buildZipArchive(files: { path: string; content: string | Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder()
  const localChunks: Uint8Array[] = []
  const centralChunks: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.path)
    const dataBytes =
      typeof file.content === 'string' ? encoder.encode(file.content) : file.content
    const crc = crc32(dataBytes)
    const size = dataBytes.length

    // Local File Header (30 bytes + name)
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(localHeader.buffer)
    lv.setUint32(0, 0x04034b50, true) // signature
    lv.setUint16(4, 20, true) // version needed
    lv.setUint16(6, 0x0800, true) // UTF-8 flag
    lv.setUint16(8, 0, true) // compression: 0 (STORE)
    lv.setUint16(10, 0, true) // mod time
    lv.setUint16(12, 0x5421, true) // mod date
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true)
    lv.setUint32(22, size, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    localHeader.set(nameBytes, 30)

    // Central Directory Header (46 bytes + name)
    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(centralHeader.buffer)
    cv.setUint32(0, 0x02014b50, true) // signature
    cv.setUint16(4, 20, true) // version made by
    cv.setUint16(6, 20, true) // version needed
    cv.setUint16(8, 0x0800, true) // UTF-8 flag
    cv.setUint16(10, 0, true) // compression: 0 (STORE)
    cv.setUint16(12, 0, true) // mod time
    cv.setUint16(14, 0x5421, true) // mod date
    cv.setUint32(16, crc, true)
    cv.setUint32(20, size, true)
    cv.setUint32(24, size, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true) // extra len
    cv.setUint16(32, 0, true) // comment len
    cv.setUint16(34, 0, true) // disk number
    cv.setUint16(36, 0, true) // internal attrs
    cv.setUint32(38, 0, true) // external attrs
    cv.setUint32(42, offset, true) // local header offset
    centralHeader.set(nameBytes, 46)

    localChunks.push(localHeader, dataBytes)
    centralChunks.push(centralHeader)
    offset += localHeader.length + dataBytes.length
  }

  const centralDirSize = centralChunks.reduce((acc, c) => acc + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true) // EOCD signature
  ev.setUint16(4, 0, true) // disk number
  ev.setUint16(6, 0, true) // central dir disk
  ev.setUint16(8, files.length, true) // entries on disk
  ev.setUint16(10, files.length, true) // total entries
  ev.setUint32(12, centralDirSize, true) // central dir size
  ev.setUint32(16, offset, true) // central dir offset
  ev.setUint16(20, 0, true) // comment length

  const totalSize = offset + centralDirSize + eocd.length
  const out = new Uint8Array(totalSize)
  let pos = 0
  for (const chunk of localChunks) {
    out.set(chunk, pos)
    pos += chunk.length
  }
  for (const chunk of centralChunks) {
    out.set(chunk, pos)
    pos += chunk.length
  }
  out.set(eocd, pos)
  return out
}

/**
 * สร้างไบนารีไฟล์ .xlsx (OpenXML) จากข้อมูล Dashboard (2 แผ่นงาน: รายการงานซ่อม และ สรุปภาพรวม)
 */
export function buildDashboardExcelBytes(params: DashboardExcelExportParams): Uint8Array {
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

  // Sheet 1: รายการงานซ่อม (Tickets)
  // Styles: 0 = default, 1 = dark header, 2 = section title, 3 = bordered data cell
  const ticketHeaderRow: CellSpec[] = [
    'ลำดับ',
    'Tracking ID',
    'ชื่อลูกค้า',
    'เบอร์ติดต่อ',
    'ประเภทบริการ',
    'ยี่ห้อแอร์',
    'อาการ / รายละเอียด',
    'ที่อยู่หน้างาน',
    'วันนัดหมาย',
    'ช่างผู้รับผิดชอบ',
    'พื้นที่ช่าง',
    'เบอร์โทรช่าง',
    'สถานะ',
    'วันที่เปิดเคส',
  ].map((title) => ({ value: title, style: 1 }))

  const ticketRows: (CellValue | CellSpec)[][] = [ticketHeaderRow]

  tickets.forEach((t, idx) => {
    ticketRows.push(
      [
        idx + 1,
        t.trackingCode,
        t.customerName,
        t.customerPhone,
        SERVICE_LABELS[t.service] || t.service,
        t.brand || '-',
        t.symptom || '-',
        t.address || '-',
        formatDate(t.preferredDate),
        t.technician?.name || 'ยังไม่ระบุช่าง',
        t.technician?.area || '-',
        t.technician?.phone || '-',
        STATUS_LABELS[t.status] || t.status,
        formatDate(t.createdAt),
      ].map((value) => ({ value, style: 3 }))
    )
  })

  const sheet1Xml = buildWorksheetXml(
    ticketRows,
    [8, 18, 22, 16, 18, 16, 32, 36, 20, 20, 18, 16, 18, 20]
  )

  // Sheet 2: สรุปภาพรวม (Summary)
  const summaryRows: (CellValue | CellSpec)[][] = [
    [{ value: 'Plasom — รายงานสรุปศูนย์ควบคุมและจ่ายงานซ่อม (Staff Portal)', style: 2 }],
    [
      { value: 'ผู้ส่งออกรายงาน', style: 1 },
      { value: `${staffName} (${staffRole})`, style: 3 },
    ],
    [
      { value: 'วันที่ออกรายงาน', style: 1 },
      { value: `${formattedExportDate} น.`, style: 3 },
    ],
    [
      { value: 'ตัวกรองสถานะ', style: 1 },
      { value: filterLabel, style: 3 },
    ],
    [
      { value: 'คำค้นหา', style: 1 },
      { value: searchQuery || '-', style: 3 },
    ],
    [''],
    [{ value: '1. สถิติใบงานแจ้งซ่อม (Ticket Status)', style: 2 }],
    [
      { value: 'หัวข้อสถิติ', style: 1 },
      { value: 'จำนวน (เคส)', style: 1 },
      { value: 'รายละเอียด', style: 1 },
    ],
    [
      { value: 'เคสทั้งหมด', style: 3 },
      { value: summary.total, style: 3 },
      { value: 'รายการในระบบทั้งหมด', style: 3 },
    ],
    [
      { value: 'ยังไม่ปิด / รอรับเรื่อง', style: 3 },
      { value: summary.submitted, style: 3 },
      { value: 'รอดำเนินการรับเรื่อง', style: 3 },
    ],
    [
      { value: 'กำลังปฏิบัติงาน', style: 3 },
      { value: summary.inProgress, style: 3 },
      { value: 'รับเรื่องแล้ว / ช่างกำลังเข้าซ่อม', style: 3 },
    ],
    [
      { value: 'ปิดแล้ว / เสร็จสิ้น', style: 3 },
      { value: summary.completed, style: 3 },
      { value: 'ดำเนินการส่งมอบงานเรียบร้อย', style: 3 },
    ],
    [''],
    [{ value: '2. จำนวนข้อความที่ติดต่อเข้ามา (แยกตามช่องทาง)', style: 2 }],
    [
      { value: 'ช่องทางการติดต่อ', style: 1 },
      { value: 'จำนวน (ข้อความ)', style: 1 },
      { value: 'สัดส่วน / หมายเหตุ', style: 1 },
    ],
    [
      { value: 'ติดต่อเข้ามาทั้งหมด', style: 3 },
      { value: channels.total, style: 3 },
      { value: '+14% จากเดือนก่อน', style: 3 },
    ],
    [
      { value: 'จากแชท (LINE / Chat)', style: 3 },
      { value: channels.chat, style: 3 },
      { value: 'คิดเป็น 47.6%', style: 3 },
    ],
    [
      { value: 'จากโทร (Call Center)', style: 3 },
      { value: channels.call, style: 3 },
      { value: 'คิดเป็น 21.9%', style: 3 },
    ],
    [
      { value: 'จากเว็บ (Website)', style: 3 },
      { value: channels.web, style: 3 },
      { value: 'คิดเป็น 30.5%', style: 3 },
    ],
  ]

  const sheet2Xml = buildWorksheetXml(summaryRows, [32, 22, 34])

  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `</Types>`

  const rootRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>` +
    `<sheet name="รายการงานซ่อม (Tickets)" sheetId="1" r:id="rId1"/>` +
    `<sheet name="สรุปภาพรวม (Summary)" sheetId="2" r:id="rId2"/>` +
    `</sheets>` +
    `</workbook>`

  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`

  const stylesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="3">` +
    `<font><sz val="11"/><name val="Prompt"/></font>` +
    `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Prompt"/></font>` +
    `<font><b/><sz val="13"/><color rgb="FF09090B"/><name val="Prompt"/></font>` +
    `</fonts>` +
    `<fills count="3">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FF09090B"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="2">` +
    `<border><left/><right/><top/><bottom/><diagonal/></border>` +
    `<border>` +
    `<left style="thin"><color rgb="FFE4E4E7"/></left>` +
    `<right style="thin"><color rgb="FFE4E4E7"/></right>` +
    `<top style="thin"><color rgb="FFE4E4E7"/></top>` +
    `<bottom style="thin"><color rgb="FFE4E4E7"/></bottom>` +
    `<diagonal/>` +
    `</border>` +
    `</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="4">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
    `</cellXfs>` +
    `</styleSheet>`

  return buildZipArchive([
    { path: '[Content_Types].xml', content: contentTypesXml },
    { path: '_rels/.rels', content: rootRelsXml },
    { path: 'xl/workbook.xml', content: workbookXml },
    { path: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { path: 'xl/styles.xml', content: stylesXml },
    { path: 'xl/worksheets/sheet1.xml', content: sheet1Xml },
    { path: 'xl/worksheets/sheet2.xml', content: sheet2Xml },
  ])
}

/**
 * ส่งออกข้อมูล Dashboard เป็นไฟล์ Excel (.xlsx) แล้วสั่งดาวน์โหลดทันที
 */
export function exportDashboardToExcel(params: DashboardExcelExportParams): void {
  const exportedAt = params.exportedAt ?? new Date()
  const xlsxBytes = buildDashboardExcelBytes({ ...params, exportedAt })
  const blob = new Blob([xlsxBytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = getDashboardExcelFilename(exportedAt)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

