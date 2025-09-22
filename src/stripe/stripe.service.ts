// Path: src/stripe/stripe.service.ts

import { Injectable, Logger, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
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
    // --- ВОТ ИСПРАВЛЕНИЕ ---
    this.stripe = new Stripe(stripeApiKey, { apiVersion: '2025-08-27.basil' });
  }

  async createCheckoutSession(userId: string, email: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({ email });
      stripeCustomerId = customer.id;
      await this.prisma.user.update({ where: { id: userId }, data: { stripeCustomerId } });
    }
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: 'price_1S8mhKFPImmQ5eLoCyD1YVGy', quantity: 1 }],
      success_url: `${this.configService.get('CLIENT_URL')}/payment-success`,
      cancel_url: `${this.configService.get('CLIENT_URL')}/payment-canceled`,
      metadata: { userId },
    });
    return { url: session.url };
  }

  async handleWebhook(req: Request) {
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new InternalServerErrorException('Stripe Webhook Secret не настроен');
    }
    let event: Stripe.Event;
    try {
      const rawBody = (req as any).rawBody;
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const subscriptionId = session.subscription as string;
      if (!userId || !subscriptionId) {
        this.logger.error('Webhook получен без userId или subscriptionId');
        return;
      }
      this.logger.log(`✅ Успешная оплата от пользователя: ${userId}`);
      await this.prisma.user.update({
        where: { id: userId },
        data: { subscriptionId, subscriptionStatus: 'ACTIVE' },
      });
    }
  }
}