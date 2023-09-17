const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Ahmed Salah <${process.env.EMAIL_FROM}`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'Brevo',
        host: process.env.SENDINBLUE_HOST,
        port: process.env.SENDINBLUE_PORT,
        auth: {
          user: process.env.SENDINBLUE_LOGIN,
          pass: process.env.SENDINBLUE_PASSWORD
        }
      });
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      },
      secure: false
    });
  }

  //Send the actual email
  async send(template, subject) {
    //1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject
    });
    //2) Define Email Options

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html)
    };
    //3) create a transport then send

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('Welcome', 'Welcome to Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 mins)'
    );
  }
};
// const sendEmail = async options => {
//1) Create a Transporter
// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: process.env.EMAIL_PORT,
//   auth: {
//     user: process.env.EMAIL_USERNAME,
//     pass: process.env.EMAIL_PASSWORD
//   },
//   secure: false
// logger: true,
// tls: { rejectUnauthorized: true }
// });
//   //2) Define the email option
//   const mailOptions = {
//     from: 'Ahmed Salah <hello@salah.io>',
//     to: options.email,
//     subject: options.subject,
//     text: options.message
//   };
//   //3) Actually send the email
//   await transporter.sendMail(mailOptions);
// };
// module.exports = sendEmail;
