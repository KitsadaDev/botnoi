import React from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, ShieldCheck, ArrowUpRight, Wrench, Layers } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-zinc-950 text-zinc-400 pt-16 pb-12 border-t border-zinc-800/80 overflow-hidden">
      {/* Subtle top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-orange-500/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 mb-14">
          {/* Col 1: Brand & Mission */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-400 shadow-inner">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">Plasom</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  PLATFORM
                </span>
              </div>
            </Link>

            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
              แพลตฟอร์มศูนย์กลางบริหารงานบริการหลังการขายและระบบแจ้งซ่อมด้วย AI สำหรับผู้ประกอบการทุกธุรกิจ
              สร้าง Project ได้ทันที พร้อมศูนย์รวมประวัติแชท ระบบจ่ายงานช่าง และแดชบอร์ดวัดผลความพึงพอใจ
            </p>

            <div className="inline-flex items-center gap-2 text-orange-300 text-[11px] font-medium bg-zinc-900/90 px-3 py-2 rounded-xl border border-zinc-800">
              <Layers className="w-4 h-4 shrink-0 text-orange-400" />
              <span>Multi-Tenant AI After-Sales SaaS Architecture</span>
            </div>
          </div>

          {/* Col 2: Platform Modules */}
          <div className="lg:col-span-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-200 mb-4 font-mono">
              ฟีเจอร์หลักของแพลตฟอร์ม
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/projects" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>สร้างและจัดการหลาย Project</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-orange-400 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/projects" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>ศูนย์รวมประวัติแชทลูกค้า (Chatbot Sync)</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-orange-400 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/projects" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>ระบบจัดการทีมช่างและ Assign งาน</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-orange-400 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/projects" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>แดชบอร์ดประเมินความพึงพอใจ (CSAT)</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-orange-400 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/#ai-showcase" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>เชื่อมต่อ Botnoi Chatbot & Voicebot</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-orange-400 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation */}
          <div className="lg:col-span-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-200 mb-4 font-mono">
              เมนูลัด
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  หน้าหลักแพลตฟอร์ม
                </Link>
              </li>
              <li>
                <Link to="/projects" className="hover:text-white transition-colors">
                  โปรเจกต์ของฉัน (Workspace)
                </Link>
              </li>
              <li>
                <Link to="/book" className="hover:text-white transition-colors">
                  ทดลองฟอร์มแจ้งซ่อม
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-white transition-colors">
                  เช็คสถานะงานซ่อม
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  เข้าสู่ระบบ / สมัครใช้งาน
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact Info */}
          <div className="lg:col-span-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-200 mb-4 font-mono">
              ติดต่อทีมพัฒนาแพลตฟอร์ม
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span>21 อาคารอโศก 253 ถนนอโศกมนตรี แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="font-mono text-zinc-200">02-123-4567</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="font-mono text-zinc-200">support@plasom.com</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                <span>ทีมซัพพอร์ตทุกวัน 08:00 - 18:00 น. • AI 24/7</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-zinc-900 text-xs text-zinc-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Plasom AI After-Sales Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-zinc-300 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Powered by Botnoi AI Ecosystem
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
