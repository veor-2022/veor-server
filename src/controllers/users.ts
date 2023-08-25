import { compareSync, hashSync } from 'bcryptjs';
import { RequestHandler } from 'express';
import { prisma } from '..';
import { publicUserSelect } from '../constants';
import { censor } from '../helpers/censor';
import { exclude } from '../helpers/exclude';
import { randomAuthCode } from '../helpers/misc';
import { sendEmail } from '../helpers/nodemailer';
import { paginate } from '../helpers/paginate';
import admin from 'firebase-admin';

export const deleteUser: RequestHandler = async (req, res) => {
  const { id } = req.stringQuery;
  // if (req.isAdmin) {
  //   await prisma.user.delete({ where: { id } });
  //   return res.send('User deleted!');
  // }
  // const user = await prisma.user.findUniqueOrThrow({ where: { id } });
  // if (compareSync(user.password, password)) {
  //   await prisma.user.delete({ where: { id } });
  //   res.send('Success');
  // } else {
  //   throw new Error('Incorrect current password, please try again!');
  // }
  const targetUser = await prisma.user.findUniqueOrThrow({ where: { id } });
  await prisma.user.delete({ where: { id } });
  await admin.auth().deleteUser(targetUser.firebaseUID || '');
  // delete user's chats
  await prisma.message.deleteMany({ where: { userId: targetUser.id } });
  await prisma.chat.deleteMany({
    where: {
      users: {
        some: { id: targetUser.id },
      },
    },
  });
  // delete user's groups
  await prisma.group.deleteMany({
    where: {
      members: {
        some: { userId: targetUser.id },
      },
    },
  });
  // delete user's programs
  await prisma.program.deleteMany({ where: { userId: targetUser.id } });
  // delete user's requests
  await prisma.request.deleteMany({
    where: { OR: [{ fromId: targetUser.id }, { toId: targetUser.id }] },
  });
  // delete user's reviews
  await prisma.review.deleteMany({ where: { userId: targetUser.id } });
  // delete user's listener profile
  await prisma.listenerProfile.deleteMany({ where: { userId: targetUser.id } });
  // delete user's notification settings
  await prisma.notificationSettings.deleteMany({
    where: { userId: targetUser.id },
  });
  // delete user's notifications
  await prisma.notification.deleteMany({ where: { userId: targetUser.id } });
  return res.send('User deleted!');
};

export const changePassword: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;
  const user = await prisma.user.findUniqueOrThrow({ where: { id } });

  if (!user.password || compareSync(oldPassword, user.password)) {
    await prisma.user.update({
      where: { id },
      data: { password: hashSync(newPassword) },
    });
    await admin.auth().updateUser(user.firebaseUID || '', {
      password: newPassword,
    });
    res.send('Success');
  } else {
    throw new Error('Incorrect current password, please try again!');
  }
};

export const updateUser: RequestHandler = async (req, res) => {
  const { id } = req.params;
  // Create many makes sure no relations are being changed
  await prisma.user.updateMany({
    where: { id },
    data: req.body,
  });
  res.send('Success');
};

export const fetchPublicUser: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: publicUserSelect,
  });
  res.json(censor(user));
};

export const fetchUser: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    include: {
      chats: {
        include: {
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 1,
          },
          users: { select: publicUserSelect },
        },
      },
      groups: {
        include: {
          group: {
            include: {
              members: {
                where: {
                  status: 'FACILITATOR',
                },
                select: {
                  user: {
                    select: {
                      profilePicture: true,
                    },
                  },
                },
              },
              messages: {
                orderBy: { sentAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
      checkIns: true,
      supports: {
        select: {
          ...publicUserSelect,
          chats: {
            where: {
              users: { some: { id } },
            },
          },
        },
      },
      blocked: {
        select: {
          id: true,
          firstName: true,
          profilePicture: true,
          nickname: true,
        },
      },
      listenerProfile: {
        include: {
          reviews: {
            include: {
              user: true,
            },
          },
        },
      },
      notifications: true,
      requestsReceived: {
        where: { hideTo: false },
        include: {
          from: { select: publicUserSelect },
        },
      },
      requestsSent: {
        where: { hideFrom: false },
        include: {
          to: { select: publicUserSelect },
        },
      },
      reviews: true,
      programs: true,
    },
  });
  const a = await admin.auth().getUser(user.firebaseUID || '');
  user.emailVerified = a.emailVerified;
  res.json({
    ...censor(user),
    firstName: user.firstName,
    lastName: user.lastName,
  });
};

export const fetchUsers: RequestHandler = async (req, res) => {
  const searchQuery = req.stringQuery.searchQuery || '';
  const data = await paginate(req.stringQuery, 'user', {
    where: {
      OR: [
        {
          email: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
        {
          firstName: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
        {
          nickname: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
      ],
    },
  });
  censor(data.data);
  res.json(data);
};

export const resetPasswordEmail: RequestHandler = async (req, res) => {
  const { id } = req.body;
  const user = await prisma.user.findUniqueOrThrow({ where: { id } });
  const code = await randomAuthCode();
  prisma.authCode.create({
    data: {
      user: {
        connect: { id },
      },
      code,
    },
  });
  await sendEmail({
    to: user.email,
    subject: 'Veor Password Reset',
    html: `Hello ${user.firstName} ${user.lastName}},
You just received a request to reset your password on Veor. If this wasn't you, please take some actions to secure your account. Your auth code is ${code}.
From,
Veor`.replaceAll('\n', '<br /<'),
  });
  res.send('Success');
};

export const resetPassword: RequestHandler = async (req, res) => {
  const { id, code, password } = req.body;
  const authCode = await prisma.authCode.findUniqueOrThrow({
    where: { code },
  });
  if (authCode.userId === id) {
    await prisma.user.update({
      where: { id },
      data: { password: hashSync(password) },
    });
    res.send('Success');
  } else {
    throw 'Invalid code';
  }
};

export const dismissNotification: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { type, user } = req.stringQuery;
  switch (type) {
    case 'notification': {
      await prisma.notification.delete({ where: { id } });
      break;
    }
    case 'request': {
      const request = await prisma.request.findUniqueOrThrow({ where: { id } });
      if (request.fromId !== user && request.toId !== user) {
        throw new Error('You are not related to this request');
      }

      if (request.status === 'PENDING') {
        if (request.fromId === user) {
          await prisma.request.delete({ where: { id } });
        } else {
          await prisma.request.update({
            where: { id },
            data: { status: 'REJECTED', hideTo: true },
          });
        }
      } else {
        if (request.fromId === id) {
          if (request.hideTo) {
            await prisma.request.delete({ where: { id } });
          } else {
            await prisma.request.update({
              where: { id },
              data: { hideFrom: true },
            });
          }
        } else {
          {
            if (request.hideFrom) {
              await prisma.request.delete({ where: { id } });
            } else {
              await prisma.request.update({
                where: { id },
                data: { hideTo: true },
              });
            }
          }
        }
      }
      break;
    }
    default: {
      throw 'Invalid type';
    }
  }
  res.send('Success');
};

export const clearNotifications: RequestHandler = async (req, res) => {
  const { id } = req.params;
  await prisma.$transaction([
    prisma.notification.deleteMany({
      where: { userId: id },
    }),
    prisma.request.updateMany({
      where: { fromId: id, status: { in: ['ACCEPTED', 'REJECTED'] } },
      data: { hideFrom: true },
    }),
    prisma.request.updateMany({
      where: { toId: id, status: { in: ['ACCEPTED', 'REJECTED'] } },
      data: { hideTo: true },
    }),
  ]);
  res.send('Success');
};

export const setUserPushNotificationToken: RequestHandler = async (
  req,
  res
) => {
  const userId = req.user?.id;
  const { token } = req.body;
  if (!token) {
    res.send('no update');
    return;
  }
  if (!userId) {
    res.send('no user');
    return;
  }
  prisma.user.update({
    where: { id: userId },
    data: { pushNotificationTokens: token },
  });
  res.send('ok');
  return;
};

export const fetchUserLatestChatRequest: RequestHandler = async (req, res) => {
  if (!req.user?.id) {
    throw 'User not found';
  }
  const request = await prisma.chatRequest.findFirst({
    where: {
      requesterId: req.user?.id,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(request);
};

export const fetchUserChatContactHistory: RequestHandler = async (req, res) => {
  const data = await prisma.chat.findMany({
    where: {
      users: { some: { id: req.user?.id } },
      sessionEnded: false,
    },
    include: {
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
      },
      users: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nickname: true,
          profilePicture: true,
        },
      },
    },
  });
  res.json(data);
};

export const fetchUserAllRequestsAndNotifications: RequestHandler = async (
  req,
  res
) => {
  const { userId } = req.params;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      requestsReceived: {
        where: { hideTo: false },
        include: {
          from: { select: publicUserSelect },
        },
      },
      requestsSent: {
        where: {
          OR: [{ status: 'PENDING' }, { status: 'REJECTED' }],
          type: 'GROUP_INVITATION',
        },
      },
    },
  });
  const notifications = await prisma.notification.findMany({
    where: { userId },
    include: { userReferringTo: true, user: true },
  });
  res.json({ ...user, notifications });
};

export const editBlockedUsers: RequestHandler = async (req, res) => {
  const { userId } = req.params;
  const { targetUser } = req.body;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { blocked: true },
  });
  const isBlocked = user.blocked.find((u) => u.id === targetUser);
  if (isBlocked) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        blocked: {
          disconnect: { id: targetUser },
        },
      },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: {
        blocked: {
          connect: { id: targetUser },
        },
        supports: {
          disconnect: { id: targetUser },
        },
      },
    });
  }

  res.send('Success');
};

export const checkIfIsThirdParty: RequestHandler = async (req, res) => {
  const { userId } = req.params;
  const user = await prisma.user.findFirst({
    where: { id: userId },
  });
  if (!user) throw 'User not found';

  res.json({ isThirdParty: !!user.password });
};

export const updateListenerProfile: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    include: {
      listenerProfile: true,
    },
  });
  if (!user || !user.listenerProfile) {
    throw 'User not found';
  }
  const listenerProfile = await prisma.listenerProfile.update({
    where: { id: user.listenerProfile.id },
    data: req.body,
  });
  res.send(listenerProfile);
};

export const createListenerReview: RequestHandler = async (req, res) => {
  const { id, listenerId } = req.params;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    include: {
      listenerProfile: true,
    },
  });
  const listener = await prisma.user.findUniqueOrThrow({
    where: { id: listenerId },
    include: {
      listenerProfile: true,
    },
  });
  if (!user || !listener || !listener.listenerProfile) {
    throw 'User not found or is not a listener';
  }
  const oldReview = await prisma.review.findFirst({
    where: {
      userId: id,
      listenerId: listener.id,
    },
  });
  if (oldReview) {
    throw 'User already reviewed this listener';
  }
  const review = await prisma.review.create({
    data: {
      user: {
        connect: { id },
      },
      listener: {
        connect: { id: listener.listenerProfile.id },
      },
      ...req.body,
    },
  });

  res.send(review);
};
export const removeSupport: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { supporterId } = req.body;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    include: {
      listenerProfile: true,
    },
  });
  if (!user) {
    throw 'User not found or is not a listener';
  }
  const data = await prisma.user.update({
    where: { id },
    data: {
      supports: {
        disconnect: { id: supporterId },
      },
    },
  });
  await prisma.request.deleteMany({
    where: {
      fromId: id,
      toId: supporterId,
      type: 'ADD_TO_SUPPORTS_REQUEST',
    },
  });
  res.send(data);
};

export const getUserNotificationSettings: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    include: {
      notificationSetting: true,
    },
  });
  if (!user) {
    throw 'User not found';
  }
  res.send(user.notificationSetting);
};

export const updateUserNotificationSettings: RequestHandler = async (
  req,
  res
) => {
  const { id } = req.params;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    include: {
      notificationSetting: true,
    },
  });
  if (!user) {
    throw 'User not found';
  }
  const data = await prisma.notificationSettings.update({
    where: { id: user.notificationSetting?.id },
    data: req.body,
  });
  res.send(data);
};

export const checkUserBadge: RequestHandler = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw 'User not found';
  }
  const returnData = {
    isListener: false,
    isFacilitator: false,
    isHost: false,
  };
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    include: {
      programs: true,
      groups: {
        include: {
          group: true,
        },
      },
    },
  });
  for (const p of user.programs) {
    if (p.type === 'LISTENER' && p.status === 'ACCEPTED') {
      returnData.isListener = true;
    } else if (p.type === 'FACILITATOR' && p.status === 'ACCEPTED') {
      returnData.isFacilitator = true;
    }
  }
  for (const g of user.groups) {
    if (g.status === 'FACILITATOR' && g.group.public === true) {
      returnData.isHost = true;
    }
  }
  res.send(returnData);
};
