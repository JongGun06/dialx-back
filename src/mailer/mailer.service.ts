import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
// Импорт типа MailgunMessageData больше не нужен

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private mg;
  private domain: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('MAILGUN_API_KEY');
    //@ts-ignore
    this.domain = this.config.get<string>('MAILGUN_DOMAIN');

    if (!apiKey || !this.domain) {
      this.logger.warn('MAILGUN_API_KEY или MAILGUN_DOMAIN не настроены. Почта не будет отправляться.');
    } else {
      const mailgun = new Mailgun(formData);
      this.mg = mailgun.client({ username: 'api', key: apiKey });
      this.logger.log('MailerService успешно инициализирован с Mailgun.');
    }
  }

  async sendConfirmationEmail(email: string, token: string) {
    if (!this.mg) {
      this.logger.error('Попытка отправить письмо без настроенного Mailgun клиента.');
      return;
    }
    
    const url = `${this.config.get<string>('BACKEND_URL')}/auth/confirm?token=${token}`;
    
    // v-- УБИРАЕМ УКАЗАНИЕ ТИПА --v
    const messageData = {
    // ^-- ТЕПЕРЬ БЕЗ :MailgunMessageData --^
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
      const response = await this.mg.messages.create(this.domain, messageData);
      this.logger.log(`Письмо успешно отправлено, ID: ${response.id}`);
    } catch (error) {
      this.logger.error('Ошибка при отправке письма через Mailgun', error);
      throw error;
    }
  }
}