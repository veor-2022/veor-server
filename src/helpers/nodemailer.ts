import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_KEY || '');

export interface sendMailOption {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: sendMailOption) => {
  return await sgMail.send({
    from: 'noreply@veor.org',
    ...options,
  });
};

export const mailer = sgMail;
