import { Router, Request, Response } from 'express';
import SSLCommerzPayment from 'sslcommerz-lts';
import { AuthRequest, requireAuth } from './middleware.js';

const router = Router();

// Define a type for SSLCommerz data to avoid "any" if possible
interface SSLData {
  total_amount: number;
  currency: string;
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
  shipping_method: string;
  product_name: string;
  product_category: string;
  product_profile: string;
  cus_name: string;
  cus_email: string;
  cus_add1: string;
  cus_city: string;
  cus_postcode: string;
  cus_country: string;
  cus_phone: string;
}

export default function subscriptionRoutes(prisma: any) {
  const store_id = process.env.SSLCOMMERZ_STORE_ID || '';
  const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD || '';
  const is_live = process.env.SSLCOMMERZ_IS_LIVE === 'true';

  // ─── Create Checkout Session ──────────────────────────────────
  router.post('/create-checkout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const tran_id = `TRAN_${Date.now()}_${user.id}`;
      const amount = 299; // Monthly fee in BDT

      const data: SSLData = {
        total_amount: amount,
        currency: 'BDT',
        tran_id: tran_id,
        success_url: `${req.headers.origin || 'http://localhost:8080'}/api/subscription/success?userId=${user.id}`,
        fail_url: `${req.headers.origin || 'http://localhost:8080'}/api/subscription/fail`,
        cancel_url: `${req.headers.origin || 'http://localhost:8080'}/api/subscription/cancel`,
        ipn_url: `${req.headers.origin || 'http://localhost:8080'}/api/subscription/ipn`,
        shipping_method: 'NO',
        product_name: 'TakaTrack Pro',
        product_category: 'SaaS',
        product_profile: 'general',
        cus_name: user.name || 'User',
        cus_email: user.email,
        cus_add1: 'Dhaka',
        cus_city: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01700000000',
      };

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse: any) => {
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.json({ url: GatewayPageURL });
      }).catch((err: any) => {
        console.error('SSLCommerz Init Error:', err);
        res.status(500).json({ error: 'Failed to initialize payment' });
      });
    } catch (error) {
      console.error('Checkout error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // ─── Payment Success ──────────────────────────────────────────
  router.post('/success', async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.query;
    try {
      if (userId) {
        await prisma.user.update({
          where: { id: parseInt(userId as string) },
          data: { subscriptionStatus: 'active' },
        });
      }
      res.redirect('http://localhost:8080/?subscription=success');
    } catch (error) {
      console.error('Success handler error:', error);
      res.redirect('http://localhost:8080/?subscription=failed');
    }
  });

  // ─── Payment Fail/Cancel ──────────────────────────────────────
  router.post('/fail', (req: Request, res: Response) => {
    res.redirect('http://localhost:8080/?subscription=failed');
  });

  router.post('/cancel', (req: Request, res: Response) => {
    res.redirect('http://localhost:8080/?subscription=canceled');
  });

  // ─── IPN (Instant Payment Notification) ──────────────────────
  router.post('/ipn', async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body;
      const tran_id = data.tran_id;
      const status = data.status;

      // In production, you should validate the IPN with SSLCommerz API
      if (status === 'VALID' || status === 'AUTHENTICATED') {
        const userId = tran_id.split('_').pop();
        if (userId) {
          await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { subscriptionStatus: 'active' },
          });
        }
      }
      res.status(200).send('OK');
    } catch (error) {
      console.error('IPN Error:', error);
      res.status(500).send('Error');
    }
  });

  // ─── Get Subscription Status ──────────────────────────────────
  router.get('/status', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { subscriptionStatus: true },
      });
      res.json({
        status: user?.subscriptionStatus || 'free',
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check subscription' });
    }
  });

  return router;
}
