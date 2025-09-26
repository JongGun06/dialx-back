import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as FormData from 'form-data'; // <-- ИСПРАВЛЕНИЕ №1: Правильный импорт
import Mailgun from 'mailgun.js';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private mg;
  private domain: string | undefined; // <-- ИСПРАВЛЕНИЕ №2: Тип может быть undefined

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('MAILGUN_API_KEY');
    this.domain = this.config.get<string>('MAILGUN_DOMAIN');

    if (!apiKey || !this.domain) {
      this.logger.warn('MAILGUN_API_KEY или MAILGUN_DOMAIN не настроены. Почта не будет отправляться.');
    } else {
      const mailgun = new Mailgun(FormData); // <-- ИСПРАВЛЕНИЕ №1: Передаем конструктор
      this.mg = mailgun.client({ username: 'api', key: apiKey });
      this.logger.log('MailerService успешно инициализирован с Mailgun.');
    }
  }

  async sendConfirmationEmail(email: string, token: string) {
    if (!this.mg || !this.domain) {
      this.logger.error('Попытка отправить письмо без настроенного Mailgun клиента.');
      return;
    }
    
    const url = `${this.config.get<string>('BACKEND_URL')}/auth/confirm?token=${token}`;
    
    // ИСПРАВЛЕНИЕ №3: Убираем явное указание типа
    const messageData = {
      from: `DialX <noreply@${this.domain}>`,
      to: email,
      subject: 'Подтвердите ваш Email для DialX',
      html: `
        <p>Привет!</p>
        <p>Пожалуйста, нажмите на ссылку ниже, чтобы подтвердить ваш email:</p>
        <a href="${url}">${url}</a>
        <p>Если вы не регистрировались, просто проигнорируйте это письмо.</p>
      `,
    };

    try {
      this.logger.log(`Попытка отправки письма на: ${email} через Mailgun`);
      // @ts-ignore - Временное решение для возможного несоответствия типов в библиотеке
      const response = await this.mg.messages.create(this.domain, messageData);
      this.logger.log(`Письмо успешно отправлено, ID: ${response.id}`);
    } catch (error) {
      this.logger.error('Ошибка при отправке письма через Mailgun', error);
      throw error;
    }
  }
}