// Path: src/stripe/stripe.controller.ts

import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AccessTokenGuard } from '../auth/guards/index';
import { StripeService } from './stripe.service';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';


@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @ApiOperation({ summary: 'Создание сессии для оплаты подписки' })
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Post('create-checkout-session')
  createCheckoutSession(@Req() req: Request) {
    const userId = req.user!.sub;
    const email = req.user!.email;
    return this.stripeService.createCheckoutSession(userId, email);
  }

  @ApiExcludeEndpoint() // Скрываем этот эндпоинт из документации, так как он для Stripe
  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    await this.stripeService.handleWebhook(req);
    res.status(200).send();
  }
}