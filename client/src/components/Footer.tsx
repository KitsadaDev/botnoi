import React from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, ShieldCheck, ArrowUpRight, Wrench, Award, Sparkles } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-zinc-950 text-zinc-400 pt-16 pb-12 border-t border-zinc-800/80 overflow-hidden">
      {/* Subtle top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-sky-500/60 to-transparent" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-sky-500/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 mb-14">
          {/* Col 1: Brand & Mission (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sky-400 shadow-inner">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">CoolCare</span>
                <span className="font-mono font-bold text-[10px] uppercase px-1.5 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded">
                  PRO
                </span>
              </div>
            </Link>

            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
              แพลตฟอร์มบริหารจัดการงานซ่อม ล้าง และติดตั้งเครื่องปรับอากาศครบวงจร
              ด้วยทีมช่างมาตรฐานโรงงาน อะไหล่แท้ 100% พร้อมระบบติดตามสถานะแบบเรียลไทม์
            </p>

            <div className="inline-flex items-center gap-2 text-sky-300 text-[11px] font-medium bg-zinc-900/90 px-3 py-2 rounded-xl border border-zinc-800">
              <Award className="w-4 h-4 shrink-0 text-sky-400" />
              <span>Carrier & B.Grimm Certified Service Standard</span>
            </div>
          </div>

          {/* Col 2: Services (3 cols) */}
          <div className="lg:col-span-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-200 mb-4 font-mono">
              บริการหลักของเรา
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/book?service=CLEANING" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>ล้างแอร์ระบบปลอดเชื้อ</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-sky-400 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/book?service=REPAIR" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>ซ่อมแอร์ไม่เย็น / มีน้ำรั่ว</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-sky-400 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/book?service=REPAIR" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>ตรวจเช็คระบบไฟและคอมเพรสเซอร์</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-sky-400 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/book?service=INSTALLATION" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>ติดตั้งและย้ายตำแหน่งแอร์</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-sky-400 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/book?service=CLEANING" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>เติมน้ำยาแอร์ R32 / R410a</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-sky-400 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation (2 cols) */}
          <div className="lg:col-span-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-200 mb-4 font-mono">
              เมนูลัด
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  หน้าหลัก
                </Link>
              </li>
              <li>
                <Link to="/book" className="hover:text-white transition-colors">
                  นัดหมายแจ้งซ่อม
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-white transition-colors">
                  เช็คสถานะงานซ่อม
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  สำหรับเจ้าหน้าที่ (Staff)
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact Info (3 cols) */}
          <div className="lg:col-span-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-200 mb-4 font-mono">
              ศูนย์บริการลูกค้า
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>อาคารบีกริมม์ ถนนเพชรบุรีตัดใหม่ แขวงมักกะสัน กรุงเทพฯ</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-mono text-zinc-200">02-123-4567</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-mono text-zinc-200">support@coolcare.pro</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <span>เปิดทำการทุกวัน 08:00 - 18:00 น.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-zinc-900 text-xs text-zinc-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} CoolCare Pro. Crafted with modern 21st.dev UI architecture.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-zinc-300 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              รับประกันผลงานซ่อม 90 วัน
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
