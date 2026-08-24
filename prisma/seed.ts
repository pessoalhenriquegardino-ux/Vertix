import { PrismaClient, MetricSource, Role, LeadStage, ActivityType, ActivityOutcome } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const adminName = process.env.SEED_ADMIN_NAME ?? "Admin Vertix";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@verticecreate.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "troque-esta-senha";

  const adminHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });
  console.log(`Admin pronto: ${admin.email}`);

  // Cliente de exemplo
  const client = await prisma.client.upsert({
    where: { id: "seed-cliente-exemplo" },
    update: {},
    create: {
      id: "seed-cliente-exemplo",
      name: "Clínica Exemplo",
      segment: "Estética",
      active: true,
    },
  });

  const clientEmail = "cliente@verticecreate.com";
  const clientHash = await bcrypt.hash("cliente123", 12);
  const clientUser = await prisma.user.upsert({
    where: { email: clientEmail },
    update: {},
    create: {
      name: "Usuário Clínica Exemplo",
      email: clientEmail,
      passwordHash: clientHash,
      role: Role.CLIENT,
      clientId: client.id,
    },
  });
  console.log(`Cliente de exemplo pronto: ${client.name} / login: ${clientUser.email} / senha: cliente123`);

  // ~30 dias de métricas fictícias
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);

    const leadsGenerated = randomInt(8, 25);
    const leadsInAnalysis = randomInt(2, Math.min(10, leadsGenerated));
    const leadsQualified = randomInt(1, Math.min(8, leadsGenerated));
    const leadsProposal = randomInt(0, Math.min(5, leadsQualified));
    const leadsWon = randomInt(0, Math.min(3, leadsProposal + 1));
    const leadsLost = Math.max(
      0,
      leadsGenerated - leadsInAnalysis - leadsQualified - leadsProposal - leadsWon
    );
    const adSpend = randomInt(80, 400) + Math.random();

    await prisma.dailyMetric.upsert({
      where: {
        clientId_date_source: {
          clientId: client.id,
          date,
          source: MetricSource.MANUAL,
        },
      },
      update: {},
      create: {
        clientId: client.id,
        date,
        adSpend,
        leadsGenerated,
        leadsInAnalysis,
        leadsQualified,
        leadsProposal,
        leadsWon,
        leadsLost,
        source: MetricSource.MANUAL,
        createdByUserId: admin.id,
      },
    });
  }

  console.log("Seed de métricas (30 dias) concluído.");

  // ~30 dias de métricas de campanha (estilo Meta Ads), 1-2 campanhas por dia
  const campaignNames = ["Campanha Leads - Feed", "Campanha Leads - Stories"];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);

    for (const campaignName of campaignNames) {
      const impressions = randomInt(2000, 9000);
      const clicks = randomInt(30, Math.round(impressions * 0.03));
      const amountSpent = randomInt(60, 220) + Math.random();
      const results = randomInt(1, Math.max(1, Math.round(clicks * 0.3)));
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? amountSpent / clicks : 0;
      const cpm = impressions > 0 ? (amountSpent / impressions) * 1000 : 0;
      const costPerResult = results > 0 ? amountSpent / results : 0;

      await prisma.campaignMetric.upsert({
        where: {
          clientId_date_campaignName_source: {
            clientId: client.id,
            date,
            campaignName,
            source: MetricSource.MANUAL,
          },
        },
        update: {},
        create: {
          clientId: client.id,
          date,
          campaignName,
          amountSpent,
          impressions,
          clicks,
          results,
          ctr,
          cpc,
          cpm,
          costPerResult,
          reach: Math.round(impressions * 0.7),
          frequency: 1 + Math.random(),
          source: MetricSource.MANUAL,
          createdByUserId: admin.id,
        },
      });
    }
  }

  console.log("Seed de métricas de campanha (30 dias) concluído.");

  // Alguns leads de exemplo no CRM, com atividades/cadência
  const sampleLeads = [
    { name: "Ana Souza", phone: "(11) 98888-0001", email: "ana@exemplo.com", source: "Meta Ads", stage: LeadStage.NEW, value: 1800 },
    { name: "Bruno Lima", phone: "(11) 98888-0002", email: "bruno@exemplo.com", source: "Meta Ads", stage: LeadStage.IN_ANALYSIS, value: 2200 },
    { name: "Carla Dias", phone: "(11) 98888-0003", email: "carla@exemplo.com", source: "Indicação", stage: LeadStage.QUALIFIED, value: 3200 },
    { name: "Diego Alves", phone: "(11) 98888-0004", email: "diego@exemplo.com", source: "Meta Ads", stage: LeadStage.PROPOSAL, value: 4100 },
    { name: "Elaine Costa", phone: "(11) 98888-0005", email: "elaine@exemplo.com", source: "Orgânico", stage: LeadStage.WON, value: 2900 },
    { name: "Fábio Rocha", phone: "(11) 98888-0006", email: "fabio@exemplo.com", source: "Meta Ads", stage: LeadStage.LOST, value: 1500 },
  ];

  for (const l of sampleLeads) {
    // recria os leads de exemplo a cada seed, pra manter a cadência de demonstração atualizada
    await prisma.lead.deleteMany({ where: { clientId: client.id, email: l.email } });

    const lead = await prisma.lead.create({
      data: {
        clientId: client.id,
        name: l.name,
        phone: l.phone,
        email: l.email,
        source: l.source,
        stage: l.stage,
        value: l.value,
        createdByUserId: admin.id,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: ActivityType.WHATSAPP,
        note: "Primeiro contato",
        outcome: ActivityOutcome.RESPONDED,
        completedAt: new Date(),
        createdByUserId: admin.id,
      },
    });

    if (l.stage !== LeadStage.WON && l.stage !== LeadStage.LOST) {
      // metade dos leads em aberto fica com follow-up atrasado, pra já
      // mostrar o alerta de cadência vencida no board
      const offsetDays = randomInt(-3, 5);
      const followUp = new Date(today);
      followUp.setUTCDate(followUp.getUTCDate() + offsetDays);
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: ActivityType.CALL,
          note: "Segundo contato",
          scheduledAt: followUp,
          createdByUserId: admin.id,
        },
      });
    }
  }

  console.log("Seed de leads de exemplo (CRM) concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
