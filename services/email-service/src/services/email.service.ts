import { Email, EmailStatus } from '@prisma/client';
import { logger, RabbitMQClient } from '@ecommerce/shared';
import { prisma } from '../config/database';
import { smtpClient } from '../clients/smtp.client';
import { renderTemplate } from '../templates';
import { env } from '../config/env';

export class EmailService {
  constructor(private rabbitmq?: RabbitMQClient) {}

  async queueEmail(params: {
    to: string | string[];
    subject: string;
    template: string;
    variables: Record<string, any>;
  }): Promise<Email> {
    const html = renderTemplate(params.template, params.variables);

    const email = await prisma.email.create({
      data: {
        to: Array.isArray(params.to) ? params.to : [params.to],
        from: env.SMTP_FROM_EMAIL,
        subject: params.subject,
        template: params.template,
        variables: params.variables,
        html,
        status: EmailStatus.PENDING,
        maxRetries: env.EMAIL_MAX_RETRY,
      },
    });

    logger.info('Email queued', { emailId: email.id, to: params.to });

    // Process immediately (in production, use background worker)
    setTimeout(() => this.processEmail(email.id), 100);

    return email;
  }

  async processEmail(emailId: string): Promise<void> {
    const email = await prisma.email.findUnique({ where: { id: emailId } });
    if (!email || email.status !== EmailStatus.PENDING) return;

    try {
      await prisma.email.update({
        where: { id: emailId },
        data: { status: EmailStatus.SENDING },
      });

      await smtpClient.sendEmail({
        to: email.to,
        subject: email.subject,
        html: email.html!,
        text: email.text,
      });

      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });

      logger.info('Email sent', { emailId });
    } catch (error: any) {
      await this.handleEmailError(emailId, error);
    }
  }

  private async handleEmailError(emailId: string, error: any): Promise<void> {
    const email = await prisma.email.findUnique({ where: { id: emailId } });
    if (!email) return;

    const newRetryCount = email.retryCount + 1;
    const shouldRetry = newRetryCount < email.maxRetries;

    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: shouldRetry ? EmailStatus.PENDING : EmailStatus.FAILED,
        error: error.message,
        retryCount: newRetryCount,
      },
    });

    if (shouldRetry) {
      setTimeout(() => this.processEmail(emailId), env.EMAIL_RETRY_DELAY);
      logger.warn('Email will be retried', { emailId, retryCount: newRetryCount });
    } else {
      logger.error('Email failed permanently', { emailId, error });
    }
  }

  async getEmail(id: string): Promise<Email | null> {
    return await prisma.email.findUnique({ where: { id } });
  }

  async listEmails(params: { skip?: number; take?: number }): Promise<Email[]> {
    return await prisma.email.findMany({
      ...params,
      orderBy: { createdAt: 'desc' },
    });
  }

  async handleEvent(event: any): Promise<void> {
    const { type, data } = event;

    switch (type) {
      case 'user.registered':
        await this.queueEmail({
          to: data.email,
          subject: 'Welcome!',
          template: 'welcome',
          variables: { username: data.username },
        });
        break;

      case 'order.confirmed':
        await this.queueEmail({
          to: data.email,
          subject: 'Order Confirmed',
          template: 'order-confirmation',
          variables: data,
        });
        break;

      case 'payment.succeeded':
        await this.queueEmail({
          to: data.email,
          subject: 'Payment Successful',
          template: 'payment-success',
          variables: data,
        });
        break;

      case 'order.shipped':
        await this.queueEmail({
          to: data.email,
          subject: 'Your Order Has Shipped',
          template: 'shipment-notification',
          variables: data,
        });
        break;

      default:
        logger.debug('Unhandled event type', { type });
    }
  }
}
