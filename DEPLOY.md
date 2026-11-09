# คู่มือ Deploy CoolCare Pro (Frontend บน Vercel + Backend บน Render)

- **Frontend** (`client/`) → Vercel
- **Backend** (`server/`) → Render
- **Database** → Supabase (PostgreSQL)

---

## ขั้นตอนที่ 1: Deploy Backend (`server`) บน Render

1. เข้าเว็บ [https://render.com](https://render.com) → ล็อกอินด้วย GitHub
2. กดปุ่ม **New +** → เลือก **Web Service** → เลือก Repository `botnoi` ของคุณ
3. ตั้งค่าตามตารางนี้:

   | ช่องตั้งค่า | ค่าที่ต้องใส่ |
   |---|---|
   | **Name** | `coolcare-api` |
   | **Region** | `Singapore` |
   | **Branch** | `main` |
   | **Root Directory** | `server` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install --include=dev && npx prisma generate && npm run build` |
   | **Start Command** | `npm run start:prod` |
   | **Instance Type** | `Free` |

4. เลื่อนลงมาที่ส่วน **Environment Variables** กดเพิ่มตัวแปรดังนี้:

   | Key | Value |
   |---|---|
   | `NODE_VERSION` | `22.12.0` |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `postgresql://postgres.ejziwqakreowjblwqrlf:0624216512yhnmju@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
   | `DIRECT_URL` | `postgresql://postgres.ejziwqakreowjblwqrlf:0624216512yhnmju@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres` |
   | `JWT_SECRET` | `c8f9a2b4d6e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5` |
   | `CLIENT_URL` | `https://botnoi-lilac.vercel.app` *(ใส่โดเมน Vercel ของคุณ แบบไม่มี `/` ปิดท้าย)* |

5. กด **Create Web Service** รอจนขึ้นสถานะสีเขียว **`Live`**
6. คัดลอก URL ของ Render ด้านบนซ้าย (เช่น `https://coolcare-api.onrender.com`)
   - ทดสอบเปิด `https://<ชื่อของคุณ>.onrender.com/api/health` ต้องขึ้น `{"success":true,"message":"CoolCare Pro API กำลังทำงาน 🆒"}`

---

## ขั้นตอนที่ 2: อัปเดต URL ของ Render ใน `client/vercel.json`

1. เปิดไฟล์ [client/vercel.json](client/vercel.json)
2. หาก URL ที่ได้จาก Render **ไม่ใช่** `https://coolcare-api.onrender.com` ให้แก้เป็น URL จริงของคุณ:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://<ชื่อ-render-ของคุณ>.onrender.com/api/:path*"
       },
       {
         "source": "/uploads/:path*",
         "destination": "https://<ชื่อ-render-ของคุณ>.onrender.com/uploads/:path*"
       },
       {
         "source": "/((?!api/|uploads/|assets/).*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
3. Commit และ Push โค้ดขึ้น GitHub:
   ```powershell
   git add .
   git commit -m "Configure separate Frontend (Vercel) and Backend (Render)"
   git push
   ```

---

## ขั้นตอนที่ 3: ตั้งค่าโปรเจกต์ Frontend บน Vercel

สำหรับโปรเจกต์ `botnoi-lilac` ที่คุณสร้างไว้บน Vercel แล้ว ให้ปรับให้ชี้ไปที่โฟลเดอร์ `client` อย่างเดียว:

1. เข้าไปที่โปรเจกต์ `botnoi-lilac` บนเว็บ Vercel → กดแท็บ **Settings** ด้านบน
2. ในเมนู **General** (หน้าแรกของ Settings):
   - เลื่อนหาหัวข้อ **Root Directory** → กดปุ่ม **Edit** → พิมพ์หรือเลือกโฟลเดอร์ **`client`** → กด **Save**
   - เลื่อนหาหัวข้อ **Framework Settings** → เปลี่ยน **Framework Preset** เป็น **`Vite`** → กด **Save**
3. ไปที่แท็บ **Deployments** ด้านบน → กดจุด 3 จุด (`...`) ที่รายการบนสุด → กด **Redeploy**

เสร็จเรียบร้อย! เว็บ `https://botnoi-lilac.vercel.app` จะโหลดหน้าเว็บจาก `client` และส่งคำสั่ง `/api/*` ไปหา Backend บน Render ทันทีครับ
