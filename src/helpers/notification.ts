import { prisma } from '..';
import { expo } from '../';
import { Expo } from 'expo-server-sdk';

export const sendUserDeviceNotification = async (
  userId: string,
  message: string,
  data?: any,
) => {
  try {
    const userResult = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        pushNotificationTokens: true,
      },
    });
    if (userResult == null) {
      return;
    }
    if (userResult.pushNotificationTokens == null) {
      console.warn(`User ${userId} does not have a push notification token`);
      return;
    }
    if (userResult.pushNotificationTokens.length === 0) {
      console.warn(`User ${userId} does not have a push notification token`);
      return;
    }
    if (!Expo.isExpoPushToken(userResult.pushNotificationTokens)) {
      console.error(
        `Push token ${userResult.pushNotificationTokens} is not a valid Expo push token`,
      );
      return;
    }
    expo.sendPushNotificationsAsync([
      {
        to: userResult.pushNotificationTokens,
        sound: 'default',
        body: message,
        data,
      },
    ]);
  } catch (e) {
    console.error(e);
  }
};

export const sendChatNotificationToOther = async (
  chatId: string,
  currentUserId: string | undefined,
  notificationText?: string,
  type?: string,
) => {
  // send notification to other user
  const chatDetail = await prisma.chat.findUnique({
    where: {
      id: chatId,
    },
    select: {
      users: {
        select: {
          id: true,
          notificationSetting: true,
        },
      },
    },
  });
  if (chatDetail === null) {
    return;
  }

  if (chatDetail.users === null) {
    return;
  }
  if (chatDetail.users.length < 2) {
    return;
  }
  if (
    chatDetail.users[0].notificationSetting?.newMessages === false ||
    chatDetail.users[1].notificationSetting?.newMessages === false
  ) {
    return;
  }
  const otherUserId =
    chatDetail.users[0].id === currentUserId
      ? chatDetail.users[1].id
      : chatDetail.users[0].id;
  sendUserDeviceNotification(
    otherUserId,
    notificationText === undefined
      ? 'You have a new chat message.'
      : notificationText,
    { chatId, type: type === undefined ? 'chat' : type },
  );
};
