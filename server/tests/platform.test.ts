import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createProjectSchema,
  createTechnicianSchema,
  createReviewSchema,
  chatbotLogWebhookSchema,
} from "../src/validations/project.validation";
import {
  slugifyProjectName,
  findAccessibleProject,
  createProjectTechnician,
  getProjectSatisfaction,
} from "../src/controllers/project.controller";
import { submitTicketReview } from "../src/controllers/ticket.controller";
import { mockRes, stubPrisma } from "./helpers";

const failOnNext = (err?: unknown) => {
  if (err) throw err;
};

test("slugifyProjectName: สร้าง slug ภาษาอังกฤษที่ปลอดภัยแม้ชื่อโปรเจกต์เป็นภาษาไทย", () => {
  const thaiSlug = slugifyProjectName("ร้านแอร์เย็นสบาย กรุงเทพฯ");
  assert.match(thaiSlug, /^[a-z0-9-]+$/);
  assert.ok(thaiSlug.startsWith("project-"));

  const enSlug = slugifyProjectName("CoolCare Bangkok Express");
  assert.match(enSlug, /^coolcare-bangkok-express-[a-f0-9]{4}$/);
});

test("createProjectSchema & createTechnicianSchema: validate input ครบถ้วน", () => {
  assert.equal(createProjectSchema.safeParse({ name: "A" }).success, false);
  assert.equal(
    createProjectSchema.safeParse({
      name: "ศูนย์ซ่อมแอร์สมชาย",
      slug: "somchai-ac",
      businessType: "AC_AND_IT",
    }).success,
    true
  );

  assert.equal(
    createTechnicianSchema.safeParse({ name: "ช่างบอย", phone: "123", area: "กทม" }).success,
    false
  );
  assert.equal(
    createTechnicianSchema.safeParse({
      name: "ช่างบอย",
      phone: "0891234567",
      area: "กรุงเทพฯ ฝั่งตะวันออก",
      specialty: "แอร์ Inverter",
    }).success,
    true
  );
});

test("createReviewSchema & chatbotLogWebhookSchema: ตรวจขอบเขตคะแนนและข้อความ", () => {
  assert.equal(createReviewSchema.safeParse({ rating: 6 }).success, false);
  assert.equal(createReviewSchema.safeParse({ rating: 0 }).success, false);
  assert.equal(
    createReviewSchema.safeParse({
      rating: 5,
      speedRating: 4,
      serviceRating: 5,
      tags: ["ช่างสุภาพ", "ตรงเวลา"],
      comment: "บริการดีมากครับ",
    }).success,
    true
  );

  assert.equal(
    chatbotLogWebhookSchema.safeParse({ customerName: "ลูกค้า", messages: [] }).success,
    false
  );
  assert.equal(
    chatbotLogWebhookSchema.safeParse({
      customerName: "มาลี",
      channel: "LINE",
      messages: [{ sender: "CUSTOMER", text: "แอร์ไม่เย็นค่ะ" }],
    }).success,
    true
  );
});

test("findAccessibleProject: ป้องกันข้าม Tenant (ผู้ใช้ทั่วไปเข้าโปรเจกต์คนอื่นไม่ได้)", async () => {
  const restore = stubPrisma({
    project: {
      findUnique: async () => ({
        id: "p1",
        ownerId: "owner-1",
        owner: { id: "owner-1", name: "เจ้าของ", role: "CUSTOMER" },
      }),
    },
  });
  try {
    const denied = await findAccessibleProject("p1", {
      id: "other-user",
      role: "CUSTOMER",
      name: "คนอื่น",
      phone: "0810000000",
    });
    assert.equal(denied.project, null);
    assert.equal(denied.status, 403);

    const ownerAllowed = await findAccessibleProject("p1", {
      id: "owner-1",
      role: "CUSTOMER",
      name: "เจ้าของ",
      phone: "0811111111",
    });
    assert.ok(ownerAllowed.project);
    assert.equal(ownerAllowed.status, 200);

    const adminAllowed = await findAccessibleProject("p1", {
      id: "admin-1",
      role: "ADMIN",
      name: "แอดมิน",
      phone: "0800000001",
    });
    assert.ok(adminAllowed.project);
    assert.equal(adminAllowed.status, 200);
  } finally {
    restore();
  }
});

test("createProjectTechnician: เพิ่มช่างเข้าโปรเจกต์ได้สำเร็จ", async () => {
  let createdData: any;
  const restore = stubPrisma({
    project: {
      findUnique: async () => ({
        id: "p1",
        ownerId: "u1",
        owner: { id: "u1", name: "เจ้าของ", role: "CUSTOMER" },
      }),
    },
    technician: {
      create: async ({ data }: any) => {
        createdData = data;
        return { id: "tech-new", ...data, createdAt: new Date() };
      },
    },
  });
  try {
    const res = mockRes();
    await createProjectTechnician(
      {
        params: { projectId: "p1" },
        user: { id: "u1", role: "CUSTOMER", name: "เจ้าของ", phone: "0812345678" },
        body: {
          name: "ช่างสมศักดิ์",
          phone: "0895556666",
          area: "ลาดพร้าว / จตุจักร",
          specialty: "ล้างและซ่อมแอร์",
        },
      } as any,
      res,
      failOnNext
    );
    assert.equal(res.statusCode, 201);
    assert.equal(createdData.projectId, "p1");
    assert.equal(res.body.data.name, "ช่างสมศักดิ์");
  } finally {
    restore();
  }
});

test("submitTicketReview: อนุญาตให้ประเมินเฉพาะเคส COMPLETED และกันประเมินซ้ำ", async () => {
  // 1. เคสยังไม่เสร็จ -> 400
  let restore = stubPrisma({
    ticket: {
      findUnique: async () => ({
        id: "t1",
        status: "IN_PROGRESS",
        customerName: "ลูกค้า",
        projectId: "p1",
        review: null,
      }),
    },
  });
  try {
    const res = mockRes();
    await submitTicketReview(
      { params: { code: "CC-20241101-A1B2" }, body: { rating: 5 } } as any,
      res,
      failOnNext
    );
    assert.equal(res.statusCode, 400);
  } finally {
    restore();
  }

  // 2. เคสเสร็จแล้ว -> 201
  let savedReview: any;
  restore = stubPrisma({
    ticket: {
      findUnique: async () => ({
        id: "t1",
        status: "COMPLETED",
        customerName: "ลูกค้า",
        projectId: "p1",
        review: null,
      }),
    },
    satisfactionReview: {
      create: async ({ data }: any) => {
        savedReview = data;
        return { id: "rev1", ...data, createdAt: new Date() };
      },
    },
  });
  try {
    const res = mockRes();
    await submitTicketReview(
      {
        params: { code: "CC-20241101-A1B2" },
        body: { rating: 5, speedRating: 5, serviceRating: 5, tags: ["ตรงเวลา"], comment: "ดีมาก" },
      } as any,
      res,
      failOnNext
    );
    assert.equal(res.statusCode, 201);
    assert.equal(savedReview.projectId, "p1");
    assert.equal(savedReview.rating, 5);
  } finally {
    restore();
  }
});

test("getProjectSatisfaction: คำนวณ CSAT %, ค่าเฉลี่ย และ Leaderboard ช่างได้ถูกต้อง", async () => {
  const restore = stubPrisma({
    project: {
      findUnique: async () => ({
        id: "p1",
        ownerId: "u1",
        owner: { id: "u1", name: "เจ้าของ", role: "ADMIN" },
      }),
    },
    satisfactionReview: {
      findMany: async () => [
        {
          id: "r1",
          rating: 5,
          speedRating: 5,
          serviceRating: 5,
          comment: "เยี่ยม",
          tags: ["ตรงเวลา", "ช่างสุภาพ"],
          customerName: "ลูกค้า A",
          createdAt: new Date(),
          ticket: {
            id: "t1",
            trackingCode: "CC-20241020-G7H8",
            service: "CLEANING",
            brand: "Daikin",
            technician: { id: "tech1", name: "ช่างเอ", area: "กทม" },
          },
        },
        {
          id: "r2",
          rating: 4,
          speedRating: 4,
          serviceRating: 5,
          comment: "ดี",
          tags: ["ช่างสุภาพ"],
          customerName: "ลูกค้า B",
          createdAt: new Date(),
          ticket: {
            id: "t2",
            trackingCode: "CC-20241021-X1Y2",
            service: "REPAIR",
            brand: "Carrier",
            technician: { id: "tech1", name: "ช่างเอ", area: "กทม" },
          },
        },
      ],
    },
    ticket: {
      count: async () => 4,
    },
  });
  try {
    const res = mockRes();
    await getProjectSatisfaction(
      { params: { projectId: "p1" }, user: { id: "u1", role: "ADMIN", name: "A", phone: "080" } } as any,
      res,
      failOnNext
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.summary.avgRating, 4.5);
    assert.equal(res.body.data.summary.csatRate, 100);
    assert.equal(res.body.data.summary.responseRate, 50);
    assert.equal(res.body.data.byTechnician[0].name, "ช่างเอ");
    assert.equal(res.body.data.topTags[0].tag, "ช่างสุภาพ");
    assert.equal(res.body.data.topTags[0].count, 2);
  } finally {
    restore();
  }
});
