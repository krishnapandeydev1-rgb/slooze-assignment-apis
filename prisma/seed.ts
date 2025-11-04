import {
  PrismaClient,
  Role,
  Country,
  PaymentType,
  OrderStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// for seeding npx ts-node prisma/seed.ts

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ---------- Users ----------
  const password = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'nick.fury@slooze.xyz' },
    update: {},
    create: {
      name: 'Nick Fury',
      email: 'nick.fury@slooze.xyz',
      password,
      role: Role.ADMIN,
      country: Country.INDIA,
    },
  });

  const managerIndia = await prisma.user.upsert({
    where: { email: 'captain.marvel@slooze.xyz' },
    update: {},
    create: {
      name: 'Captain Marvel',
      email: 'captain.marvel@slooze.xyz',
      password,
      role: Role.MANAGER,
      country: Country.INDIA,
    },
  });

  const managerAmerica = await prisma.user.upsert({
    where: { email: 'captain.america@slooze.xyz' },
    update: {},
    create: {
      name: 'Captain America',
      email: 'captain.america@slooze.xyz',
      password,
      role: Role.MANAGER,
      country: Country.AMERICA,
    },
  });

  const thanos = await prisma.user.upsert({
    where: { email: 'thanos@slooze.xyz' },
    update: {},
    create: {
      name: 'Thanos',
      email: 'thanos@slooze.xyz',
      password,
      role: Role.MEMBER,
      country: Country.INDIA,
    },
  });

  const thor = await prisma.user.upsert({
    where: { email: 'thor@slooze.xyz' },
    update: {},
    create: {
      name: 'Thor',
      email: 'thor@slooze.xyz',
      password,
      role: Role.MEMBER,
      country: Country.INDIA,
    },
  });

  const travis = await prisma.user.upsert({
    where: { email: 'travis@slooze.xyz' },
    update: {},
    create: {
      name: 'Travis',
      email: 'travis@slooze.xyz',
      password,
      role: Role.MEMBER,
      country: Country.AMERICA,
    },
  });

  // ---------- Restaurants ----------
  const restaurantIndia = await prisma.restaurant.create({
    data: {
      name: 'Tandoori Express',
      country: Country.INDIA,
      menuItems: {
        create: [
          { name: 'Butter Chicken', price: 350 },
          { name: 'Paneer Tikka', price: 250 },
          { name: 'Biryani', price: 300 },
        ],
      },
    },
    include: { menuItems: true },
  });

  const restaurantAmerica = await prisma.restaurant.create({
    data: {
      name: 'Burger Planet',
      country: Country.AMERICA,
      menuItems: {
        create: [
          { name: 'Cheese Burger', price: 10 },
          { name: 'Fries', price: 4 },
          { name: 'Hotdog', price: 8 },
        ],
      },
    },
    include: { menuItems: true },
  });

  // ---------- Example Orders ----------
  const order1 = await prisma.order.create({
    data: {
      userId: thanos.id,
      restaurantId: restaurantIndia.id,
      totalAmount: 350,
      status: OrderStatus.PAID,
      country: Country.INDIA,
      items: {
        create: [
          {
            menuItemId: restaurantIndia.menuItems[0].id,
            quantity: 1,
            price: restaurantIndia.menuItems[0].price,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      userId: travis.id,
      restaurantId: restaurantAmerica.id,
      totalAmount: 14,
      status: OrderStatus.PENDING,
      country: Country.AMERICA,
      items: {
        create: [
          {
            menuItemId: restaurantAmerica.menuItems[1].id,
            quantity: 2,
            price: restaurantAmerica.menuItems[1].price * 2,
          },
        ],
      },
    },
  });

  // ---------- Payment Methods ----------
  await prisma.paymentMethod.createMany({
    data: [
      {
        userId: admin.id,
        type: PaymentType.CARD,
        details: { cardNumber: '1234-5678-9012-3456', holder: 'Nick Fury' },
      },
      {
        userId: managerIndia.id,
        type: PaymentType.UPI,
        details: { upiId: 'captainmarvel@upi' },
      },
      {
        userId: managerAmerica.id,
        type: PaymentType.CARD,
        details: {
          cardNumber: '9999-1111-2222-3333',
          holder: 'Captain America',
        },
      },
    ],
  });

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
