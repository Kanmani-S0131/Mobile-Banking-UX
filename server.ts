import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const EXTRACTION_SYSTEM_INSTRUCTION = `You are a precision data extraction engine for the International Mobile Banking UX Dataset Automation tool.
Analyze the provided JPG or PNG image. The image will typically be either:
1. A table / spreadsheet / CSV screenshot containing mobile banking UX dataset rows.
2. A screenshot or photograph of a mobile banking app screen or UX audit card.

Extract every visible row into the 14-column UX schema:
- record_id
- bank_name
- country
- app_name
- screen_no
- screen_name
- screen_category
- features_present (semicolon-separated string, e.g. "Biometric Login; QR Pay")
- auth_method
- languages_supported (semicolon-separated string, e.g. "English; Spanish")
- accessibility_flag
- ux_rating
- collected_by
- collected_date

Rules:
- Preserve exact visible cell values (including messy aliases like "USA", "U.K.", "y", "N", mixed dates, out-of-range ratings, or blank cells) so the downstream validation pipeline can clean or reject them accurately. Never invent missing mandatory fields—leave missing values as empty string "".
- If the image is a spreadsheet/table ("table"), list the exact column headers visible in detected_columns (lowercased snake_case, e.g. "record_id", "bank_name", etc.).
- If the image is a mobile banking UI screenshot ("app_screen"), set detected_columns to all 14 standard column names if at least bank/app/screen details are identifiable, and extract 1 row with the visible screen details (leaving unshown fields like collected_by or ux_rating as "" unless visible).
- If the image has no readable banking UX or tabular data, return source_type: "unreadable" and rows: [].`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.post('/api/extract-image-rows', async (req, res) => {
    try {
      const { fileName, mimeType, base64Data } = req.body ?? {};

      if (!base64Data || typeof base64Data !== 'string') {
        res.status(400).json({ error: 'Missing image payload.' });
        return;
      }

      if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
        res.status(400).json({
          error: 'Unsupported image MIME type. Only image/jpeg and image/png are supported.',
        });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured. Please add it in Settings > Secrets to extract UX rows from JPG/PNG images.',
        });
        return;
      }

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };

      const textPart = {
        text: `Extract all UX dataset rows and column headers from this image (${String(fileName ?? 'uploaded_image')}).`,
      };

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              source_type: {
                type: Type.STRING,
                description: 'One of: table, app_screen, unreadable',
              },
              detected_columns: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Detected column headers in snake_case',
              },
              notes: {
                type: Type.STRING,
                description: 'Brief summary of what was extracted from the image',
              },
              rows: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    record_id: { type: Type.STRING },
                    bank_name: { type: Type.STRING },
                    country: { type: Type.STRING },
                    app_name: { type: Type.STRING },
                    screen_no: { type: Type.STRING },
                    screen_name: { type: Type.STRING },
                    screen_category: { type: Type.STRING },
                    features_present: { type: Type.STRING },
                    auth_method: { type: Type.STRING },
                    languages_supported: { type: Type.STRING },
                    accessibility_flag: { type: Type.STRING },
                    ux_rating: { type: Type.STRING },
                    collected_by: { type: Type.STRING },
                    collected_date: { type: Type.STRING },
                  },
                },
              },
            },
            required: ['source_type', 'detected_columns', 'rows'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as {
        source_type?: string;
        detected_columns?: string[];
        notes?: string;
        rows?: Record<string, string>[];
      };

      res.json({
        source_type: parsed.source_type ?? 'unreadable',
        detected_columns: Array.isArray(parsed.detected_columns) ? parsed.detected_columns : [],
        notes: parsed.notes ?? '',
        rows: Array.isArray(parsed.rows) ? parsed.rows : [],
      });
    } catch (err) {
      console.error('Image extraction error:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to extract dataset rows from image.';
      res.status(500).json({ error: message });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Production build not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
