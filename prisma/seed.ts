import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { randomUUID } from 'crypto';
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  await prisma.$transaction(
    // @ts-ignore
    Object.keys(prisma)
      .map((model) => {
        if (model.startsWith('_') || model.startsWith('$')) {
          return false;
        }
        return prisma[model as 'user'].deleteMany();
      })
      .filter(Boolean),
  );

  const user = await prisma.user.create({
    data: {
      firstName: 'Richard',
      lastName: 'Xiong',
      email: 'richardx366@gmail.com',
      password: hashSync('password'),
      nickname: 'Dino',
      profilePicture:
        'https://avatars0.githubusercontent.com/u/527098?s=460&v=4',
      languages: 'ENGLISH',
      checkIns: {
        create: {
          emotion: 'ANGRY',
          takenAt: new Date('January 22 2022'),
        },
      },
    },
  });

  const systemUser = await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000000',
      firstName: 'System',
      lastName: 'User',
      email: 'system@veor.org',
      password: hashSync(randomUUID()),
      nickname: 'System',
      profilePicture:
        'https://avatars0.githubusercontent.com/u/527098?s=460&v=4',
      languages: 'ENGLISH',
    },
  });

  const listener = await prisma.user.create({
    data: {
      firstName: 'Dora',
      lastName: 'Fang',
      email: 'dorafang41@gmail.com',
      password: hashSync('yalikejazz'),
      nickname: 'Door',
      profilePicture:
        'https://avatars0.githubusercontent.com/u/527098?s=460&v=4',
      languages: 'MANDARIN',
      listenerProfile: {
        create: {
          about: 'I am a very good person trust',
          topics: 'FRIENDSHIP',
          reviews: {
            create: {
              rating: 5,
              content: 'It was fun!',
              user: {
                connect: {
                  id: user.id,
                },
              },
            },
          },
        },
      },
    },
  });

  const group = await prisma.group.create({
    data: {
      title: "John Doe's Group",
      description: 'A group to anonymously share your thoughts and feelings.',
      guidelines: "Respect each other's privacy.",
      topic: 'RELATIONSHIP',
      public: true,
      members: {
        create: {
          userId: user.id,
          status: 'FACILITATOR',
        },
      },
      canvas: 0,
    },
  });

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
