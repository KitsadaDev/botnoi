import React from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, ShieldCheck, CheckCircle2, Award } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#001e47] text-white pt-14 pb-8 border-t-4 border-sky-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Col 1: About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-black text-white text-sm">
                CC
              </div>
              <span className="font-bold text-xl tracking-tight text-white">CoolCare PRO</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              ผู้นำด้านการให้บริการติดตั้ง ซ่อมบำรุง และล้างเครื่องปรับอากาศ ด้วยช่างผู้เชี่ยวชาญมาตรฐานโรงงาน
              อะไหล่แท้ 100% พร้อมการรับประกันงานซ่อม
            </p>
            <div className="flex items-center gap-2 text-sky-300 text-xs font-semibold bg-[#002f6c] p-2.5 rounded-lg border border-sky-800">
              <Award className="w-4 h-4 shrink-0 text-sky-400" />
              <span>รับรองมาตรฐานการบริการ Carrier & B.Grimm Style</span>
            </div>
          </div>

          {/* Col 2: Services */}
          <div>
            <h3 className="font-bold text-base text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-sky-400 rounded-sm"></span>
              บริการของเรา
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link to="/book" className="hover:text-sky-300 transition-colors flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  ล้างแอร์ติดผนัง / แอร์ฝ้าเพดาน
                </Link>
              </li>
              <li>
                <Link to="/book" className="hover:text-sky-300 transition-colors flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  ซ่อมแอร์ไม่เย็น / มีน้ำหยด
                </Link>
              </li>
              <li>
                <Link to="/book" className="hover:text-sky-300 transition-colors flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  ซ่อมระบบไฟฟ้าและคอมเพรสเซอร์
                </Link>
              </li>
              <li>
                <Link to="/book" className="hover:text-sky-300 transition-colors flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  ติดตั้งและย้ายตำแหน่งแอร์
                </Link>
              </li>
              <li>
                <Link to="/book" className="hover:text-sky-300 transition-colors flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  เติมน้ำยาแอร์ R32 / R410a
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Links */}
          <div>
            <h3 className="font-bold text-base text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-sky-400 rounded-sm"></span>
              เมนูลัด
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link to="/" className="hover:text-sky-300 transition-colors">
                  หน้าหลัก
                </Link>
              </li>
              <li>
                <Link to="/book" className="hover:text-sky-300 transition-colors">
                  นัดหมายแจ้งซ่อมออนไลน์
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-sky-300 transition-colors">
                  ตรวจสอบสถานะงานซ่อม (Tracking)
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-sky-300 transition-colors">
                  เข้าสู่ระบบเจ้าหน้าที่ (Staff Portal)
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div>
            <h3 className="font-bold text-base text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-sky-400 rounded-sm"></span>
              ติดต่อเรา
            </h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>สำนักงานบริการ CoolCare Pro อาคารบีกริมม์ กรุงเทพฯ</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Call Center: 02-123-4567</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                <span>support@coolcare.pro</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <span>จันทร์ - เสาร์ 08:00 - 18:00 น.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} CoolCare Pro - All rights reserved. Professional AC Solutions.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              รับประกันงานซ่อมนาน 90 วัน
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
