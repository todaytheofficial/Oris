const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Supabase client с увеличенным таймаутом
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000) // 30 секунд таймаут
        });
      }
    }
  }
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Убедиться что папка для локальных файлов существует
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
['images', 'videos', 'audio', 'misc'].forEach(folder => {
  const dir = path.join(uploadsDir, folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Retry загрузки в Supabase
async function uploadToSupabase(filePath, buffer, contentType, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(filePath, buffer, {
          contentType,
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .getPublicUrl(filePath);

      return { success: true, url: urlData.publicUrl };
    } catch (err) {
      console.error(`Supabase attempt ${i + 1}/${retries} failed:`, err.message);
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1))); // ждём перед ретраем
      }
    }
  }
  return { success: false };
}

// Локальное сохранение как fallback
function saveLocally(buffer, folder, fileName) {
  const filePath = path.join(uploadsDir, folder, fileName);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${folder}/${fileName}`;
}

router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не выбран' });
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const fileName = `${req.userId}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    // Determine folder
    let folder = 'misc';
    let type = 'image';
    const mime = req.file.mimetype;
    if (mime.startsWith('image/')) { folder = 'images'; type = 'image'; }
    else if (mime.startsWith('video/')) { folder = 'videos'; type = 'video'; }
    else if (mime.startsWith('audio/')) { folder = 'audio'; type = 'audio'; }

    const supabasePath = `${folder}/${fileName}`;

    // Пробуем Supabase
    const result = await uploadToSupabase(supabasePath, req.file.buffer, req.file.mimetype);

    if (result.success) {
      console.log('Uploaded to Supabase:', result.url);
      return res.json({
        success: true,
        url: result.url,
        type,
        fileName
      });
    }

    // Fallback: сохраняем локально
    console.log('Supabase unavailable, saving locally');
    const localUrl = saveLocally(req.file.buffer, folder, fileName);

    res.json({
      success: true,
      url: localUrl,
      type,
      fileName,
      storage: 'local'
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

module.exports = router;