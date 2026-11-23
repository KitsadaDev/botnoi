import { PrismaClient, TicketStatus, ServiceType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function generateTrackingCode(date: Date, suffix: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `CC-${y}${m}${d}-${suffix}`;
}

async function main() {
  console.log("🌱 เริ่ม seed ข้อมูล Plasom Platform...");

  // ล้างข้อมูลเดิม (เรียงตามลำดับ dependency)
  await prisma.chatLogMessage.deleteMany();
  await prisma.chatConversation.deleteMany();
  await prisma.satisfactionReview.deleteMany();
  await prisma.message.deleteMany();
  await prisma.statusLog.deleteMany();
  await prisma.ticketImage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.project.deleteMany();
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
  // สร้าง Projects ตัวอย่าง (Multi-tenant)
  // ===========================
  const mainProject = await prisma.project.create({
    data: {
      name: "Plasom ศูนย์บริการแอร์ & ไอที (สาขาหลัก)",
      slug: "plasom-main",
      description: "ศูนย์บริการล้าง ซ่อม ติดตั้งเครื่องปรับอากาศ และซ่อมอุปกรณ์ไอทีครบวงจร พร้อม AI Chatbot & Voicebot 24 ชม.",
      businessType: "AC_AND_IT",
      phone: "02-123-4567",
      lineOaId: "@plasom-care",
      botnoiBotId: "6af1990838450ceff91278ac",
      ownerId: admin.id,
    },
  });

  const secondProject = await prisma.project.create({
    data: {
      name: "CoolBreeze Express (สาขาปริมณฑล)",
      slug: "coolbreeze-metro",
      description: "บริการล้างแอร์ด่วนและบำรุงรักษาแอร์สำนักงานพื้นที่นนทบุรี ปทุมธานี สมุทรปราการ",
      businessType: "AC_SERVICE",
      phone: "02-987-6543",
      lineOaId: "@coolbreeze",
      ownerId: admin.id,
    },
  });

  const entrepreneurProject = await prisma.project.create({
    data: {
      name: "วิชัย ไอที & แอร์เซอร์วิส",
      slug: "wichai-service",
      description: "ร้านซ่อมคอมพิวเตอร์ โน้ตบุ๊ก และบริการล้างแอร์บ้านโดยช่างมืออาชีพ",
      businessType: "AC_AND_IT",
      phone: "081-234-5678",
      ownerId: customer.id,
    },
  });

  console.log("✅ สร้าง Projects:", mainProject.slug, secondProject.slug, entrepreneurProject.slug);

  // ===========================
  // สร้าง Technicians (ช่างประจำโปรเจกต์)
  // ===========================
  const tech1 = await prisma.technician.create({
    data: {
      name: "บุญมา แข็งแรง",
      phone: "0891111111",
      area: "กรุงเทพฯ ฝั่งเหนือ",
      specialty: "ซ่อมแอร์ Inverter / ตรวจเช็คคอมเพรสเซอร์",
      isAvailable: true,
      projectId: mainProject.id,
    },
  });

  const tech2 = await prisma.technician.create({
    data: {
      name: "สมพงษ์ ทำดี",
      phone: "0892222222",
      area: "กรุงเทพฯ ฝั่งใต้",
      specialty: "ติดตั้ง / ย้ายแอร์ / ล้างแอร์ใหญ่",
      isAvailable: true,
      projectId: mainProject.id,
    },
  });

  const tech3 = await prisma.technician.create({
    data: {
      name: "วิรัตน์ ช่างเก่ง",
      phone: "0893333333",
      area: "ปริมณฑล",
      specialty: "ซ่อมคอมพิวเตอร์ โน้ตบุ๊ก การ์ดจอ และอุปกรณ์ไอที",
      isAvailable: true,
      projectId: mainProject.id,
    },
  });

  const tech4 = await prisma.technician.create({
    data: {
      name: "ธนากร ไวทันใจ",
      phone: "0894444444",
      area: "นนทบุรี / แจ้งวัฒนะ",
      specialty: "ล้างแอร์ด่วน / แอร์สำนักงาน",
      isAvailable: true,
      projectId: secondProject.id,
    },
  });

  console.log("✅ สร้าง Technicians:", tech1.name, tech2.name, tech3.name, tech4.name);

  // ===========================
  // สร้าง Tickets ตัวอย่าง
  // ===========================
  const ticket1 = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        trackingCode: generateTrackingCode(new Date("2024-11-01"), "A1B2"),
        service: ServiceType.REPAIR,
        brand: "Carrier",
        symptom: "ไม่เย็น มีแต่ลมออก",
        address: "123 ถ.ลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900",
        preferredDate: new Date("2024-11-05T10:00:00Z"),
        customerName: "มาลี สุขสันต์",
        customerPhone: "0811111111",
        status: TicketStatus.SUBMITTED,
        source: "CHATBOT",
        projectId: mainProject.id,
      },
    });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.SUBMITTED, note: "รับเรื่องอัตโนมัติผ่าน AI Chatbot" },
    });
    return t;
  });

  const ticket2 = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        trackingCode: generateTrackingCode(new Date("2024-10-28"), "C3D4"),
        service: ServiceType.CLEANING,
        brand: "Daikin",
        symptom: "น้ำหยดและมีกลิ่นอับ",
        address: "456 ถ.สุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110",
        preferredDate: new Date("2024-11-03T14:00:00Z"),
        customerName: "ประยุทธ์ สบายดี",
        customerPhone: "0822222222",
        status: TicketStatus.RECEIVED,
        source: "VOICEBOT",
        userId: customer.id,
        projectId: mainProject.id,
      },
    });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.SUBMITTED, note: "แจ้งซ่อมผ่าน AI Voicebot" },
    });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.RECEIVED, note: "เจ้าหน้าที่รับเรื่องแล้ว กำลังประสานช่าง" },
    });
    return t;
  });

  const ticket3 = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        trackingCode: generateTrackingCode(new Date("2024-10-25"), "E5F6"),
        service: ServiceType.REPAIR,
        brand: "Mitsubishi",
        symptom: "เสียงดังเวลาคอมเพรสเซอร์ทำงาน",
        address: "789 ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400",
        preferredDate: new Date("2024-10-30T09:00:00Z"),
        customerName: "วิชัย มีศรี",
        customerPhone: "0812345678",
        status: TicketStatus.IN_PROGRESS,
        source: "WEB",
        userId: customer.id,
        technicianId: tech1.id,
        projectId: mainProject.id,
      },
    });
    await tx.statusLog.create({ data: { ticketId: t.id, status: TicketStatus.SUBMITTED } });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.RECEIVED, note: "รับเรื่อง มอบหมายให้ช่างบุญมา" },
    });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.IN_PROGRESS, note: "ช่างกำลังเดินทางไปยังพื้นที่" },
    });
    return t;
  });

  const ticket4 = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        trackingCode: generateTrackingCode(new Date("2024-10-20"), "G7H8"),
        service: ServiceType.INSTALLATION,
        brand: "Samsung",
        symptom: "ต้องการติดตั้งแอร์ใหม่ขนาด 18,000 BTU",
        address: "321 ถ.พัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ 10250",
        preferredDate: new Date("2024-10-22T08:00:00Z"),
        note: "ห้องขนาด 20 ตรม. ชั้น 3 ไม่มีลิฟต์",
        customerName: "ศิริพร เพชรดา",
        customerPhone: "0833333333",
        status: TicketStatus.COMPLETED,
        source: "LINE",
        technicianId: tech2.id,
        projectId: mainProject.id,
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
        source: "WEB",
        projectId: mainProject.id,
      },
    });
    await tx.statusLog.create({ data: { ticketId: t.id, status: TicketStatus.SUBMITTED } });
    await tx.statusLog.create({
      data: { ticketId: t.id, status: TicketStatus.CANCELLED, note: "ลูกค้าขอยกเลิกเนื่องจากซื้อเครื่องใหม่" },
    });
    return t;
  });

  const ticket6 = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        trackingCode: generateTrackingCode(new Date("2024-10-29"), "K1L2"),
        service: ServiceType.IT_REPAIR,
        brand: "โน้ตบุ๊ก (Notebook)",
        symptom: "เปิดเครื่องแล้วหน้าจอดำ พัดลมหมุนแรง",
        address: "88/12 ถ.พระราม 9 แขวงห้วยขวาง กรุงเทพฯ 10310",
        preferredDate: new Date("2024-11-01T11:00:00Z"),
        customerName: "ณัฐพงษ์ วงศ์สุวรรณ",
        customerPhone: "0855555555",
        status: TicketStatus.COMPLETED,
        source: "CHATBOT",
        technicianId: tech3.id,
        projectId: mainProject.id,
      },
    });
    await tx.statusLog.create({ data: { ticketId: t.id, status: TicketStatus.SUBMITTED } });
    await tx.statusLog.create({ data: { ticketId: t.id, status: TicketStatus.COMPLETED, note: "เปลี่ยนสายแพจอและทำความสะอาดพัดลมเรียบร้อย" } });
    return t;
  });

  const ticket7 = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        trackingCode: generateTrackingCode(new Date("2024-10-26"), "M3N4"),
        service: ServiceType.CLEANING,
        brand: "Daikin",
        symptom: "ล้างแอร์ประจำปี 2 เครื่อง ลมเบา",
        address: "55/9 ถ.งามวงศ์วาน อ.เมือง จ.นนทบุรี 11000",
        preferredDate: new Date("2024-10-29T10:00:00Z"),
        customerName: "อรวรรณ ใจงาม",
        customerPhone: "0866666666",
        status: TicketStatus.COMPLETED,
        source: "WEB",
        technicianId: tech1.id,
        projectId: mainProject.id,
      },
    });
    await tx.statusLog.create({ data: { ticketId: t.id, status: TicketStatus.SUBMITTED } });
    await tx.statusLog.create({ data: { ticketId: t.id, status: TicketStatus.COMPLETED, note: "ล้างใหญ่เรียบร้อย แอร์เย็นฉ่ำ" } });
    return t;
  });

  console.log("✅ สร้าง Tickets ตัวอย่าง 7 เคส");

  // ===========================
  // สร้างแบบประเมินความพึงพอใจตัวอย่าง (CSAT)
  // ===========================
  await prisma.satisfactionReview.createMany({
    data: [
      {
        ticketId: ticket4.id,
        projectId: mainProject.id,
        customerName: ticket4.customerName,
        rating: 5,
        speedRating: 5,
        serviceRating: 5,
        tags: ["ช่างสุภาพ", "งานเรียบร้อย", "ตรงเวลา"],
        comment: "ช่างสมพงษ์ทำงานละเอียดมาก เดินท่อสวยงาม เก็บความสะอาดให้เรียบร้อย ประทับใจครับ",
      },
      {
        ticketId: ticket6.id,
        projectId: mainProject.id,
        customerName: ticket6.customerName,
        rating: 5,
        speedRating: 4,
        serviceRating: 5,
        tags: ["แก้ปัญหาจบ", "แจ้งราคาก่อนซ่อม", "ช่างเชี่ยวชาญ"],
        comment: "แจ้งซ่อมผ่านแชทบอทสะดวกมาก ช่างวิรัตน์อธิบายอาการชัดเจน ซ่อมไวใช้ได้ปกติเลย",
      },
      {
        ticketId: ticket7.id,
        projectId: mainProject.id,
        customerName: ticket7.customerName,
        rating: 4,
        speedRating: 4,
        serviceRating: 5,
        tags: ["ช่างสุภาพ", "สะอาดมาก"],
        comment: "ล้างแอร์สะอาดดีมาก แอร์เย็นขึ้นชัดเจน อยากให้เพิ่มรอบช่วงเย็นด้วยค่ะ",
      },
    ],
  });

  console.log("✅ สร้างแบบประเมินความพึงพอใจตัวอย่าง 3 รายการ");

  // ===========================
  // สร้างข้อความแชตในเคสตัวอย่าง
  // ===========================
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

  // ===========================
  // สร้างประวัติแชทกลางจาก Chatbot Platform / LINE / Voicebot
  // ===========================
  const conv1 = await prisma.chatConversation.create({
    data: {
      externalUserId: "bn_user_malee_001",
      customerName: "มาลี สุขสันต์",
      customerPhone: "0811111111",
      channel: "CHATBOT",
      status: "OPEN",
      summary: "แจ้งซ่อมแอร์ Carrier ไม่เย็น มีแต่ลมออก (เปิดใบงาน CC-20241101-A1B2)",
      projectId: mainProject.id,
      ticketId: ticket1.id,
      lastMessageAt: new Date(Date.now() - 15 * 60 * 1000),
      messages: {
        create: [
          {
            sender: "CUSTOMER",
            senderName: "มาลี สุขสันต์",
            text: "สวัสดีค่ะ แอร์ Carrier ที่บ้านเปิดแล้วไม่เย็นเลย มีแต่ลมออกมา",
            createdAt: new Date(Date.now() - 25 * 60 * 1000),
          },
          {
            sender: "BOT",
            senderName: "Plasom AI Chatbot",
            text: "สวัสดีค่ะ น้อง Plasom ยินดีช่วยดูแลนะคะ เบื้องต้นขอทราบที่อยู่ เบอร์ติดต่อ และวันที่สะดวกให้ช่างเข้าตรวจเช็คค่ะ",
            createdAt: new Date(Date.now() - 24 * 60 * 1000),
          },
          {
            sender: "CUSTOMER",
            senderName: "มาลี สุขสันต์",
            text: "123 ถ.ลาดพร้าว จตุจักร โทร 0811111111 สะดวกวันที่ 5 พ.ย. ช่วง 10 โมงค่ะ",
            createdAt: new Date(Date.now() - 20 * 60 * 1000),
          },
          {
            sender: "BOT",
            senderName: "Plasom AI Chatbot",
            text: "บันทึกใบงานเรียบร้อยแล้วค่ะ รหัสติดตามคือ CC-20241101-A1B2 เจ้าหน้าที่จะรีบจัดคิวช่างให้นะคะ",
            createdAt: new Date(Date.now() - 15 * 60 * 1000),
          },
        ],
      },
    },
  });

  const conv2 = await prisma.chatConversation.create({
    data: {
      externalUserId: "line_U8293041",
      customerName: "คุณกานดา พิพัฒน์",
      customerPhone: "0879998877",
      channel: "LINE",
      status: "OPEN",
      summary: "สอบถามโปรโมชันล้างแอร์ 3 เครื่อง และขอใบเสนอราคาบริษัท",
      projectId: mainProject.id,
      lastMessageAt: new Date(Date.now() - 45 * 60 * 1000),
      messages: {
        create: [
          {
            sender: "CUSTOMER",
            senderName: "คุณกานดา พิพัฒน์",
            text: "สอบถามหน่อยค่ะ ถ้าล้างแอร์ออฟฟิศ 3 เครื่องราคาเท่าไหร่ ออกใบกำกับภาษีได้ไหมคะ",
            createdAt: new Date(Date.now() - 50 * 60 * 1000),
          },
          {
            sender: "BOT",
            senderName: "LINE OA AI Bot",
            text: "ล้างแอร์ตั้งแต่ 2 เครื่องขึ้นไป ราคาพิเศษเครื่องละ 500 บาทค่ะ (3 เครื่อง 1,500 บาท) และสามารถออกใบกำกับภาษีเต็มรูปแบบได้ค่ะ",
            createdAt: new Date(Date.now() - 48 * 60 * 1000),
          },
          {
            sender: "CUSTOMER",
            senderName: "คุณกานดา พิพัฒน์",
            text: "โอเคเลยค่ะ เดี๋ยวขอส่งรายละเอียดบริษัทให้เจ้าหน้าที่ออกใบเสนอราคานะคะ",
            createdAt: new Date(Date.now() - 45 * 60 * 1000),
          },
        ],
      },
    },
  });

  const conv3 = await prisma.chatConversation.create({
    data: {
      externalUserId: "voice_call_9921",
      customerName: "ประยุทธ์ สบายดี",
      customerPhone: "0822222222",
      channel: "VOICEBOT",
      status: "RESOLVED",
      summary: "โทรผ่านสายด่วน Voicebot นัดล้างแอร์ Daikin อาการน้ำหยด",
      projectId: mainProject.id,
      ticketId: ticket2.id,
      lastMessageAt: new Date(Date.now() - 120 * 60 * 1000),
      messages: {
        create: [
          {
            sender: "CUSTOMER",
            senderName: "ประยุทธ์ สบายดี (เสียง)",
            text: "ฮัลโหลครับ แอร์ไดกิ้นที่คอนโดสุขุมวิทมันมีน้ำหยด อยากนัดช่างมาล้างแอร์ครับ",
            createdAt: new Date(Date.now() - 125 * 60 * 1000),
          },
          {
            sender: "BOT",
            senderName: "Plasom AI Voicebot",
            text: "รับทราบค่ะ คุณประยุทธ์ นัดล้างแอร์ Daikin ที่สุขุมวิทเรียบร้อยแล้ว รหัสติดตาม CC-20241028-C3D4 ค่ะ",
            createdAt: new Date(Date.now() - 120 * 60 * 1000),
          },
        ],
      },
    },
  });

  console.log("✅ สร้างประวัติแชทกลางตัวอย่าง:", conv1.id, conv2.id, conv3.id);

  console.log("\n🎉 Seed เสร็จสมบูรณ์!\n");
  console.log("📋 ข้อมูลล็อกอิน:");
  console.log("  👤 Admin / เจ้าของแพลตฟอร์ม - โทร: 0800000001 | รหัสผ่าน: admin1234");
  console.log("  👤 Staff / เจ้าหน้าที่       - โทร: 0800000002 | รหัสผ่าน: staff1234");
  console.log("  👤 Customer / ผู้ประกอบการ  - โทร: 0812345678 | รหัสผ่าน: customer1234");
}

main()
  .catch((e) => {
    console.error("❌ Seed ล้มเหลว:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
