import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { AuthRequest, requireAuth } from './middleware.js';

const router = Router();

export default function subscriptionRoutes(prisma: any) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

  const PRICE_ID = process.env.STRIPE_PRICE_ID || '';

  // ─── Create Checkout Session ──────────────────────────────────
  router.post('/create-checkout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Create or retrieve Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: { userId: String(user.id) },
        });
        customerId = customer.id;
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{ price: PRICE_ID, quantity: 1 }],
        success_url: `${req.headers.origin || 'http://localhost:8080'}/?subscription=success`,
        cancel_url: `${req.headers.origin || 'http://localhost:8080'}/?subscription=canceled`,
        metadata: { userId: String(user.id) },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Checkout error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // ─── Stripe Webhook ───────────────────────────────────────────
  router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    let event: Stripe.Event;

    try {
      // req.body should be raw buffer for webhook verification
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).json({ error: 'Webhook signature verification failed' });
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          if (userId) {
            await prisma.user.update({
              where: { id: parseInt(userId) },
              data: { subscriptionStatus: 'active' },
            });
            console.log(`✅ Subscription activated for user ${userId}`);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          if (customer && !customer.deleted) {
            const user = await prisma.user.findUnique({
              where: { stripeCustomerId: customer.id },
            });
            if (user) {
              const status = subscription.status === 'active' ? 'active' :
                             subscription.status === 'past_due' ? 'past_due' : 'canceled';
              await prisma.user.update({
                where: { id: user.id },
                data: { subscriptionStatus: status },
              });
              console.log(`📝 Subscription ${status} for user ${user.id}`);
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          if (customer && !customer.deleted) {
            const user = await prisma.user.findUnique({
              where: { stripeCustomerId: customer.id },
            });
            if (user) {
              await prisma.user.update({
                where: { id: user.id },
                data: { subscriptionStatus: 'canceled' },
              });
              console.log(`❌ Subscription canceled for user ${user.id}`);
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          const user = await prisma.user.findUnique({
            where: { stripeCustomerId: customerId },
          });
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: { subscriptionStatus: 'past_due' },
            });
            console.log(`⚠️ Payment failed for user ${user.id}`);
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // ─── Get Subscription Status ──────────────────────────────────
  router.get('/status', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { subscriptionStatus: true, stripeCustomerId: true },
      });
      res.json({
        status: user?.subscriptionStatus || 'free',
        hasStripeAccount: !!user?.stripeCustomerId,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check subscription' });
    }
  });

  // ─── Customer Portal ──────────────────────────────────────────
  router.post('/portal', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user?.stripeCustomerId) {
        res.status(400).json({ error: 'No subscription found' });
        return;
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.headers.origin || 'http://localhost:8080'}/`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Portal error:', error);
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  });

  return router;
}
