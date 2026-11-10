# Plasom ❄️🔧
> ระบบแจ้งซ่อมและติดตามสถานะเครื่องปรับอากาศครบวงจร (สไตล์ B.Grimm Carrier Service Network)

เว็บแอปพลิเคชันให้บริการแจ้งซ่อม ล้างแอร์ และติดตั้ง/ย้ายแอร์ พร้อมระบบติดตามสถานะงานซ่อมแบบเรียลไทม์ และระบบบริหารจัดการงานช่างสำหรับเจ้าหน้าที่

---

## 🛠️ Tech Stack

### Frontend (`client/`)
- **Framework:** React 18 + Vite + TypeScript
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
npm run db:push
npm run db:seed
```

### 4. รันระบบ (Development)
รันทั้ง Client และ Server พร้อมกันจาก Root directory:
```bash
npm run dev
```
หรือรันแยกโฟลเดอร์:
- **Client (Frontend):** `cd client && npm run dev` (เปิดที่ [http://localhost:5173](http://localhost:5173))
- **Server (Backend):** `cd server && npm start` (เปิดที่ [http://localhost:4000](http://localhost:4000))

---

## 🔑 ข้อมูลบัญชีสำหรับทดสอบ (Seed Data)

### เจ้าหน้าที่ (เข้าสู่ระบบที่ `/login` หรือกดปุ่มเติมข้อมูลอัตโนมัติ):
- **Admin:**
  - เบอร์โทร: `0800000001`
  - รหัสผ่าน: `admin1234`
- **Staff:**
  - เบอร์โทร: `0800000002`
  - รหัสผ่าน: `staff1234`

### รหัสติดตามตัวอย่างสำหรับทดสอบ (`/track`):
- `CC-20241025-E5F6` (สถานะ: ช่างกำลังเข้าซ่อม - มีแชทสดและช่างที่มอบหมาย)
- `CC-20241028-C3D4` (สถานะ: รับเรื่องแล้ว)
- `CC-20241020-G7H8` (สถานะ: เสร็จสิ้น)
- `CC-20241101-A1B2` (สถานะ: ส่งเรื่องแล้ว)

---

## 📄 License
MIT License
