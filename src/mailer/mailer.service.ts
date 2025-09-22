// Path: src/mailer/mailer.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.get<string>('MAIL_USER'),
        pass: this.config.get<string>('MAIL_PASSWORD'),
      },
      // Для отладки
      // logger: true, 
      // debug: true,
    });
  }

  async sendConfirmationEmail(email: string, token: string) {
    const url = `${this.config.get<string>('BACKEND_URL')}/auth/confirm?token=${token}`;
    
    this.logger.log(`Попытка отправки письма на: ${email}`);
    
    await this.transporter.sendMail({
      from: `"${this.config.get<string>('MAIL_FROM')}" <${this.config.get<string>('MAIL_USER')}>`,
      to: email,
      subject: 'Подтвердите ваш Email для DialX',
      html: `
        <p>Привет!</p>
        <p>Пожалуйста, нажмите на ссылку ниже, чтобы подтвердить ваш email:</p>
        <a href="${url}">${url}</a>
        <p>Если вы не регистрировались, просто проигнорируйте это письмо.</p>
      `,
    });

    this.logger.log(`Письмо успешно отправлено на: ${email}`);
  }
}