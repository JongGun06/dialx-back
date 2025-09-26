import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const stripeApiKey = this.configService.get<string>('STRIPE_API_KEY');
    if (!stripeApiKey) {
      throw new InternalServerErrorException('Stripe API Key не настроен');
    }
    this.stripe = new Stripe(stripeApiKey, {
      apiVersion: '2025-08-27.basil',
    });
    this.logger.log('✅ StripeService инициализирован');
  }

  /**
   * Создание checkout-сессии для подписки
   */
  async createCheckoutSession(userId: string, email: string) {
    this.logger.log(`➡️ Создание checkout-сессии для userId=${userId}, email=${email}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.error(`❌ Пользователь ${userId} не найден`);
      throw new NotFoundException('Пользователь не найден');
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      this.logger.log(`ℹ️ У пользователя ${userId} нет stripeCustomerId, создаём нового customer`);
      const customer = await this.stripe.customers.create({ email });
      stripeCustomerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
      this.logger.log(`✅ Создан Stripe customer ${stripeCustomerId} для userId=${userId}`);
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        { price: 'price_1S8mhKFPImmQ5eLoCyD1YVGy', quantity: 1 },
      ],
      success_url: `dialx://payment-success`,
      cancel_url: `dialx://payment-canceled`,
      metadata: { userId },
    });

    this.logger.log(`✅ Checkout-сессия создана: ${session.id}, url=${session.url}`);
    return { url: session.url };
  }

  /**
   * Обработка webhook от Stripe
   */
  async handleWebhook(req: Request) {
    this.logger.log('➡️ Получен webhook от Stripe');
    this.logger.debug(`Headers: ${JSON.stringify(req.headers)}`);

    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.error('❌ Stripe Webhook Secret не настроен');
      throw new InternalServerErrorException('Stripe Webhook Secret не настроен');
    }

    let event: Stripe.Event;
    try {
      const rawBody = (req as any).rawBody;
      this.logger.debug(`Raw body: ${rawBody?.toString().slice(0, 500)}...`);
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      this.logger.log(`✅ Событие успешно сконструировано: ${event.id}, type=${event.type}`);
    } catch (err) {
      this.logger.error(`❌ Ошибка валидации webhook: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        this.logger.log('➡️ Обработка checkout.session.completed');
        const session = event.data.object as Stripe.Checkout.Session;
        this.logger.debug(`Session payload: ${JSON.stringify(session, null, 2)}`);

        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription as string;

        if (!userId || !subscriptionId) {
          this.logger.error('❌ Webhook без userId или subscriptionId');
          return;
        }

        this.logger.log(`✅ Подписка активирована для userId=${userId}, subscriptionId=${subscriptionId}`);

        const updated = await this.prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionId,
            subscriptionStatus: 'ACTIVE',
          },
        });

        this.logger.debug(`DB update result: ${JSON.stringify(updated, null, 2)}`);
        break;
      }

      case 'customer.subscription.deleted': {
        this.logger.log('➡️ Обработка customer.subscription.deleted');
        const subscription = event.data.object as Stripe.Subscription;
        this.logger.debug(`Subscription payload: ${JSON.stringify(subscription, null, 2)}`);

        const subscriptionId = subscription.id;

        const result = await this.prisma.user.updateMany({
          where: { subscriptionId },
          data: { subscriptionStatus: 'CANCELED' },
        });

        this.logger.log(`✅ Подписка ${subscriptionId} отменена, обновлено пользователей: ${result.count}`);
        break;
      }

      default:
        this.logger.warn(`⚠️ Необработанный тип события: ${event.type}`);
        this.logger.debug(`Payload: ${JSON.stringify(event.data.object, null, 2)}`);
    }
  }
}
