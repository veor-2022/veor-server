import { compareSync, hashSync } from 'bcryptjs';
import { RequestHandler } from 'express';
import { prisma } from '..';
import { signUser } from '../helpers/jwt';
import { UserAuthHeader } from '../types';
import admin from 'firebase-admin';
import nanoid from 'nanoid';
import { sendEmail } from '../helpers/nodemailer';

export const sendValidateEmail = async (
  email: string,
  name: string,
  emailVerifyLink: string
) => {
  return await sendEmail({
    to: email as string,
    subject: 'Welcome to Veor, Please verify your email',
    html: `<p>Hi ${name},</p>
    <p>Thank you for signing up for Veor! Please verify your email by clicking the link below.</p>
    <a href="${emailVerifyLink}">Verify Email</a>
    <p>Or copy and paste the link below into your browser.</p>
    <pre>${emailVerifyLink}</pre>
    <p>Thanks,</p>
    <p>The Veor Team</p>`,
  });
};

export const signUpWithFirebaseToken: RequestHandler = async (req, res) => {
  const { token } = req.body;
  let { firstName, lastName } = req.body;
  const decodedToken = await admin.auth().verifyIdToken(token);
  const { email, name, picture } = decodedToken;
  if (firstName && lastName) {
  } else {
    const nameArray = name.split(' ');
    firstName = nameArray[0];
    lastName = nameArray[1];
  }

  if (decodedToken.firebase.sign_in_provider !== 'password') {
    await admin.auth().updateUser(decodedToken.uid, {
      emailVerified: true,
    });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser?.password) throw new Error('User already exists!');

  const user = await prisma.user.upsert({
    where: { email: (email as string).toLowerCase() },
    create: {
      email: (email as string).toLowerCase(),
      firstName,
      lastName,
      profilePicture: picture,
      password: '',
      firebaseUID: decodedToken.uid,
    },
    update: {
      firstName,
      lastName,
      profilePicture: picture,
      password: hashSync(nanoid.nanoid()),
    },
  });

  const emailVerifyLink = await admin
    .auth()
    .generateEmailVerificationLink(email as string);

  await sendValidateEmail(email as string, name, emailVerifyLink);

  res.send(
    signUser({
      id: user.id,
    } as UserAuthHeader)
  );
};

export const logInWithFirebaseToken: RequestHandler = async (req, res) => {
  const { token } = req.body;
  const decodedToken = await admin.auth().verifyIdToken(token);

  const { email, uid } = decodedToken;
  const user = await prisma.user.findFirst({
    where: { firebaseUID: uid },
  });
  if (!user) {
    throw new Error('User not found!');
  }
  res.send(
    signUser({
      id: user?.id,
    } as UserAuthHeader)
  );
};

export const signUp: RequestHandler = async (req, res) => {
  const {
    email,
    firstName,
    lastName,
    nickname,
    profilePicture,
    receiveNewsletter,
    languages,
    notificationTypes,
  } = req.body;

  const password = hashSync(req.body.password);

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser?.password) throw new Error('User already exists!');

  const firebaseResult = await admin.auth().createUser({
    email: (email as string).toLowerCase(),
    password: req.body.password,
    displayName: `${firstName} ${lastName}`,
  });

  const user = await prisma.user.upsert({
    where: { email: (email as string).toLowerCase() },
    create: {
      email: (email as string).toLowerCase(),
      firstName,
      lastName,
      nickname,
      profilePicture,
      receiveNewsletter,
      languages,
      notificationTypes,
      password,
      firebaseUID: firebaseResult.uid,
    },
    update: {
      firstName,
      lastName,
      nickname,
      profilePicture,
      receiveNewsletter,
      languages,
      notificationTypes,
      password,
    },
  });
  const emailVerifyLink = await admin
    .auth()
    .generateEmailVerificationLink(email as string);

  await sendValidateEmail(email as string, firstName, emailVerifyLink);
  res.send(
    signUser({
      id: user.id,
    } as UserAuthHeader)
  );
};

export const logIn: RequestHandler = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: (email as string).toLowerCase() },
  });
  if (compareSync(password, user.password)) {
    res.send(
      signUser({
        id: user.id,
      } as UserAuthHeader)
    );
  } else {
    throw new Error('Incorrect password, please try again!');
  }
};

export const checkIfUserExists: RequestHandler = async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    res.send({ exists: true });
  } else {
    res.send({ exists: false });
  }
};
