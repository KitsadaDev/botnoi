# คู่มือ Deploy CoolCare Pro บน Vercel (Full-Stack: Frontend + Backend API)

โปรเจกต์ถูกตั้งค่าให้รันทั้ง **Frontend (`client/`)** และ **Backend (`server/` ผ่าน `/api`)** บน **Vercel โปรเจกต์เดียว** โดยไม่ต้องแยกไปรันที่ Render แล้ว

---

## 1. สิ่งที่ตั้งค่าให้เรียบร้อยแล้วในโค้ด

- **[vercel.json](vercel.json)** — กำหนดให้ Vercel build ทั้ง `server` (รวม `prisma generate`) และ `client` พร้อมตั้งค่า Rewrite `/api/*` ไปยัง Serverless Function
- **[api/index.ts](api/index.ts)** — จุดเชื่อมต่อ (Entrypoint) ที่นำ Express App จาก `server/src/index.ts` มารันเป็น Vercel Serverless Function
- **[server/src/index.ts](server/src/index.ts)** — ข้าม `app.listen()` เมื่อรันบน Vercel (`process.env.VERCEL`)
- **[server/src/middleware/upload.ts](server/src/middleware/upload.ts)** & **[ticket.controller.ts](server/src/controllers/ticket.controller.ts)** — เมื่อรันบน Vercel จะใช้ `memoryStorage` และแปลงรูปภาพที่อัปโหลดเป็น Data URL เก็บลงฐานข้อมูลโดยตรง ทำให้รูปไม่หายแม้ดิสก์ของ Serverless จะเป็นแบบชั่วคราว (จำกัดขนาด request รวมของ Vercel ไว้ที่ ~4.5 MB)
- **[server/src/lib/prisma.ts](server/src/lib/prisma.ts)** — แคช PrismaClient instance บน global เพื่อลดการสร้าง Connection ซ้ำใน Serverless

---

## 2. เตรียมฐานข้อมูล (ทำครั้งเดียวจากเครื่องคุณ)

1. ตรวจสอบว่า `server/.env` มีค่า `DATABASE_URL` และ `DIRECT_URL` ของ Supabase ถูกต้อง
2. รันคำสั่งสร้างตารางและข้อมูลตั้งต้น (หากยังไม่ได้ทำ):
   ```powershell
   cd server
   npx.cmd prisma migrate deploy
   npm.cmd run db:seed
   cd ..
   ```
3. สุ่มค่า `JWT_SECRET` สำหรับใช้งานจริง (เก็บค่าที่ได้ไว้ใส่ใน Vercel):
   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

---

## 3. Push โค้ดขึ้น GitHub

```powershell
git add .
git commit -m "Configure full-stack Vercel deployment"
git push
```

---

## 4. ขั้นตอนสร้างโปรเจกต์บน Vercel

1. เข้าเว็บ [https://vercel.com](https://vercel.com) → ล็อกอินด้วย GitHub
2. กด **Add New... → Project** → เลือก Import repository นี้
3. ตั้งค่าโปรเจกต์ดังนี้:
   - **Framework Preset**: `Other` หรือ `Vite` (ไฟล์ `vercel.json` จะควบคุมคำสั่ง Build ให้อัตโนมัติ)
   - **Root Directory**: ปล่อยว่างไว้เป็น `./` (Root ของโปรเจกต์ **ไม่ต้อง** เลือกเป็น `client`)
4. เปิดส่วน **Environment Variables** แล้วเพิ่มตัวแปรต่อไปนี้:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Connection string ของ Supabase แบบ Transaction Pooler (พอร์ต `6543` ลงท้ายด้วย `?pgbouncer=true`) |
   | `DIRECT_URL` | Connection string ของ Supabase แบบ Session/Direct (พอร์ต `5432`) |
   | `JWT_SECRET` | รหัสสุ่มความยาวอย่างน้อย 32 ตัวอักษรจากข้อ 2 |
   | `NODE_ENV` | `production` |

5. กด **Deploy** แล้วรอจนเสร็จสิ้น

---

## 5. ทดสอบหลัง Deploy

1. เปิด `https://<ชื่อโปรเจกต์ของคุณ>.vercel.app/api/health` — ต้องได้ข้อความ `{"success":true,"message":"CoolCare Pro API กำลังทำงาน 🆒"}`
2. เปิดหน้าเว็บหลัก `https://<ชื่อโปรเจกต์ของคุณ>.vercel.app`
3. ทดสอบจองคิวซ่อมแอร์ อัปโหลดรูปภาพ (ขนาดรวมไม่เกิน ~4MB) ค้นหารหัสติดตาม และล็อกอินหน้า Admin (`/login`)
