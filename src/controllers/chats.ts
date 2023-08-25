import { Language, Topic } from '@prisma/client';
import { RequestHandler } from 'express';
import { prisma } from '..';
import { firestore } from '..';
import { FieldValue } from 'firebase-admin/firestore';
import {
  sendChatNotificationToOther,
  sendUserDeviceNotification,
} from '../helpers/notification';
import { PAGE_SIZE } from '../constants';

export const getChatMsgById: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  const { chatId } = req.params;
  const chatMsg = await prisma.message.findFirst({ where: { id, chatId } });
  res.json(chatMsg);
};

export const getChatRoomMsgsById: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  const { skip = 0, pageSize = PAGE_SIZE } = req.stringQuery;
  const chatMsgs = await prisma.message.findMany({
    where: { id },
    skip: +skip,
    take: +pageSize,
  });
  res.json(chatMsgs);
};

export const createOneOnOneChatRequest: RequestHandler = async (req, res) => {
  const userId = req.user?.id;
  const { topic, language } = req.body;
  const chatRequestRef = firestore.collection('chatRequests');
  const chatRequest = await prisma.chatRequest.create({
    data: {
      topic: topic.toUpperCase() as Topic,
      language: language,
      requester: {
        connect: {
          id: userId,
        },
      },
    },
  });
  await chatRequestRef.doc(chatRequest.id).set({
    topic,
    needsListener: true,
  });
  res.json(chatRequest);
};

export const deleteOneOnOneChatRequest: RequestHandler = async (req, res) => {
  const { chatId } = req.params;
  const chatRequestRef = firestore.collection('chatRequests');
  const chatRoom = await prisma.chatRequest.delete({
    where: {
      id: chatId,
    },
  });
  await chatRequestRef.doc(chatId).delete();
  res.json(chatRoom);
};

export const getOneOnOneChatRequest: RequestHandler = async (req, res) => {
  const { topic, skip = 0, pageSize = 10 } = req.stringQuery;
  const chatRoom = await prisma.chatRequest.findMany({
    where: {
      topic: topic !== undefined ? (topic.toUpperCase() as Topic) : undefined,
      chatId: null,
      requesterId: {
        not: req.user?.id,
      },
    },
    skip: +skip,
    take: +pageSize,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      requester: {
        include: {
          blocked: true,
        },
      },
    },
  });
  const user = await prisma.user.findFirst({
    where: {
      id: req.user?.id,
    },
    include: {
      blocked: true,
    },
  });
  if (!user) {
    throw new Error('User not found');
  }
  const _chatRoom = chatRoom.filter(
    (chatRoom: any) =>
      !(
        !!user.blocked.find((u: any) => u.id === chatRoom.requester.id) ||
        !!chatRoom.requester.blocked.find((u: any) => u.id === user.id)
      )
  );
  const ifRequesterIsWaitingForChat = !!_chatRoom.find(
    (chatRoom) =>
      chatRoom.requesterId === req.user?.id && chatRoom.chatId === null
  );

  res.json({ chatRoom: _chatRoom, ifRequesterIsWaitingForChat });
};

export const joinOneOnOneChat: RequestHandler = async (req, res) => {
  const userId = req.user?.id;
  const { chatId } = req.body;

  const chatRequestRef = firestore.collection('chatRequests');
  const chatMessageRef = firestore.collection('chatMessages');

  const chatRequest = await prisma.chatRequest.findFirst({
    where: {
      id: chatId,
    },
  });

  if (!chatRequest) {
    res.status(404).json({ message: 'Chat request not found' });
    return;
  }

  const accepterUser = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      nickname: true,
    },
  });

  // find duplicate chat room with same listener and user id
  const duplicateChatroom = await prisma.chat.findFirst({
    where: {
      AND: [
        {
          users: {
            some: {
              id: chatRequest?.requesterId,
            },
          },
        },
        {
          users: {
            some: {
              id: userId,
            },
          },
        },
      ],
    },
  });

  if (duplicateChatroom) {
    await prisma.chatRequest.deleteMany({
      where: {
        id: {
          not: chatId,
        },
      },
    });
    await prisma.chatRequest.update({
      where: {
        id: chatId,
      },
      data: {
        chat: {
          connect: {
            id: duplicateChatroom.id,
          },
        },
      },
    });
    await prisma.chat.update({
      where: {
        id: duplicateChatroom.id,
      },
      data: {
        topic: chatRequest?.topic,
        language: chatRequest?.language,
        needsListener: false,
      },
    });
    await chatRequestRef.doc(chatRequest.id).update({
      needsListener: false,
    });
    res.json(duplicateChatroom);
    sendUserDeviceNotification(
      chatRequest.requesterId,
      'A supporter joined your chat!'
    );
    return;
  }

  const chatRoom = await prisma.chat.create({
    data: {
      users: {
        connect: [
          {
            id: chatRequest?.requesterId,
          },
          {
            id: userId,
          },
        ],
      },
      topic: chatRequest?.topic,
      language: chatRequest?.language,
      needsListener: false,
    },
  });

  await prisma.chatRequest.update({
    where: {
      id: chatId,
    },
    data: {
      chat: {
        connect: {
          id: chatRoom.id,
        },
      },
    },
  });

  chatRequestRef.doc(chatRequest.id).update({
    needsListener: false,
  });
  chatMessageRef.doc(chatRoom.id).set({
    messages: [],
    listener: {
      id: userId,
      firstName: accepterUser?.firstName,
      lastName: accepterUser?.lastName,
      nickname: accepterUser?.nickname,
    },
  });
  res.json(chatRoom);
  sendUserDeviceNotification(
    chatRequest.requesterId,
    'A supporter joined your chat!'
  );
};

export const createNewChatMessage: RequestHandler = async (req, res) => {
  const userId = req.user?.id;
  const { chatId, content } = req.body;
  const chatMessageRef = firestore.collection('chatMessages');
  const message = await prisma.message.create({
    data: {
      content,
      sender: {
        connect: {
          id: userId,
        },
      },
      chat: {
        connect: {
          id: chatId,
        },
      },
    },
  });
  await chatMessageRef.doc(chatId).update({
    messages: FieldValue.arrayUnion({
      id: message.id,
      ts: message.sentAt,
      content: message.content,
      uid: message.userId,
      // likes: 0,
    }),
  });
  res.json(message);
  sendChatNotificationToOther(chatId, userId);
};

export const deleteChatHistory: RequestHandler = async (req, res) => {
  const { chatId } = req.body;
  const chatRequestRef = firestore.collection('chatRequests');
  const chatMessageRef = firestore.collection('chatMessages');
  await prisma.chatRequest.deleteMany({
    where: {
      chatId,
    },
  });
  await prisma.message.deleteMany({
    where: {
      chatId,
    },
  });

  await chatMessageRef.doc(chatId).update({
    messages: [],
  });

  await prisma.chat.deleteMany({
    where: {
      id: chatId,
    },
  });

  res.json({ message: 'Chat history deleted' });
};

export const cleanChatConversation: RequestHandler = async (req, res) => {
  const { chatId } = req.body;
  const chatRequestRef = firestore.collection('chatRequests');
  const chatMessageRef = firestore.collection('chatMessages');
  await prisma.message.deleteMany({
    where: {
      chatId,
    },
  });

  await chatMessageRef.doc(chatId).update({
    messages: [],
  });

  res.json({ message: 'Chat conversation has been cleaned' });
};

export const unsentChatMessage: RequestHandler = async (req, res) => {
  const { msgId, chatId } = req.body;
  const chatMessageRef = firestore.collection('chatMessages');
  const chat = await prisma.message.delete({
    where: {
      id: msgId,
    },
  });
  await firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(chatMessageRef.doc(chatId));
    const messages = doc.data()?.messages;
    const index = messages?.findIndex((msg: any) => msg.id === msgId);
    if (index !== undefined) {
      messages.splice(index, 1);
    }
    transaction.update(chatMessageRef.doc(chatId), {
      messages,
    });
  });
  res.json(chat);
};

export const likeChatMessage: RequestHandler = async (req, res) => {
  const { msgId, chatId, groupId } = req.body;
  const chatMessageRef = groupId
    ? firestore.collection('groupMessages')
    : firestore.collection('chatMessages');

  const chat = await prisma.message.update({
    where: {
      id: Number(msgId),
    },
    data: {
      likes: {
        increment: 1,
      },
    },
  });
  await firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(chatMessageRef.doc(chatId || groupId));
    const messages = doc.data()?.messages;

    const index = messages?.findIndex(
      (msg: any) => msg.id.toString() === msgId.toString()
    );
    if (index >= 0) {
      messages[index].likes = chat.likes;
    }

    if (messages && index >= 0) {
      transaction.update(chatMessageRef.doc(chatId || groupId), {
        messages,
      });
    }
  });
  res.json(chat);
};

export const unlikeChatMessage: RequestHandler = async (req, res) => {
  const { msgId, chatId, groupId } = req.body;
  const chatMessageRef = groupId
    ? firestore.collection('groupMessages')
    : firestore.collection('chatMessages');
  const chat = await prisma.message.update({
    where: {
      id: Number(msgId),
    },
    data: {
      likes: {
        decrement: 1,
      },
    },
  });
  await firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(chatMessageRef.doc(chatId || groupId));
    const messages = doc.data()?.messages;
    const index = messages?.findIndex(
      (msg: any) => msg.id.toString() === msgId.toString()
    );
    if (index >= 0) {
      messages[index].likes = chat.likes;
    }
    if (messages && index >= 0) {
      transaction.update(chatMessageRef.doc(chatId || groupId), {
        messages,
      });
    }
  });
  res.json(chat);
};

export const closeChatSession: RequestHandler = async (req, res) => {
  const { chatId } = req.body;
  const chatRequestRef = firestore.collection('chatRequests');
  const chatMessageRef = firestore.collection('chatMessages');
  const chat = await prisma.chat.update({
    where: {
      id: chatId,
    },
    data: {
      sessionEnded: true,
    },
  });
  await chatMessageRef.doc(chatId).update({
    sessionEnded: true,
  });
  await chatRequestRef.doc(chatId).update({
    sessionEnded: true,
  });
  res.json(chat);
};

export const getChatInfoById: RequestHandler = async (req, res) => {
  const chat = await prisma.chat.findFirst({
    where: {
      id: req.params.id,
    },
    include: {
      users: {
        include: {
          listenerProfile: true,
        },
      },
    },
  });
  res.json(chat);
};

export const startDirectChat: RequestHandler = async (req, res) => {
  const userId = req.user?.id;
  const { listenerId } = req.body;
  const chatMessageRef = firestore.collection('chatMessages');

  // find duplicate chat room with same listener and user id
  const duplicateChatroom = await prisma.chat.findFirst({
    where: {
      AND: [
        {
          users: {
            some: {
              id: userId,
            },
          },
        },
        {
          users: {
            some: {
              id: listenerId,
            },
          },
        },
      ],
    },
  });

  if (duplicateChatroom) {
    res.json(duplicateChatroom);
    return;
  }

  const listenerProfile = await prisma.user.findFirst({
    where: {
      id: listenerId,
    },
    select: {
      firstName: true,
      lastName: true,
      id: true,
    },
  });
  const chatRoom = await prisma.chat.create({
    data: {
      users: {
        connect: [
          {
            id: userId,
          },
          {
            id: listenerId,
          },
        ],
      },
      language: [Language.ENGLISH],
      topic: Topic.PEER,
      createdAt: new Date(),
    },
  });
  chatMessageRef.doc(chatRoom.id).set({
    messages: [],
    listener: {
      id: listenerId,
      firstName: listenerProfile?.firstName,
      lastName: listenerProfile?.lastName,
    },
  });
  res.json(chatRoom);
};

export const addCurrentChatToSupport: RequestHandler = async (req, res) => {
  const userId = req.user?.id;
  const { supportId } = req.body;
  const supportOf = await prisma.user.update({
    where: {
      id: supportId,
    },
    data: {
      supportsOf: {
        connect: {
          id: userId,
        },
      },
    },
  });
  const support = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      supports: {
        connect: {
          id: supportId,
        },
      },
    },
  });
  res.json({
    supportOf,
    support,
  });
};

export const getOneOnOneChatRequestDetail: RequestHandler = async (
  req,
  res
) => {
  const userId = req.user?.id;
  const { chatId } = req.params;
  const chatRequest = await prisma.chatRequest.findFirst({
    where: {
      id: chatId,
    },
    include: {
      chat: {
        include: {
          users: {
            include: {
              listenerProfile: true,
            },
          },
        },
      },
    },
  });
  res.json(chatRequest);
};
