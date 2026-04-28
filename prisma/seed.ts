import { prisma, prismaPool } from "../src/prisma";

async function main() {
  const s1 = await prisma.service.create({
    data: {
      title: "Full Maintenance",
      description: "Comprehensive check and repair",
      price: 200,
      duration: 120,
    },
  });
  const s2 = await prisma.service.create({
    data: {
      title: "Oil & Filter Change",
      description: "Replace oil and filter",
      price: 50,
      duration: 30,
    },
  });
  const s3 = await prisma.service.create({
    data: {
      title: "Brake Service",
      description: "Brake pad replacement and check",
      price: 150,
      duration: 90,
    },
  });
  const s4 = await prisma.service.create({
    data: {
      title: "Tire Rotation",
      description: "Rotate tires for even wear",
      price: 30,
      duration: 20,
    },
  });
  const s5 = await prisma.service.create({
    data: {
      title: "AC Check",
      description: "Check Air Conditioning system",
      price: 60,
      duration: 45,
    },
  });
  const s6 = await prisma.service.create({
    data: {
      title: "Battery Diagnostic",
      description: "Check and replace battery if needed",
      price: 40,
      duration: 30,
    },
  });

  await prisma.agency.create({
    data: {
      name: "KIA Tunis Center",
      location: "Tunis",
      latitude: 36.8065,
      longitude: 10.1815,
      services: {
        connect: [
          { id: s1.id },
          { id: s2.id },
          { id: s3.id },
          { id: s4.id },
          { id: s5.id },
          { id: s6.id },
        ],
      },
    },
  });

  await prisma.agency.create({
    data: {
      name: "KIA Sousse Motors",
      location: "Sousse",
      latitude: 35.8254,
      longitude: 10.6369,
      services: {
        connect: [{ id: s3.id }, { id: s4.id }],
      },
    },
  });

  await prisma.agency.create({
    data: {
      name: "KIA Sfax Auto",
      location: "Sfax",
      latitude: 34.7406,
      longitude: 10.7603,
      services: {
        connect: [
          { id: s1.id },
          { id: s2.id },
          { id: s3.id },
          { id: s4.id },
          { id: s5.id },
          { id: s6.id },
        ],
      },
    },
  });

  console.log("Seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await prismaPool.end();
  });
