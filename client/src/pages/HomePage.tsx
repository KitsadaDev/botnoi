import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Wrench,
  Search,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Award,
  Sparkles,
  ArrowRight,
  PhoneCall,
  CalendarCheck,
  PenTool,
  Wind,
} from 'lucide-react'

export const HomePage: React.FC = () => {
  const [quickCode, setQuickCode] = useState('')
  const navigate = useNavigate()

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickCode.trim()) return
    navigate(`/track/${encodeURIComponent(quickCode.trim().toUpperCase())}`)
  }

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#00224d] via-[#003882] to-[#005bb5] text-white overflow-hidden py-16 sm:py-24">
        {/* Decorative background circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-sky-200 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-sky-300" />
                <span>บริการแอร์ระดับมืออาชีพ มาตรฐานสากล Carrier Style</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
                บริการล้าง ซ่อม ติดตั้งแอร์ <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-200">
                  รวดเร็ว ปลอดภัย ไร้กังวล
                </span>
              </h1>

              <p className="text-slate-200 text-base sm:text-lg max-w-2xl leading-relaxed">
                ดูแลโดยทีมช่างผู้ชำนาญการผ่านการอบรมมาตรฐาน อะไหล่แท้ 100% พร้อมรับประกันงานซ่อม 90 วัน
                นัดหมายวันเวลาได้ตามสะดวก และติดตามสถานะแบบเรียลไทม์ได้ทันที
              </p>

              {/* Fast Actions */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/book"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-sky-400 hover:bg-sky-300 text-slate-900 shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5"
                >
                  <Wrench className="w-4 h-4" />
                  แจ้งซ่อม / นัดหมายทันที
                </Link>
                <a
                  href="#services"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
                >
                  ดูบริการทั้งหมด
                </a>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/15">
                <div>
                  <p className="text-2xl font-black text-white">90 วัน</p>
                  <p className="text-xs text-sky-200">รับประกันผลงาน</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-white">100%</p>
                  <p className="text-xs text-sky-200">อะไหล่แท้ตรงรุ่น</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-white">24/7</p>
                  <p className="text-xs text-sky-200">เช็คสถานะออนไลน์</p>
                </div>
              </div>
            </div>

            {/* Right: Quick Tracking Widget */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl p-6 sm:p-8 text-slate-800 shadow-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-50 text-[#003882] rounded-lg">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">ตรวจสอบสถานะงานซ่อม</h2>
                    <p className="text-xs text-slate-500">ติดตามขั้นตอนและตำแหน่งช่างแบบเรียลไทม์</p>
                  </div>
                </div>

                <form onSubmit={handleQuickTrack} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      กรอกรหัสติดตามงาน (Tracking Code)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={quickCode}
                        onChange={(e) => setQuickCode(e.target.value)}
                        placeholder="เช่น TK-ABC12345"
                        className="w-full px-4 py-3 text-sm font-mono tracking-wider uppercase bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003882] focus:border-[#003882] outline-hidden transition"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#003882] hover:bg-[#002866] transition shadow-md shadow-blue-900/10"
                  >
                    <Search className="w-4 h-4" />
                    <span>ค้นหาข้อมูลสถานะ</span>
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-xs text-slate-400">
                      ตัวอย่างรหัสทดสอบ: <span className="font-mono text-slate-600 font-semibold">TK-SEED001</span> หรือ <span className="font-mono text-slate-600 font-semibold">TK-SEED002</span>
                    </p>
                  </div>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> อัปเดตสถานะทันที
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> แชทกับช่างได้ตลอด
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#003882] text-xs font-semibold mb-3">
            <Award className="w-3.5 h-3.5" />
            <span>มาตรฐานบริการคุณภาพ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">บริการยอดนิยมจาก CoolCare Pro</h2>
          <p className="text-slate-600 text-sm mt-2">
            เลือกแพ็กเกจบริการที่ตอบโจทย์คุณ พร้อมรับประกันคุณภาพและราคามาตรฐานโปร่งใส
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Cleaning */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 p-7 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Wind className="w-6 h-6" />
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-900">ล้างแอร์มาตรฐาน</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">ยอดนิยม</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                ล้างทำความสะอาดแอร์อย่างล้ำลึก ฆ่าเชื้อราและแบคทีเรีย ประหยัดไฟ เย็นฉ่ำ
              </p>
              <div className="mb-6">
                <span className="text-2xl font-black text-[#003882]">฿590</span>
                <span className="text-xs text-slate-400"> / เครื่อง</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>ล้างฟิลเตอร์และคอยล์เย็นด้วยน้ำยาฆ่าเชื้อ</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>เป่าท่อน้ำทิ้ง ป้องกันน้ำล้นหยด</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>ตรวจเช็คกระแสไฟและน้ำยาแอร์ฟรี</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>รับประกันน้ำรั่วนาน 30 วัน</span>
                </li>
              </ul>
            </div>

            <Link
              to="/book?service=CLEANING"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-[#003882] bg-blue-50 hover:bg-[#003882] hover:text-white transition-colors"
            >
              จองบริการล้างแอร์
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Repair */}
          <div className="bg-white rounded-2xl border-2 border-[#003882] shadow-md hover:shadow-xl transition-all duration-300 p-7 flex flex-col justify-between relative group">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#003882] text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              บริการแนะนำเร่งด่วน
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003882] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Wrench className="w-6 h-6" />
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-900">ตรวจเช็คและซ่อมแอร์</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#003882]">รวดเร็ว</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                แก้ปัญหาแอร์ไม่เย็น มีเสียงดัง น้ำหยด รั่วซึม หรือเปิดไม่ติด โดยช่างชำนาญการ
              </p>
              <div className="mb-6">
                <span className="text-2xl font-black text-[#003882]">฿400</span>
                <span className="text-xs text-slate-400"> (ค่าตรวจเช็คเบื้องต้น)</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>ตรวจเช็คอาการด้วยเครื่องมือวัดมาตรฐาน</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>แจ้งราคาค่าอะไหล่ประเมินก่อนลงมือซ่อม</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>ใช้อะไหล่แท้ตรงรุ่น 100%</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>รับประกันงานซ่อมและอะไหล่ 90 วัน</span>
                </li>
              </ul>
            </div>

            <Link
              to="/book?service=REPAIR"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#003882] hover:bg-[#00265c] transition-colors shadow-sm"
            >
              แจ้งซ่อมแอร์ทันที
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Installation */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 p-7 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <PenTool className="w-6 h-6" />
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-900">ติดตั้งและย้ายแอร์</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">มาตรฐาน</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                ติดตั้งแอร์เครื่องใหม่ หรือถอดย้ายตำแหน่ง เดินท่อสวยงาม เรียบร้อย ปลอดภัย
              </p>
              <div className="mb-6">
                <span className="text-2xl font-black text-[#003882]">฿2,500</span>
                <span className="text-xs text-slate-400"> / ชุด</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>ฟรีท่อน้ำยาแอร์ทองแดงหนา 4 เมตร</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>ฟรีรางครอบท่อและขาแขวนคอมเพรสเซอร์</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>ทดสอบระบบสุญญากาศ (Vacuum) และวัดแรงดัน</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>รับประกันการติดตั้ง 180 วัน</span>
                </li>
              </ul>
            </div>

            <Link
              to="/book?service=INSTALLATION"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-[#003882] bg-blue-50 hover:bg-[#003882] hover:text-white transition-colors"
            >
              จองบริการติดตั้ง/ย้าย
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4 Steps Workflow */}
      <section className="bg-slate-100/70 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">ขั้นตอนการให้บริการที่สะดวกและโปร่งใส</h2>
            <p className="text-slate-600 text-sm mt-2">แจ้งซ่อมง่ายใน 4 ขั้นตอน ตรวจสอบได้ทุกระยะ</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative">
              <span className="w-8 h-8 rounded-full bg-[#003882] text-white font-bold text-sm flex items-center justify-center mb-4">
                1
              </span>
              <h3 className="font-bold text-base text-slate-800 mb-1">แจ้งซ่อมออนไลน์</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                กรอกข้อมูลอาการ วันเวลาที่สะดวก และอัปโหลดรูปภาพผ่านเว็บแอปพลิเคชัน
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative">
              <span className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                2
              </span>
              <h3 className="font-bold text-base text-slate-800 mb-1">ระบบรับเรื่อง & จ่ายงาน</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                เจ้าหน้าที่ตรวจสอบข้อมูล มอบหมายช่างผู้เชี่ยวชาญในพื้นที่ของคุณ
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-sm flex items-center justify-center mb-4">
                3
              </span>
              <h3 className="font-bold text-base text-slate-800 mb-1">ช่างเข้าบริการตรงเวลา</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ช่างผู้ผ่านการรับรองเข้าดำเนินการตรวจเช็ค ซ่อมแซม หรือล้างแอร์ตามนัด
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                4
              </span>
              <h3 className="font-bold text-base text-slate-800 mb-1">เสร็จสิ้น & รับประกัน</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ตรวจรับงาน ชำระเงินตามจริง พร้อมใบรับประกันงานซ่อมสูงสุด 90 วัน
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#002f6c] to-[#004f9f] rounded-3xl p-8 sm:p-12 text-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>มาตรฐานความไว้วางใจ</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold leading-snug">
                มั่นใจทุกงานซ่อมกับ CoolCare Pro
              </h2>
              <p className="text-slate-200 text-sm mt-3 leading-relaxed">
                เรายึดมั่นในคุณภาพและการบริการที่โปร่งใส ช่างทุกคนผ่านการตรวจประวัติและสอบวัดระดับฝีมือ
                พร้อมดูแลเครื่องปรับอากาศของคุณให้กลับมาเย็นฉ่ำ สบายใจไร้กังวล
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white/10 text-sky-300 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">ช่างฝีมือรับรอง</h4>
                    <p className="text-xs text-slate-300">ผ่านการฝึกอบรมมาตรฐานแบรนด์ชั้นนำ</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white/10 text-sky-300 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">ตรงต่อเวลา</h4>
                    <p className="text-xs text-slate-300">นัดหมายแม่นยำ พร้อมแจ้งก่อนเข้าถึง</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white/10 text-sky-300 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">รับประกัน 90 วัน</h4>
                    <p className="text-xs text-slate-300">ซ้ำอาการเดิม ดูแลให้ฟรีไม่มีค่าใช้จ่าย</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white/10 text-sky-300 shrink-0">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">บริการหลังการขาย</h4>
                    <p className="text-xs text-slate-300">มี Call Center และระบบแชทซัพพอร์ต</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
              <CalendarCheck className="w-12 h-12 text-sky-300 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">พร้อมรับบริการแล้วใช่ไหม?</h3>
              <p className="text-xs text-slate-200 mb-6 max-w-xs">
                ใช้เวลาไม่ถึง 2 นาทีในการกรอกข้อมูล เจ้าหน้าที่จะประสานงานช่างทันที
              </p>
              <Link
                to="/book"
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white text-[#003882] font-bold text-sm hover:bg-sky-50 shadow-md transition-all"
              >
                เริ่มแจ้งซ่อมตอนนี้
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
