import { GroupMemberStatus, Prisma, Topic } from '@prisma/client';
import { compareSync } from 'bcryptjs';
import e, { RequestHandler } from 'express';
import { prisma } from '..';
import {
  AllZeroUUID,
  emailInviteTemplate,
  PAGE_SIZE,
  publicUserSelect,
} from '../constants';
import { censor } from '../helpers/censor';
import { convertTrueStringsInObjectToBoolean } from '../helpers/misc';
import { paginate } from '../helpers/paginate';
import { firestore } from '..';
import { FieldValue } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { mailer, sendEmail } from '../helpers/nodemailer';

export const deleteGroup: RequestHandler = async (req, res) => {
  const { id, password } = req.stringQuery;
  const chatMessageRef = firestore.collection('groupMessages');
  if (req.isAdmin) {
    await prisma.group.delete({ where: { id: id as string } });
    res.send('Success');
  }
  const group = await prisma.group.findUniqueOrThrow({
    where: { id: id as string },
    include: {
      members: {
        where: {
          status: 'FACILITATOR',
        },
        include: { user: true },
      },
    },
  });
  if (compareSync(group.members[0].user.password, password as string)) {
    await prisma.group.delete({ where: { id: id as string } });
    await chatMessageRef.doc(id as string).delete();
    res.send('Success');
  } else {
    throw new Error('Incorrect password, please try again!');
  }
};

export const createGroup: RequestHandler = async (req, res) => {
  const {
    title,
    description,
    meetingInfo,
    meetingSchedule,
    meetingLink,
    guidelines,
    topic,
    public: isPublic,
    creator,
    canvas,
  } = req.body;
  const chatMessageRef = firestore.collection('groupMessages');
  const creatorInfo = await prisma.user.findUnique({
    where: { id: creator },
    include: {
      programs: true,
    },
  });

  if (!creatorInfo) throw new Error('User does not exist');

  const isFacilitator = creatorInfo?.programs?.find(
    (program) => program.type === 'FACILITATOR' && program.status === 'ACCEPTED'
  );

  if (!isFacilitator && isPublic) {
    throw new Error(
      "You must be a verified listener in your group's topic in order for this group to be public! If you are not, you can make it public once a verified listener becomes a facilitator in your group."
    );
  }

  if (canvas < 0 || canvas > 8) throw new Error('Invalid canvas');

  // const existingUsers = await prisma.user
  //   .findMany({
  //     where: { id: { in: [...facilitators, ...members] } },
  //   })
  //   .then((users) => users.map((user) => user.id));

  // const nonExistingUsers = [...facilitators, ...members].filter(
  //   (userId: string) => !existingUsers.includes(userId)
  // );

  // await prisma.$transaction(async (tx) => {
  //   // await prisma.user.createMany({
  //   //   data: nonExistingUsers.map((email: string) => ({
  //   //     email,
  //   //     firstName: '',
  //   //     lastName: '',
  //   //     password: '',
  //   //   })),
  //   // });

  // });

  const group = await prisma.group.create({
    data: {
      title,
      description,
      meetingInfo,
      meetingSchedule,
      meetingLink,
      guidelines,
      topic: topic.toUpperCase(),
      public: isPublic,
      members: {
        createMany: {
          data: [{ userId: creator, status: 'FACILITATOR' }],
        },
      },
      canvas,
      // relatedRequests: {
      //   createMany: {
      //     data: [
      //       ...facilitators.map((userId: string) => ({
      //         fromId: creator,
      //         toId: userId,
      //         status: 'FACILITATOR_INVITATION',
      //       })),
      //       ...members.map((userId: string) => ({
      //         fromId: creator,
      //         toId: userId,
      //         status: 'GROUP_INVITATION',
      //       })),
      //     ],
      //   },
      // },
    },
  });

  await chatMessageRef.doc(group.id).set({
    members: {
      [creator || '']: {
        firstName: creatorInfo.firstName,
        lastName: creatorInfo.lastName,
      },
      [AllZeroUUID]: {
        firstName: 'System',
        lastName: 'Message',
      },
    },
    messages: [],
    id: group.id,
  });

  await sendGroupMessageHelper(
    group.id,
    AllZeroUUID,
    JSON.stringify({
      type: 'GROUP_CREATED',
      content: `Welcome to ${title}!`,
    })
  );
  res.json(group);

  // TODO: Send emails to created users to invite them. Extract this into a helper function.
};

export const updateGroup: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    guidelines,
    topic,
    public: isPublic,
    meetingInfo,
    meetingSchedule,
    meetingLink,
    canvas,
  } = req.body;
  const groupFound = await prisma.group.findUniqueOrThrow({
    where: { id },
    include: {
      members: {
        include: { user: { include: { listenerProfile: true } } },
        where: { status: { in: ['FACILITATOR', 'CO_FACILITATOR'] } },
      },
    },
  });

  const userFound = await prisma.user.findUnique({
    where: { id: req.user?.id },
    include: { programs: true },
  });

  if (!userFound) throw new Error('User not found!');

  if (
    !userFound?.programs?.find(
      (program) =>
        program.type === 'FACILITATOR' && program.status === 'ACCEPTED'
    ) &&
    isPublic
  ) {
    throw new Error(
      'Your group must have at least one verified facilitator to be a public group!'
    );
  }

  if (
    !req.isAdmin &&
    groupFound.members.find(({ status }) => status === 'FACILITATOR')
      ?.userId !== req.user?.id
  ) {
    throw new Error('You must be the admin of this group to update it!');
  }

  const group = await prisma.group.update({
    where: { id },
    data: {
      title,
      description,
      guidelines,
      topic,
      meetingInfo,
      meetingSchedule,
      meetingLink,
      canvas,
      public: isPublic,
    },
    include: {
      members: true,
    },
  });
  for (const member of group.members) {
    await prisma.notification.create({
      data: {
        type: 'GROUP_UPDATE',
        title: group.title,
        content: 'An update has been made to your group.',
        icon: group.canvas.toString(),
        user: { connect: { id: member.userId } },
        userReferringTo: { connect: { id: req.user?.id } },
      },
    });
  }
  res.json(group);
};

export const sendGroupMessageHelper = async (
  groupId: string,
  senderId: string,
  content: string
) => {
  const chatMessageRef = firestore.collection('groupMessages');
  const senderProfile = await prisma.user.findUnique({
    where: { id: senderId },
    select: {
      firstName: true,
      lastName: true,
      id: true,
    },
  });
  const message = await prisma.message.create({
    data: {
      group: { connect: { id: groupId } },
      sender: { connect: { id: senderId } },
      content,
      likes: 0,
    },
  });
  const oldMembers = await await (
    await chatMessageRef.doc(groupId).get()
  ).data();
  await chatMessageRef.doc(groupId).update({
    members: {
      ...oldMembers?.members,
      [senderProfile?.id || '']: {
        firstName: senderProfile?.firstName,
        lastName: senderProfile?.lastName,
      },
    },
    messages: FieldValue.arrayUnion({
      id: message.id,
      ts: message.sentAt,
      content: message.content,
      senderId: message.userId,
      likes: 0,
    }),
  });

  return message;
};

export const sendMessage: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { sender, content } = req.body;

  const message = await sendGroupMessageHelper(id, sender, content);

  res.json(message);
};

export const deleteMessage: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { messageId } = req.body;
  const chatMessageRef = firestore.collection('groupMessages');
  const chat = await prisma.message.delete({
    where: {
      id: parseInt(messageId),
    },
  });
  await firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(chatMessageRef.doc(id));
    const messages = doc.data()?.messages;
    const index = messages?.findIndex((msg: any) => msg.id === messageId);
    if (index !== undefined) {
      messages.splice(index, 1);
    }
    transaction.update(chatMessageRef.doc(id), {
      messages,
    });
  });
  res.json(chat);
};

export const requestToAddMember: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { userId, status } = req.body;

  const group = await prisma.group.findUniqueOrThrow({
    where: { id },
    include: {
      members: {
        where: {
          OR: [{ status: 'FACILITATOR' }, { status: 'CO_FACILITATOR' }],
        },
      },
    },
  });
  if (group.members.length === 0) throw new Error('Group does not exist!');
  const isOwner = !!group.members.find((m) => m.userId === req.user?.id);
  if (
    !req.isAdmin &&
    (group.public ? !isOwner && status !== 'USER' : !isOwner)
  ) {
    throw new Error('You are not authorized to add members to this group!');
  }

  const senderIsFacilitator = !!group.members.find(
    (u) => u.userId === req.user?.id
  );

  const request = await prisma.request.create({
    data: {
      type:
        (status as GroupMemberStatus) === 'USER'
          ? 'GROUP_INVITATION'
          : 'FACILITATOR_INVITATION',
      from: {
        connect: { id: senderIsFacilitator ? req.user?.id : userId },
      },
      to: {
        connect: {
          id: senderIsFacilitator ? userId : group.members[0]?.userId,
        },
      },
      relatedGroup: { connect: { id } },
    },
  });

  res.json(request);
};

export const removeMember: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { user } = req.stringQuery;
  const group = await prisma.group.findUniqueOrThrow({
    where: { id },
    include: {
      members: {
        include: { user: { include: { listenerProfile: true } } },
      },
    },
  });
  const admin = group.members.find(({ status }) => status === 'FACILITATOR');
  const member = group.members.find((m) => m.userId === user);
  if (!member) throw new Error('User is not a member of this group!');
  const isAdmin = admin?.userId === req.user?.id;
  const cleanData = async () => {
    await prisma.request.deleteMany({
      where: {
        fromId: user,
        relatedGroupId: id,
      },
    });
    await prisma.request.deleteMany({
      where: {
        toId: user,
        relatedGroupId: id,
      },
    });
    await prisma.groupEnrollment.deleteMany({
      where: {
        id: member?.id,
      },
    });
  };
  //admin permission
  if (isAdmin) {
    //If this is the last member, delete the group
    if (group.members.length === 1) {
      const chatMessageRef = firestore.collection('groupMessages');
      await chatMessageRef.doc(id as string).delete();
      await cleanData();
      await prisma.group.delete({ where: { id: id as string } });
      return res.send('Success');
    }
    //If this is the last admin, transfer ownership to another member
    const newFacilitators = group.members.filter(
      ({ status, userId }) => status !== 'USER' && userId !== user
    );
    if (newFacilitators.length === 0) {
      throw new Error(
        'As the group creator, please either have a co-facilitator or be the only member when leaving the group.'
      );
    } else {
      await cleanData();
      await prisma.groupEnrollment.update({
        where: {
          id: newFacilitators[0].id,
        },
        data: {
          status: 'FACILITATOR',
        },
      });
      const newFacilitator = await prisma.user.findUnique({
        where: { id: newFacilitators[0].userId },
        include: {
          programs: true,
        },
      });
      if (
        !newFacilitator?.programs?.find(
          (program) =>
            program.type === 'FACILITATOR' && program.status === 'ACCEPTED'
        )
      ) {
        await prisma.group.update({
          where: { id },
          data: {
            public: false,
          },
        });
      }
      return res.send('Success');
    }
  }
  //user permission
  else if (req.user?.id === user) {
    await cleanData();
    return res.send('Success');
  }
  //decline
  else {
    throw new Error(
      'You are not authorized to remove members from this group!'
    );
  }
};

export const fetchGroups: RequestHandler = async (req, res) => {
  const { searchQuery = '' } = req.stringQuery;
  const { public: isPublic } = convertTrueStringsInObjectToBoolean(
    req.stringQuery
  );
  res.json(
    censor(
      await paginate(req.stringQuery, 'group', {
        where: {
          title: {
            contains: searchQuery,
            mode: 'insensitive',
          },
          public: req.isAdmin ? isPublic || false : true,
        } as Prisma.GroupWhereInput,
        include: {
          members: {
            include: {
              user: { select: publicUserSelect },
            },
          },
        } as Prisma.GroupInclude,
      })
    )
  );
};

export const fetchGroupsByUser: RequestHandler = async (req, res) => {
  const { id } = req.params;
  res.json(
    await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: publicUserSelect },
          },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    })
  );
};

export const fetchMessages: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { skip = 0, pageSize = PAGE_SIZE } = req.stringQuery;
  const data = await prisma.message.findMany({
    where: { groupId: id },
    skip: +skip,
    take: +pageSize,
    include: {
      sender: { select: publicUserSelect },
      group: {
        select: {
          members: true,
        },
      },
    },
    orderBy: {
      sentAt: 'asc',
    },
  });

  if (data.length === 0) {
    res.json([]);
    return;
  }

  // if (
  //   !req.isAdmin &&
  //   data[0].group?.members.find(({ userId }) => userId === req.user?.id)
  // ) {
  //   throw new Error('You are not a member of this group!');
  // }
  res.json(data);
};

export const fetchGroup: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: publicUserSelect },
        },
      },
      messages: {
        include: {
          sender: { select: publicUserSelect },
        },
        take: 20,
      },
    },
  });

  if (!group) throw new Error('Group dose not exist!');

  if (
    !req.isAdmin &&
    group?.members.find(({ user }) => user.email === req.user?.id)
  ) {
    throw new Error('You are not a member of this group!');
  }
  res.json(censor(group));
};

export const fetchGroupsByCategory: RequestHandler = async (req, res) => {
  const { category } = req.params;
  const { public: isPublic } = convertTrueStringsInObjectToBoolean(
    req.stringQuery
  );
  res.json(
    censor(
      await paginate(req.stringQuery, 'group', {
        where: {
          topic: category,
          public: req.isAdmin ? isPublic || false : true,
        } as Prisma.GroupWhereInput,
        include: {
          members: {
            include: {
              user: { select: publicUserSelect },
            },
          },
        } as Prisma.GroupInclude,
      })
    )
  );
};

export const emailGroupMemberInvite: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { email, requesterId } = req.body;

  // check if email is already a user
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (user) {
    throw new Error('This email is already associated with an account!');
  }

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
  });

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: publicUserSelect },
        },
      },
    },
  });

  // TODO: add user to firebase and store db

  const mailResult = await mailer.sendMultiple({
    to: email.split(','),
    from: 'noreply@veor.org',
    templateId: emailInviteTemplate.group,
    dynamicTemplateData: {
      group: {
        name: group?.title,
        id: group?.id,
      },
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

export const emailGroupCofacilitatorInvite: RequestHandler = async (
  req,
  res
) => {
  const { id } = req.params;
  const { email, requesterId } = req.body;

  // check if email is already a user
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (user) {
    throw new Error('This email is already associated with an account!');
  }

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
  });

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: publicUserSelect },
        },
      },
    },
  });

  // TODO: add user to firebase and store db

  const mailResult = await mailer.sendMultiple({
    to: email.split(',') as string[],
    from: 'noreply@veor.org',
    templateId: emailInviteTemplate.cof,
    dynamicTemplateData: {
      group: {
        name: group?.title,
        id: group?.id,
      },
      user: {
        name: requester?.firstName,
        id: requester?.id,
      },
    },
  });

  res.json({
    mailResult,
  });
};

export const searchGroups: RequestHandler = async (req, res) => {
  const { searchQuery = '' } = req.stringQuery;
  const { public: isPublic } = convertTrueStringsInObjectToBoolean(
    req.stringQuery
  );
  res.json(
    censor(
      await paginate(req.stringQuery, 'group', {
        where: {
          public: req.isAdmin ? isPublic || false : true,
          OR: [
            {
              title: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
          ],
        } as Prisma.GroupWhereInput,
        include: {
          members: {
            include: {
              user: { select: publicUserSelect },
            },
          },
          messages: true,
        } as Prisma.GroupInclude,
      })
    )
  );
};

export const fetchPublicGroups: RequestHandler = async (req, res) => {
  const data = await prisma.group.findMany({
    where: { public: true },
    include: {
      members: {
        include: {
          user: { select: publicUserSelect },
        },
      },
      messages: true,
    },
  });

  if (data.length === 0) {
    res.json([]);
    return;
  }

  res.json(data);
};

export const revokeCoFacilitator: RequestHandler = async (req, res) => {
  const { userId, groupId } = req.body;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: { select: publicUserSelect },
        },
      },
    },
  });
  if (!group) throw new Error('Group does not exist!');
  const admin = group.members.find(({ status }) => status === 'FACILITATOR');
  const isAdmin = admin?.userId === req.user?.id;
  if (!req.isAdmin && !isAdmin) {
    throw new Error('You are not authorized to revoke this co-facilitator!');
  }
  const _user = group.members.find((m) => m.userId === userId);
  await prisma.request.deleteMany({
    where: {
      toId: userId,
      relatedGroupId: groupId,
      type: 'FACILITATOR_INVITATION',
    },
  });
  await prisma.groupEnrollment.update({
    where: {
      id: _user?.id,
    },
    data: {
      status: 'USER',
    },
  });
  res.send('Success');
};

export const fetchAddMemberList: RequestHandler = async (req, res) => {
  const { groupId, userId } = req.params;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: true,
    },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      supports: {
        include: {
          requestsReceived: true,
          requestsSent: true,
        },
      },
    },
  });
  if (!group) throw new Error('Group does not exist!');
  const memberList = [];
  if (user?.supports) {
    for (const s of user?.supports) {
      const requestReceived = s.requestsReceived.filter(
        (r) =>
          r.relatedGroupId === groupId &&
          (r.status === 'ACCEPTED' || r.status === 'PENDING') &&
          r.type === 'GROUP_INVITATION'
      );
      const requestSent = s.requestsSent.filter(
        (r) =>
          r.relatedGroupId === groupId &&
          (r.status === 'ACCEPTED' || r.status === 'PENDING') &&
          r.type === 'GROUP_INVITATION'
      );

      if (
        !group.members.find((m) => m.userId === s.id) &&
        requestReceived.length === 0 &&
        requestSent.length === 0
      ) {
        memberList.push(s);
      }
    }
  }
  res.json(memberList);
};

export const fetchAddCoFacilitatorList: RequestHandler = async (req, res) => {
  const { groupId } = req.params;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            include: {
              requestsReceived: true,
              requestsSent: true,
            },
          },
        },
      },
    },
  });
  const _memberList = [];
  if (!group) throw new Error('Group does not exist!');
  for (const m of group.members) {
    const requestReceived = m.user.requestsReceived.filter(
      (r) =>
        r.relatedGroupId === groupId &&
        (r.status === 'ACCEPTED' || r.status === 'PENDING') &&
        r.type === 'FACILITATOR_INVITATION'
    );
    const requestSent = m.user.requestsSent.filter(
      (r) =>
        r.relatedGroupId === groupId &&
        (r.status === 'ACCEPTED' || r.status === 'PENDING') &&
        r.type === 'FACILITATOR_INVITATION'
    );
    if (
      m.status === 'USER' &&
      requestReceived.length === 0 &&
      requestSent.length === 0
    ) {
      _memberList.push(m);
    }
  }
  res.json(_memberList);
};
