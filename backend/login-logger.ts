import { Request } from 'express';
import nodemailer from 'nodemailer';

// ─── User-Agent Parsing (lightweight, no external dependency) ──
function parseUserAgent(ua: string) {
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  // Browser detection
  if (ua.includes('Edg/')) {
    const ver = ua.match(/Edg\/([\d.]+)/);
    browser = `Edge ${ver?.[1]?.split('.')[0] || ''}`.trim();
  } else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) {
    const ver = ua.match(/Chrome\/([\d.]+)/);
    browser = `Chrome ${ver?.[1]?.split('.')[0] || ''}`.trim();
  } else if (ua.includes('Firefox/')) {
    const ver = ua.match(/Firefox\/([\d.]+)/);
    browser = `Firefox ${ver?.[1]?.split('.')[0] || ''}`.trim();
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    const ver = ua.match(/Version\/([\d.]+)/);
    browser = `Safari ${ver?.[1]?.split('.')[0] || ''}`.trim();
  } else if (ua.includes('Opera') || ua.includes('OPR/')) {
    const ver = ua.match(/(?:Opera|OPR)\/([\d.]+)/);
    browser = `Opera ${ver?.[1]?.split('.')[0] || ''}`.trim();
  }

  // OS detection
  if (ua.includes('Windows NT 10.0')) {
    os = ua.includes('Windows NT 10.0; Win64') ? 'Windows 10/11' : 'Windows 10';
  } else if (ua.includes('Windows NT')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS X')) {
    const ver = ua.match(/Mac OS X ([\d_]+)/);
    os = `macOS ${ver?.[1]?.replace(/_/g, '.') || ''}`.trim();
  } else if (ua.includes('Android')) {
    const ver = ua.match(/Android ([\d.]+)/);
    os = `Android ${ver?.[1] || ''}`.trim();
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    const ver = ua.match(/OS ([\d_]+)/);
    os = `iOS ${ver?.[1]?.replace(/_/g, '.') || ''}`.trim();
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  }

  // Device type detection
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    device = 'Mobile';
  } else if (ua.includes('iPad') || ua.includes('Tablet')) {
    device = 'Tablet';
  }

  return { browser, os, device };
}

// ─── Get Client IP from Request ────────────────────────────────
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
    return ip;
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// ─── IP Geolocation (free ip-api.com — 45 req/min) ─────────────
async function getLocationFromIp(ip: string): Promise<string | null> {
  // Skip local/private IPs
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::ffff:127.0.0.1') {
    return 'Local Network';
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=city,country,status`, {
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    const data = await response.json();
    if (data.status === 'success' && data.city) {
      return `${data.city}, ${data.country}`;
    }
  } catch {
    // Geolocation failed — not critical, continue without it
  }
  return null;
}

// ─── Send Login Alert Email ────────────────────────────────────
async function sendLoginAlertEmail(
  toEmail: string,
  userName: string,
  loginInfo: { ip: string; location: string | null; device: string; browser: string; os: string; loginMethod: string; time: Date }
) {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Login alert email skipped — SMTP not configured in .env');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const timeStr = loginInfo.time.toLocaleString('en-BD', {
      timeZone: 'Asia/Dhaka',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const methodLabel = loginInfo.loginMethod === 'google' ? 'Google Sign-In' :
                        loginInfo.loginMethod === 'register' ? 'New Registration' : 'Email & Password';

    await transporter.sendMail({
      from: `"TakaTrack Security" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `🔐 New login to your TakaTrack account`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 28px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">🔐 Login Alert</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">TakaTrack Security Notification</p>
          </div>

          <div style="padding: 28px 24px; color: #e2e8f0;">
            <p style="margin: 0 0 18px; font-size: 15px;">
              Hi <strong>${userName}</strong>,<br/>
              We detected a new sign-in to your TakaTrack account.
            </p>

            <div style="background: #1e293b; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; width: 100px;">Method</td>
                  <td style="padding: 6px 0; color: #f1f5f9; font-weight: 600;">${methodLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Device</td>
                  <td style="padding: 6px 0; color: #f1f5f9;">${loginInfo.device} • ${loginInfo.os}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Browser</td>
                  <td style="padding: 6px 0; color: #f1f5f9;">${loginInfo.browser}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">IP Address</td>
                  <td style="padding: 6px 0; color: #f1f5f9;">${loginInfo.ip}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Location</td>
                  <td style="padding: 6px 0; color: #f1f5f9;">${loginInfo.location || 'Unknown'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Time</td>
                  <td style="padding: 6px 0; color: #f1f5f9;">${timeStr} (BST)</td>
                </tr>
              </table>
            </div>

            <div style="background: #7c2d12; border: 1px solid #9a3412; border-radius: 10px; padding: 14px 16px; font-size: 13px; color: #fdba74;">
              ⚠️ <strong>This wasn't you?</strong> Change your password immediately and contact support.
            </div>
          </div>

          <div style="padding: 16px 24px; background: #0c0f1a; text-align: center; font-size: 12px; color: #475569;">
            © ${new Date().getFullYear()} TakaTrack Finance Manager
          </div>
        </div>
      `,
    });

    console.log(`Login alert email sent to ${toEmail}`);
  } catch (error: any) {
    console.error('Failed to send login alert email:', error?.message || error);
  }
}

// ─── Main: Record Login Activity ───────────────────────────────
export async function recordLoginActivity(
  prisma: any,
  userId: number,
  email: string,
  loginMethod: string,
  req: Request
) {
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';
  const { browser, os, device } = parseUserAgent(ua);
  
  // Get location in background (don't block login response)
  const locationPromise = getLocationFromIp(ip);
  let location: string | null = null;
  
  try {
    location = await locationPromise;

    // Save login log to database
    await prisma.loginLog.create({
      data: {
        userId,
        email,
        ip,
        location,
        device,
        browser,
        os,
        userAgent: ua,
        loginMethod,
      },
    });

    console.log(`Login logged: ${email} from ${device} (${browser}/${os}) at ${ip} [${location || 'unknown'}]`);

    // Send email alert in background (don't block login response)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    sendLoginAlertEmail(email, user?.name || email.split('@')[0], {
      ip,
      location,
      device,
      browser,
      os,
      loginMethod,
      time: new Date(),
    }).catch(() => {}); // Fire-and-forget
  } catch (error: any) {
    // Login logging should never block the login flow
    console.error('Login activity logging failed:', error?.message || error);
  }
  
  return { ip, location, device, browser, os };
}
