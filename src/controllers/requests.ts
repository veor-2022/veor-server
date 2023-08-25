import { NotificationType, Request } from '@prisma/client';
import { RequestHandler } from 'express';
import { prisma } from '..';
import { AllZeroUUID, emailInviteTemplate } from '../constants';
import { mailer } from '../helpers/nodemailer';
import { sendGroupMessageHelper } from './groups';

const handleGroupInvitation = async (request: Request) => {
  const group = await prisma.group.findUniqueOrThrow({
    where: { id: request.relatedGroupId as string },
    include: {
      members: {
        where: {
          OR: [{ status: 'FACILITATOR' }, { status: 'CO_FACILITATOR' }],
        },
      },
    },
  });
  const senderIsFacilitator = !!group.members.find(
    (u) => u.userId === request.fromId
  );
  await prisma.group.update({
    where: { id: request.relatedGroupId as string },
    data: {
      members: {
        create: {
          status: 'USER',
          user: {
            connect: {
              id: senderIsFacilitator ? request.toId : request.fromId,
            },
          },
        },
      },
    },
  });
  const userInfo = await prisma.user.findUnique({
    where: { id: request.fromId },
    select: { email: true, firstName: true, nickname: true },
  });
  for (const m of group.members) {
    if (m.userId !== (senderIsFacilitator ? request.toId : request.fromId)) {
      await prisma.notification.create({
        data: {
          type: NotificationType.NEW_MEMBER,
          content: `**${
            userInfo?.nickname || userInfo?.firstName
          }** joined the group.`,
          user: { connect: { id: m.userId } },
          icon: group.canvas.toString(),
          title: group.title,
          userReferringTo: {
            connect: { id: m.userId },
          },
        },
      });
    }
    await prisma.notification.create({
      data: {
        type: NotificationType.NEW_MEMBER,
        content: `**You** have joined the group.`,
        user: {
          connect: { id: senderIsFacilitator ? request.toId : request.fromId },
        },
        icon: group.canvas.toString(),
        title: group.title,
        userReferringTo: {
          connect: { id: senderIsFacilitator ? request.toId : request.fromId },
        },
      },
    });
  }
  sendGroupMessageHelper(
    request.relatedGroupId as string,
    AllZeroUUID,
    JSON.stringify({
      type: NotificationType.NEW_MEMBER,
      content: `${userInfo?.nickname || userInfo?.firstName}`,
    })
  );
};

const handleFacilitatorInvitation = async (request: Request) => {
  const group = await prisma.group.findUnique({
    where: { id: request.relatedGroupId as string },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });
  if (!group) {
    throw new Error('Group not found');
  }
  const _user = group.members.find((m) => m.userId === request.toId);
  await prisma.groupEnrollment.update({
    where: {
      id: _user?.id,
    },
    data: {
      status: 'CO_FACILITATOR',
    },
  });
  for (const m of group.members) {
    if (m.userId !== _user?.userId) {
      await prisma.notification.create({
        data: {
          type: NotificationType.NEW_MEMBER,
          content: `**${
            _user?.user.nickname || _user?.user.firstName
          }** has become a co-facilitator of the group.`,
          user: { connect: { id: m.userId } },
          icon: group.canvas.toString(),
          title: group.title,
          userReferringTo: {
            connect: { id: m.userId },
          },
        },
      });
    }
  }
};

const handleAddToSupportsRequest = async (request: Request) => {
  const supportOf = await prisma.user.update({
    where: {
      id: request.toId,
    },
    data: {
      supportsOf: {
        connect: {
          id: request.fromId,
        },
      },
    },
  });
  const support = await prisma.user.update({
    where: {
      id: request.fromId,
    },
    data: {
      supports: {
        connect: {
          id: request.toId,
        },
      },
    },
  });
  await prisma.notification.create({
    data: {
      type: NotificationType.ADD_TO_SUPPORTS_REQUEST,
      title: supportOf.nickname || supportOf.firstName,
      icon: '',
      content: `accepted your request to connect.`,
      user: {
        connect: {
          id: request.fromId,
        },
      },
      userReferringTo: {
        connect: {
          id: request.toId,
        },
      },
    },
  });
};

const requestHandlers = {
  GROUP_INVITATION: handleGroupInvitation,
  FACILITATOR_INVITATION: handleFacilitatorInvitation,
  ADD_TO_SUPPORTS_REQUEST: handleAddToSupportsRequest,
};

export const acceptRequest: RequestHandler = async (req, res) => {
  const { id, type } = req.params;
  const request = await prisma.request.findUniqueOrThrow({ where: { id } });

  if (request.toId !== req.user?.id) {
    throw new Error('You are not authorized to accept this request');
  }
  if (request.status !== 'PENDING') {
    throw new Error('This request is not pending');
  }
  if (!Object.keys(requestHandlers).includes(request.type)) {
    throw new Error('Invalid request type');
  }

  await requestHandlers[request.type as keyof typeof requestHandlers](request);

  await prisma.request.update({
    where: { id: request.id },
    data: { status: 'ACCEPTED' },
  });

  res.send('Success');
};

export const rejectRequest: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const request = await prisma.request.findUniqueOrThrow({ where: { id } });

  if (request.toId !== req.user?.id) {
    throw new Error('You are not authorized to reject this request');
  }
  if (request.status !== 'PENDING') {
    throw new Error('This request is not pending');
  }

  await prisma.request.delete({
    where: { id },
  });

  res.send('Success');
};

export const emailSupportInvite: RequestHandler = async (req, res) => {
  const { email, userId } = req.body;

  // check if email is already a user
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (user) {
    throw new Error('This email is already associated with an account!');
  }

  const requester = await prisma.user.findUnique({
    where: { id: userId },
  });

  // TODO: add user to firebase and store db

  const mailResult = await mailer.sendMultiple({
    to: email.split(','),
    from: 'noreply@veor.org',
    templateId: emailInviteTemplate.support,
    dynamicTemplateData: {
      user: {
        first_name: requester?.firstName,
        last_name: requester?.lastName,
      },
    },
  });

  res.json({
    mailResult,
  });
};

export const createSupportRequest: RequestHandler = async (req, res) => {
  const { supportId } = req.body;

  const support = await prisma.user.findUnique({
    where: { id: supportId },
    include: {
      blocked: true,
    },
  });
  if (support?.blocked.find((b) => b.id === req.user?.id)) {
    return res.json('success');
  }

  const request = await prisma.request.create({
    data: {
      fromId: req.user?.id || '0',
      toId: supportId,
      type: NotificationType.ADD_TO_SUPPORTS_REQUEST,
      status: 'PENDING',
    },
  });

  res.json(request);
};

export const checkRequestStatus: RequestHandler = async (req, res) => {
  const { type, fromId, toId } = req.query;

  if (!type || !fromId || !toId) {
    throw new Error('Missing required fields');
  }

  const request = await prisma.request.findFirst({
    where: {
      fromId: fromId as string,
      toId: toId as string,
      type: type as NotificationType,
    },
  });

  res.json(request);
};
