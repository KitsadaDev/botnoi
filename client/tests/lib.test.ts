import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, getMinBookingDate, toLocalDateInputValue, sanitizePhoneInput } from '../src/lib/format.ts'
import { selectValidImages, MAX_IMAGES, MAX_IMAGE_BYTES } from '../src/lib/images.ts'
import {
  getDashboardPdfFilename,
  dataUrlToUint8Array,
  buildPdfFromJpegPages,
} from '../src/lib/pdfExport.ts'
import {
  getDashboardExcelFilename,
  buildDashboardExcelBytes,
} from '../src/lib/excelExport.ts'

test('formatDate: ไม่แสดง ISO ดิบ และไม่เลื่อนวัน', () => {
  const text = formatDate('2026-11-05T00:00:00.000Z')
  assert.ok(!text.includes('T00:00'))
  assert.match(text, /\b5\b/)
})

test('formatDate: ค่าว่าง/ไม่ถูกต้องไม่ทำให้ crash', () => {
  assert.equal(formatDate(null), '-')
  assert.equal(formatDate(undefined), '-')
  assert.equal(formatDate('not-a-date'), 'not-a-date')
})

test('toLocalDateInputValue: ใช้วันที่ตามเวลาท้องถิ่น', () => {
  assert.equal(toLocalDateInputValue(new Date(2026, 10, 2, 0, 30)), '2026-11-02')
  assert.equal(toLocalDateInputValue(new Date(2026, 0, 5, 23, 59)), '2026-01-05')
})

test('getMinBookingDate: พรุ่งนี้ตามเวลาท้องถิ่น แม้เป็นช่วงเที่ยงคืน และข้ามเดือน/ปีได้', () => {
  assert.equal(getMinBookingDate(new Date(2026, 10, 2, 0, 30)), '2026-11-03')
  assert.equal(getMinBookingDate(new Date(2026, 10, 30, 23, 59)), '2026-12-01')
  assert.equal(getMinBookingDate(new Date(2026, 11, 31, 12, 0)), '2027-01-01')
})

const img = (name: string, type = 'image/jpeg', size = 1000) => ({ name, type, size })

test('selectValidImages: รับไฟล์ที่ถูกต้อง', () => {
  const { accepted, errors } = selectValidImages(0, [img('a.jpg'), img('b.png', 'image/png')])
  assert.equal(accepted.length, 2)
  assert.deepEqual(errors, [])
})

test('selectValidImages: ปัดตกชนิดไฟล์ที่ไม่รองรับและไฟล์ใหญ่เกิน 5MB', () => {
  const { accepted, errors } = selectValidImages(0, [
    img('doc.pdf', 'application/pdf'),
    img('big.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1),
    img('ok.webp', 'image/webp'),
  ])
  assert.deepEqual(accepted.map((f) => f.name), ['ok.webp'])
  assert.equal(errors.length, 2)
})

test('selectValidImages: ไม่เกินโควตา MAX_IMAGES (นับรูปที่มีอยู่แล้วด้วย)', () => {
  const files = Array.from({ length: MAX_IMAGES + 2 }, (_, i) => img(`${i}.jpg`))
  assert.equal(selectValidImages(0, files).accepted.length, MAX_IMAGES)
  const { accepted, errors } = selectValidImages(MAX_IMAGES - 1, [img('x.jpg'), img('y.jpg')])
  assert.deepEqual(accepted.map((f) => f.name), ['x.jpg'])
  assert.equal(errors.length, 1)
  assert.equal(selectValidImages(MAX_IMAGES, [img('z.jpg')]).accepted.length, 0)
})

test('sanitizePhoneInput: กรองเฉพาะตัวเลขและจำกัดไม่เกิน 10 หลัก', () => {
  assert.equal(sanitizePhoneInput('0812345678'), '0812345678')
  assert.equal(sanitizePhoneInput('081234567899999'), '0812345678', 'ต้องตัดให้เหลือไม่เกิน 10 ตัวอักษร')
  assert.equal(sanitizePhoneInput('081-234-5678'), '0812345678', 'ต้องตัดขีดและอักขระพิเศษออก')
  assert.equal(sanitizePhoneInput('abc081def2345678'), '0812345678', 'ต้องตัดตัวอักษรออก')
  assert.equal(sanitizePhoneInput(''), '')
})

test('getDashboardPdfFilename: สร้างชื่อไฟล์ PDF ตามวันที่ท้องถิ่น', () => {
  assert.equal(
    getDashboardPdfFilename(new Date(2026, 10, 9, 13, 30)),
    'plasom-dashboard-2026-11-09.pdf'
  )
})

test('buildPdfFromJpegPages: สร้างโครงสร้างไฟล์ PDF-1.4 ที่ถูกต้องและรองรับหลายหน้า', () => {
  const fakeJpeg = dataUrlToUint8Array('data:image/jpeg;base64,/9j/4AAQSkZJRg==')
  const pdfBytes = buildPdfFromJpegPages([
    { jpegBytes: fakeJpeg, widthPx: 1240, heightPx: 1754 },
    { jpegBytes: fakeJpeg, widthPx: 1240, heightPx: 1754 },
  ])
  const pdfText = new TextDecoder('latin1').decode(pdfBytes)
  assert.ok(pdfText.startsWith('%PDF-1.4\n'))
  assert.ok(pdfText.includes('/Type /Catalog'))
  assert.ok(pdfText.includes('/Count 2'))
  assert.ok(pdfText.includes('/Filter /DCTDecode'))
  assert.ok(pdfText.trimEnd().endsWith('%%EOF'))
})

test('getDashboardExcelFilename: สร้างชื่อไฟล์ Excel (.xlsx) ตามวันที่ท้องถิ่น', () => {
  assert.equal(
    getDashboardExcelFilename(new Date(2026, 10, 9, 13, 30)),
    'plasom-dashboard-2026-11-09.xlsx'
  )
})

test('buildDashboardExcelBytes: สร้างไฟล์ ZIP/OpenXML (.xlsx) ที่มี 2 แผ่นงานและข้อมูลครบถ้วน', () => {
  const xlsxBytes = buildDashboardExcelBytes({
    staffName: 'สมชาย ใจดี',
    staffRole: 'ADMIN',
    selectedStatus: '',
    searchQuery: '',
    summary: { total: 5, submitted: 1, inProgress: 2, completed: 2 },
    tickets: [
      {
        id: 't1',
        trackingCode: 'CC-20261109-001',
        service: 'CLEANING',
        brand: 'Daikin',
        symptom: 'แอร์ไม่เย็น',
        address: 'สุขุมวิท 101 กรุงเทพฯ',
        lat: null,
        lng: null,
        preferredDate: '2026-11-10T00:00:00.000Z',
        note: null,
        status: 'IN_PROGRESS',
        customerName: 'คุณลูกค้า ทดสอบ',
        customerPhone: '0812345678',
        userId: null,
        technicianId: 'tech1',
        technician: { id: 'tech1', name: 'ช่างเอก', phone: '0899999999', area: 'บางนา' },
        images: [],
        statusLogs: [],
        createdAt: '2026-11-09T02:00:00.000Z',
        updatedAt: '2026-11-09T02:00:00.000Z',
      },
    ],
    exportedAt: new Date(2026, 10, 9, 13, 40),
  })

  // ตรวจสอบ ZIP signature ("PK\x03\x04")
  assert.equal(xlsxBytes[0], 0x50)
  assert.equal(xlsxBytes[1], 0x4b)
  assert.equal(xlsxBytes[2], 0x03)
  assert.equal(xlsxBytes[3], 0x04)

  const content = new TextDecoder('utf-8').decode(xlsxBytes)
  assert.ok(content.includes('xl/workbook.xml'))
  assert.ok(content.includes('xl/worksheets/sheet1.xml'))
  assert.ok(content.includes('xl/worksheets/sheet2.xml'))
  assert.ok(content.includes('CC-20261109-001'))
  assert.ok(content.includes('คุณลูกค้า ทดสอบ'))
})


