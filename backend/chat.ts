import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import multer from 'multer';
import { AuthRequest, requireAuth, requireSubscription } from './middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// ─── Local Pattern Parser (FREE — no API cost) ────────────────
// Handles simple patterns like "150 taka biryani", "৳500 transport", "200 tk shopping"
function tryLocalParse(text: string): { amount: number; category: string; note: string; date: string } | null {
  const today = new Date().toISOString().slice(0, 10);

  // Bangla digit mapping
  const banglaDigits: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  const normalized = text.replace(/[০-৯]/g, (d) => banglaDigits[d] || d);

  // Category keywords (Bangla + English)
  const categoryMap: Record<string, string[]> = {
    'Food': ['food', 'খাবার', 'খাওয়া', 'biryani', 'বিরিয়ানি', 'lunch', 'dinner', 'breakfast', 'দুপুর', 'রাত', 'সকাল', 'চা', 'tea', 'coffee', 'নাস্তা', 'snack', 'restaurant', 'hotel', 'ভাত', 'rice', 'pizza', 'burger'],
    'Transport': ['transport', 'যাতায়াত', 'uber', 'pathao', 'পাঠাও', 'bus', 'বাস', 'cng', 'সিএনজি', 'রিকশা', 'rickshaw', 'taxi', 'ট্যাক্সি', 'fuel', 'তেল', 'petrol', 'গাড়ি', 'car', 'bike'],
    'Shopping': ['shopping', 'শপিং', 'কেনাকাটা', 'buy', 'কিনলাম', 'কেনা', 'clothes', 'কাপড়', 'shoes', 'জুতা', 'phone', 'ফোন', 'gadget'],
    'Bills': ['bill', 'বিল', 'electricity', 'বিদ্যুৎ', 'internet', 'ইন্টারনেট', 'gas', 'গ্যাস', 'rent', 'ভাড়া', 'mobile', 'মোবাইল', 'recharge', 'রিচার্জ', 'water', 'পানি'],
    'Health': ['health', 'স্বাস্থ্য', 'medicine', 'ওষুধ', 'doctor', 'ডাক্তার', 'hospital', 'হাসপাতাল', 'pharmacy', 'ফার্মেসি', 'test', 'টেস্ট'],
    'Entertainment': ['entertainment', 'বিনোদন', 'movie', 'সিনেমা', 'game', 'গেম', 'netflix', 'subscription', 'সাবস্ক্রিপশন', 'tour', 'ভ্রমণ', 'travel'],
  };

  // Try to extract amount — patterns: "150 taka", "৳150", "150 tk", "150টাকা", etc.
  const amountPatterns = [
    /(?:৳|tk|taka|টাকা)\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:৳|tk|taka|টাকা)/i,
    /(\d+(?:\.\d+)?)/,
  ];

  let amount: number | null = null;
  for (const pattern of amountPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      amount = parseFloat(match[1]);
      if (amount > 0 && amount < 10000000) break;
      amount = null;
    }
  }

  if (!amount) return null;

  // Detect category
  const lowerText = text.toLowerCase();
  let category = 'Other';
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      category = cat;
      break;
    }
  }

  // Use the original text as note, cleaned up
  const note = text
    .replace(/[৳]/g, '')
    .replace(/\d+(\.\d+)?/g, '')
    .replace(/\s*(taka|tk|টাকা)\s*/gi, '')
    .trim() || text;

  return { amount, category, note, date: today };
}

// ─── Claude AI System Prompt ──────────────────────────────────
const SYSTEM_PROMPT = `You are TakaTrack AI — a smart Bangladeshi finance assistant. You help users track expenses in BDT (৳).

RULES:
1. When the user mentions spending money (in Bangla or English), extract the expense and respond ONLY with this JSON:
{"type":"expense","data":{"amount":NUMBER,"category":"CATEGORY","note":"SHORT_DESCRIPTION","date":"YYYY-MM-DD"}}

2. Categories MUST be one of: Food, Transport, Shopping, Bills, Health, Entertainment, Other

3. If the user is asking a general question or chatting, respond with:
{"type":"chat","message":"YOUR_HELPFUL_RESPONSE"}

4. ALWAYS respond in the SAME LANGUAGE the user used (Bangla or English).
5. For date, use today's date unless the user specifies otherwise. Today is: ${new Date().toISOString().slice(0, 10)}
6. Be concise. Max 2-3 sentences for chat responses.

EXAMPLES:
User: "আজকে দুপুরে ১৫০ টাকার বিরিয়ানি খেলাম"
→ {"type":"expense","data":{"amount":150,"category":"Food","note":"দুপুরে বিরিয়ানি","date":"${new Date().toISOString().slice(0, 10)}"}}

User: "Uber te 80 taka gelo"
→ {"type":"expense","data":{"amount":80,"category":"Transport","note":"Uber ride","date":"${new Date().toISOString().slice(0, 10)}"}}

User: "How much did I spend this month?"
→ {"type":"chat","message":"I can see your expenses in the dashboard! Check the Monthly Report tab for a full breakdown."}`;

export default function chatRoutes(prisma: any) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // ─── Send Text Message ────────────────────────────────────────
  router.post('/message', requireAuth, requireSubscription(prisma), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { message } = req.body;
      if (!message || !message.trim()) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      // Save user message
      await prisma.chatMessage.create({
        data: { userId: req.userId!, role: 'user', content: message },
      });

      // Try local parsing first (FREE)
      const localResult = tryLocalParse(message);
      if (localResult) {
        // Auto-add expense
        const transaction = await prisma.transaction.create({
          data: {
            amount: localResult.amount,
            description: `${localResult.category} - ${localResult.note}`,
            type: 'expense',
            date: new Date(localResult.date),
            userId: req.userId!,
          },
        });

        const assistantMsg = `✅ Added ৳${localResult.amount} expense for "${localResult.note}" in ${localResult.category}`;
        await prisma.chatMessage.create({
          data: { userId: req.userId!, role: 'assistant', content: assistantMsg },
        });

        res.json({
          type: 'expense',
          message: assistantMsg,
          expense: {
            id: String(transaction.id),
            amount: localResult.amount,
            category: localResult.category,
            note: localResult.note,
            date: localResult.date,
          },
        });
        return;
      }

      // Fall back to Claude API
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20250414',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }],
      });

      const aiText = response.content[0].type === 'text' ? response.content[0].text : '';

      // Try to parse Claude's JSON response
      try {
        const parsed = JSON.parse(aiText);

        if (parsed.type === 'expense' && parsed.data) {
          // Auto-add expense to DB
          const { amount, category, note, date } = parsed.data;
          const transaction = await prisma.transaction.create({
            data: {
              amount,
              description: `${category} - ${note}`,
              type: 'expense',
              date: new Date(date),
              userId: req.userId!,
            },
          });

          const assistantMsg = `✅ Added ৳${amount} expense for "${note}" in ${category}`;
          await prisma.chatMessage.create({
            data: { userId: req.userId!, role: 'assistant', content: assistantMsg },
          });

          res.json({
            type: 'expense',
            message: assistantMsg,
            expense: {
              id: String(transaction.id),
              amount,
              category,
              note,
              date,
            },
          });
        } else {
          // General chat response
          const chatMsg = parsed.message || aiText;
          await prisma.chatMessage.create({
            data: { userId: req.userId!, role: 'assistant', content: chatMsg },
          });
          res.json({ type: 'chat', message: chatMsg });
        }
      } catch {
        // Claude didn't return valid JSON — treat as chat
        await prisma.chatMessage.create({
          data: { userId: req.userId!, role: 'assistant', content: aiText },
        });
        res.json({ type: 'chat', message: aiText });
      }
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Chat processing failed' });
    }
  });

  // ─── Voice Message (Whisper STT → Claude) ─────────────────────
  router.post('/voice', requireAuth, requireSubscription(prisma), upload.single('audio'), async (req: AuthRequest, res: Response): Promise<void> => {
    // Step 1: Validate audio file from multer
    if (!req.file) {
      res.status(400).json({ error: 'Audio file is required. Please record again.' });
      return;
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error('Voice error: req.file exists but buffer is empty/missing. Keys:', Object.keys(req.file));
      res.status(400).json({ error: 'Audio file is empty. Please record for at least 1-2 seconds.' });
      return;
    }

    console.log(`Voice: received ${req.file.buffer.length} bytes, mimetype: ${req.file.mimetype}`);

    // Step 2: Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('Voice error: OPENAI_API_KEY is not set in .env');
      res.status(500).json({ error: 'Voice service not configured. OPENAI_API_KEY missing in .env' });
      return;
    }

    // Step 3: Convert buffer to file and transcribe with Whisper
    let transcribedText: string;
    try {
      const audioFile = await toFile(req.file.buffer, 'audio.webm', { type: req.file.mimetype || 'audio/webm' });

      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: audioFile,
        language: 'bn', // Bengali/Bangla
      });

      transcribedText = transcription.text;
    } catch (whisperError: any) {
      const errMsg = whisperError?.message || String(whisperError);
      const statusCode = whisperError?.status || whisperError?.statusCode;
      console.error('Voice Whisper error:', { message: errMsg, status: statusCode, type: whisperError?.type });

      if (statusCode === 401 || errMsg.includes('API key')) {
        res.status(500).json({ error: 'OpenAI API key is invalid. Please check OPENAI_API_KEY in .env' });
      } else if (statusCode === 429) {
        res.status(429).json({ error: 'OpenAI rate limit reached. Please wait a moment and try again.' });
      } else if (statusCode === 402 || errMsg.includes('quota') || errMsg.includes('billing')) {
        res.status(402).json({ error: 'OpenAI account has no credits. Please add billing at platform.openai.com' });
      } else if (errMsg.includes('Could not process') || errMsg.includes('Invalid file')) {
        res.status(400).json({ error: 'Audio format not supported. Try speaking clearly for 2+ seconds.' });
      } else {
        res.status(500).json({ error: `Whisper transcription failed: ${errMsg.substring(0, 100)}` });
      }
      return;
    }

    if (!transcribedText || !transcribedText.trim()) {
      res.status(400).json({ error: 'Could not understand audio. Please speak clearly and try again.' });
      return;
    }

    console.log(`Voice: transcribed text: "${transcribedText}"`);

    // Step 4: Process the transcribed text (same as text chat)
    try {
      // Save the transcribed text as user message
      await prisma.chatMessage.create({
        data: { userId: req.userId!, role: 'user', content: `🎤 ${transcribedText}` },
      });

      // Try local parsing first (FREE)
      const localResult = tryLocalParse(transcribedText);
      if (localResult) {
        const transaction = await prisma.transaction.create({
          data: {
            amount: localResult.amount,
            description: `${localResult.category} - ${localResult.note}`,
            type: 'expense',
            date: new Date(localResult.date),
            userId: req.userId!,
          },
        });

        const assistantMsg = `✅ Voice recognized: "${transcribedText}"\nAdded ৳${localResult.amount} expense for "${localResult.note}" in ${localResult.category}`;
        await prisma.chatMessage.create({
          data: { userId: req.userId!, role: 'assistant', content: assistantMsg },
        });

        res.json({
          type: 'expense',
          transcription: transcribedText,
          message: assistantMsg,
          expense: {
            id: String(transaction.id),
            amount: localResult.amount,
            category: localResult.category,
            note: localResult.note,
            date: localResult.date,
          },
        });
        return;
      }

      // Fall back to Claude for complex parsing
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20250414',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: transcribedText }],
      });

      const aiText = response.content[0].type === 'text' ? response.content[0].text : '';

      try {
        const parsed = JSON.parse(aiText);

        if (parsed.type === 'expense' && parsed.data) {
          const { amount, category, note, date } = parsed.data;
          const transaction = await prisma.transaction.create({
            data: {
              amount,
              description: `${category} - ${note}`,
              type: 'expense',
              date: new Date(date),
              userId: req.userId!,
            },
          });

          const assistantMsg = `✅ Voice recognized: "${transcribedText}"\nAdded ৳${amount} expense for "${note}" in ${category}`;
          await prisma.chatMessage.create({
            data: { userId: req.userId!, role: 'assistant', content: assistantMsg },
          });

          res.json({
            type: 'expense',
            transcription: transcribedText,
            message: assistantMsg,
            expense: { id: String(transaction.id), amount, category, note, date },
          });
        } else {
          const chatMsg = parsed.message || aiText;
          await prisma.chatMessage.create({
            data: { userId: req.userId!, role: 'assistant', content: chatMsg },
          });
          res.json({ type: 'chat', transcription: transcribedText, message: chatMsg });
        }
      } catch {
        await prisma.chatMessage.create({
          data: { userId: req.userId!, role: 'assistant', content: aiText },
        });
        res.json({ type: 'chat', transcription: transcribedText, message: aiText });
      }
    } catch (processError: any) {
      console.error('Voice processing error (post-transcription):', processError?.message || processError);
      res.status(500).json({ error: `Failed to process voice text: ${(processError?.message || 'Unknown error').substring(0, 100)}` });
    }
  });

  // ─── Get Chat History ─────────────────────────────────────────
  router.get('/history', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const messages = await prisma.chatMessage.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'asc' },
        take: 100, // Last 100 messages
      });
      res.json(messages);
    } catch (error) {
      console.error('Chat history error:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  return router;
}
