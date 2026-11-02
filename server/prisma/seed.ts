import { PrismaClient, TicketStatus, ServiceType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ===========================
// ฟังก์ชันสร้างรหัสติดตาม
// ===========================
function generateTrackingCode(date: Date, suffix: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `CC-${y}${m}${d}-${suffix}`;
}

async function main() {
  console.log("🌱 เริ่ม seed ข้อมูล...");

  // ===========================
  // ล้างข้อมูลเดิม (เรียงตามลำดับ dependency)
  // ===========================
  await prisma.message.deleteMany();
  await prisma.statusLog.deleteMany();
  await prisma.ticketImage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.user.deleteMany();

  // ===========================
  // สร้าง Users
  // ===========================
  const adminPassword = await bcrypt.hash("admin1234", 10);
  const staffPassword = await bcrypt.hash("staff1234", 10);
  const customerPassword = await bcrypt.hash("customer1234", 10);

  const admin = await prisma.user.create({
    data: {
      name: "สมชาย อำนวยการ",
      phone: "0800000001",
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: "สาวิตรี ใจดี",
      phone: "0800000002",
      passwordHash: staffPassword,
      role: Role.STAFF,
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "วิชัย มีศรี",
      phone: "0812345678",
      passwordHash: customerPassword,
      role: Role.CUSTOMER,
    },
  });

  console.log("✅ สร้าง Users:", { admin: admin.name, staff: staff.name, customer: customer.name });

  // ===========================
  // สร้าง Technicians (ช่าง 3 คน)
  // ===========================
  const tech1 = await prisma.technician.create({
    data: { name: "บุญมา แข็งแรง", phone: "0891111111", area: "กรุงเทพฯ ฝั่งเหนือ" },
  });

  const tech2 = await prisma.technician.create({
    data: { name: "สมพงษ์ ทำดี", phone: "0892222222", area: "กรุงเทพฯ ฝั่งใต้" },
  });

  const tech3 = await prisma.technician.create({
    data: { name: "วิรัตน์ ช่างเก่ง", phone: "0893333333", area: "ปริมณฑล" },
  });

  console.log("✅ สร้าง Technicians:", tech1.name, tech2.name, tech3.name);

  // ===========================
  // สร้าง Tickets ตัวอย่าง 5 เคส
  // ===========================

  // เคส 1: เพิ่งส่งเรื่อง (SUBMITTED)
  const ticket1 = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        trackingCode: generateTrackingCode(new Date("2024-11-01"), "A1B2"),
        service: ServiceType.REPAIR,
        brand: "Carrier",
        symptom: "ไม่เย็น",
        address: "123 ถ.ลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900",
        preferredDate: new Date("2024-11-05T10:00:00Z"),
        customerName: "มาลี สุขสันต์",
        customerPhone: "0811111111",
        status: TicketStatus.SUBMITTED,
      },
    });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.SUBMITTED, note: "ส่งเรื่องผ่านเว็บไซต์" },
    });
    return t;
  });

  // เคส 2: รับเรื่องแล้ว (RECEIVED)
  const ticket2 = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        trackingCode: generateTrackingCode(new Date("2024-10-28"), "C3D4"),
        service: ServiceType.CLEANING,
        brand: "Daikin",
        symptom: "น้ำหยด",
        address: "456 ถ.สุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110",
        preferredDate: new Date("2024-11-03T14:00:00Z"),
        customerName: "ประยุทธ์ สบายดี",
        customerPhone: "0822222222",
        status: TicketStatus.RECEIVED,
        userId: customer.id,
      },
    });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.SUBMITTED, note: "ส่งเรื่องผ่านเว็บไซต์" },
    });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.RECEIVED, note: "เจ้าหน้าที่รับเรื่องแล้ว กำลังประสานช่าง" },
    });
    return t;
  });

  // เคส 3: ช่างกำลังเข้าซ่อม (IN_PROGRESS)
  const ticket3 = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        trackingCode: generateTrackingCode(new Date("2024-10-25"), "E5F6"),
        service: ServiceType.REPAIR,
        brand: "Mitsubishi",
        symptom: "เสียงดัง",
        address: "789 ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400",
        preferredDate: new Date("2024-10-30T09:00:00Z"),
        customerName: "วิชัย มีศรี",
        customerPhone: "0812345678",
        status: TicketStatus.IN_PROGRESS,
        userId: customer.id,
        technicianId: tech1.id,
      },
    });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.SUBMITTED },
    });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.RECEIVED, note: "รับเรื่อง มอบหมายให้ช่างบุญมา" },
    });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.IN_PROGRESS, note: "ช่างกำลังเดินทางไปยังพื้นที่" },
    });
    return t;
  });

  // เคส 4: เสร็จสิ้น (COMPLETED)
  const ticket4 = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        trackingCode: generateTrackingCode(new Date("2024-10-20"), "G7H8"),
        service: ServiceType.INSTALLATION,
        brand: "Samsung",
        symptom: "ต้องการติดตั้งแอร์ใหม่",
        address: "321 ถ.พัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ 10250",
        preferredDate: new Date("2024-10-22T08:00:00Z"),
        note: "ห้องขนาด 20 ตรม. ชั้น 3 ไม่มีลิฟต์",
        customerName: "ศิริพร เพชรดา",
        customerPhone: "0833333333",
        status: TicketStatus.COMPLETED,
        technicianId: tech2.id,
      },
    });
    await tx.statusLog.create({ data: { ticketId: t.id, status: TicketStatus.SUBMITTED } });
    await tx.statusLog.create({ data: { ticketId: t.id, status: TicketStatus.RECEIVED } });
    await tx.statusLog.create({ data: { ticketId: t.id, status: TicketStatus.IN_PROGRESS } });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.COMPLETED, note: "ติดตั้งเสร็จเรียบร้อย ทดสอบการทำงานแล้ว" },
    });
    return t;
  });

  // เคส 5: ยกเลิก (CANCELLED)
  const ticket5 = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        trackingCode: generateTrackingCode(new Date("2024-10-15"), "I9J0"),
        service: ServiceType.CLEANING,
        brand: "Panasonic",
        symptom: "เปิดไม่ติด",
        address: "654 ถ.นวมินทร์ แขวงคลองกุ่ม เขตบึงกุ่ม กรุงเทพฯ 10230",
        preferredDate: new Date("2024-10-18T13:00:00Z"),
        customerName: "กมลา รักงาน",
        customerPhone: "0844444444",
        status: TicketStatus.CANCELLED,
      },
    });
    await tx.statusLog.create({ data: { ticketId: t.id, status: TicketStatus.SUBMITTED } });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.CANCELLED, note: "ลูกค้าขอยกเลิกเนื่องจากซื้อเครื่องใหม่" },
    });
    return t;
  });

  console.log("✅ สร้าง Tickets ตัวอย่าง 5 เคส");

  // ===========================
  // สร้างข้อความแชตตัวอย่าง
  // ===========================

  // แชตสำหรับเคส IN_PROGRESS (ticket3)
  await prisma.message.createMany({
    data: [
      {
        ticketId: ticket3.id,
        text: "สวัสดีครับ ผมแจ้งซ่อมแอร์เสียงดังมากครับ รบกวนเร็วๆ นะครับ",
        fromStaff: false,
        userId: customer.id,
      },
      {
        ticketId: ticket3.id,
        text: "สวัสดีค่ะ รับเรื่องแล้วนะคะ ช่างจะเข้าไปตรวจสอบในวันที่ท่านนัดไว้ค่ะ",
        fromStaff: true,
        userId: staff.id,
      },
      {
        ticketId: ticket3.id,
        text: "ขอบคุณครับ รอช่างอยู่นะครับ",
        fromStaff: false,
        userId: customer.id,
      },
    ],
  });

  // แชตสำหรับเคส COMPLETED (ticket4)
  await prisma.message.createMany({
    data: [
      {
        ticketId: ticket4.id,
        text: "ช่างทำงานเรียบร้อยมากเลยค่ะ ขอบคุณนะคะ",
        fromStaff: false,
      },
      {
        ticketId: ticket4.id,
        text: "ขอบคุณที่ไว้วางใจบริการของเราค่ะ หากมีปัญหาใดๆ ติดต่อเราได้เลยนะคะ 😊",
        fromStaff: true,
        userId: staff.id,
      },
    ],
  });

  console.log("✅ สร้างข้อความแชตตัวอย่าง");

  // ===========================
  // สรุปข้อมูล seed
  // ===========================
  console.log("\n🎉 Seed เสร็จสมบูรณ์!\n");
  console.log("📋 ข้อมูลล็อกอิน:");
  console.log("  👤 Admin  - โทร: 0800000001 | รหัสผ่าน: admin1234");
  console.log("  👤 Staff  - โทร: 0800000002 | รหัสผ่าน: staff1234");
  console.log("  👤 Customer - โทร: 0812345678 | รหัสผ่าน: customer1234");
  console.log("\n🎫 รหัสติดตามตัวอย่าง:");
  console.log(`  ${ticket1.trackingCode} (SUBMITTED)`);
  console.log(`  ${ticket2.trackingCode} (RECEIVED)`);
  console.log(`  ${ticket3.trackingCode} (IN_PROGRESS)`);
  console.log(`  ${ticket4.trackingCode} (COMPLETED)`);
  console.log(`  ${ticket5.trackingCode} (CANCELLED)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed ล้มเหลว:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
