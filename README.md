# Plasom ❄️🔧
> ระบบแจ้งซ่อมและติดตามสถานะเครื่องปรับอากาศและอุปกรณ์ไอทีครบวงจร (สไตล์ B.Grimm Carrier Service Network)

เว็บแอปพลิเคชันให้บริการแจ้งซ่อม ล้างแอร์ ติดตั้ง/ย้ายแอร์ และซ่อมอุปกรณ์ไอที พร้อมระบบติดตามสถานะงานซ่อมแบบเรียลไทม์ ระบบบริหารจัดการงานช่างสำหรับเจ้าหน้าที่ และผู้ช่วย AI 3 ช่องทาง (Chatbot / Voicebot / AI Avatar — prompt อยู่ที่ [`docs/bot-prompts.md`](docs/bot-prompts.md))

---

## 🛠️ Tech Stack

### Frontend (`client/`)
- **Framework:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS v4 (Theme Prompt + Plus Jakarta Sans + JetBrains Mono)
- **Routing:** React Router v6
- **Data Fetching & Polling:** TanStack Query (React Query)
- **Form & Validation:** React Hook Form + Zod
- **Icons:** Lucide React
- **HTTP Client:** Axios

### Backend (`server/`)
- **Runtime & Language:** Node.js + Express + TypeScript (tsx)
- **Database & ORM:** PostgreSQL (Supabase) + Prisma 6
- **Authentication:** JWT (jsonwebtoken) + bcryptjs
- **Validation:** Zod
- **File Uploads:** Multer (เก็บรูปถ่ายปัญหาที่แจ้ง)
- **Security & Rate Limiting:** Helmet, CORS, Express-Rate-Limit

---

## 🚀 การติดตั้งและเริ่มใช้งาน

### 1. ติดตั้ง Dependencies ทั้งหมด
```bash
npm run install:all
```

### 2. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.example` ไปเป็น `.env` ในโฟลเดอร์ `server/`:
```bash
cp server/.env.example server/.env
```
และระบุ `DATABASE_URL`, `DIRECT_URL` (Supabase) และ `JWT_SECRET`

### 3. รัน Prisma Generate & Push Schema
```bash
cd server
npm run db:generate
npx prisma migrate deploy   # ใช้กับฐานข้อมูลที่มีอยู่แล้ว (เช่นเพิ่ม enum IT_REPAIR)
# หรือ npm run db:push สำหรับฐานข้อมูลใหม่
npm run db:seed
```

### 4. รันระบบ (Development)
รันทั้ง Client และ Server พร้อมกันจาก Root directory (ต้องมี `concurrently` จาก `npm install` ที่ root):
```bash
npm run dev
```
หรือรันแยกโฟลเดอร์ (โหมดพัฒนา แก้โค้ดแล้วรีโหลดอัตโนมัติ):
- **Client (Frontend):** `cd client && npm run dev` (เปิดที่ [http://localhost:5173](http://localhost:5173))
- **Server (Backend):** `cd server && npm run dev` (เปิดที่ [http://localhost:4000](http://localhost:4000))

### 5. รันแบบ Production
```bash
cd server && npm run build && npm run start:prod
cd client && npm run build   # ไฟล์อยู่ที่ client/dist
```

### 6. ทดสอบ
```bash
cd server && npm test
cd client && npm test && npm run typecheck
```

---

## 🔑 ข้อมูลบัญชีสำหรับทดสอบ (Seed Data)

> ⚠️ บัญชีเหล่านี้มาจาก `npm run db:seed` — บน production ต้องเปลี่ยนรหัสผ่านทันที
> ปุ่มเติมข้อมูลอัตโนมัติในหน้า `/login` จะแสดงเฉพาะตอนรันในเครื่อง (dev) หรือเมื่อตั้ง `VITE_ENABLE_DEMO_LOGIN=true`

### เจ้าหน้าที่ (เข้าสู่ระบบที่ `/login`):
- **Admin** (ลบเคสถาวรได้):
  - เบอร์โทร: `0800000001`
  - รหัสผ่าน: `admin1234`
- **Staff** (จัดการเคส/แชตได้ แต่ลบเคสไม่ได้):
  - เบอร์โทร: `0800000002`
  - รหัสผ่าน: `staff1234`

### ลูกค้าตัวอย่าง:
- เบอร์โทร: `0812345678`
- รหัสผ่าน: `customer1234`

### รหัสติดตามตัวอย่างสำหรับทดสอบ (`/track`):
- `CC-20241025-E5F6` (สถานะ: ช่างกำลังเข้าซ่อม - มีแชทสดและช่างที่มอบหมาย)
- `CC-20241028-C3D4` (สถานะ: รับเรื่องแล้ว)
- `CC-20241020-G7H8` (สถานะ: เสร็จสิ้น)
- `CC-20241101-A1B2` (สถานะ: ส่งเรื่องแล้ว)

---

## 📄 License
MIT License
