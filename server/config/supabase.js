// server/config/supabase.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');

let supabase = null;
let useLocal = false;

// Проверяем настроен ли Supabase
if (
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_ANON_KEY &&
  !process.env.SUPABASE_URL.includes('placeholder')
) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  console.log('✅ Supabase подключён');
} else {
  useLocal = true;
  console.log('⚠️  Supabase не настроен — файлы сохраняются локально в /uploads');
}

const BUCKET = process.env.SUPABASE_BUCKET || 'oris-files';
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

// Создаём папки для локального хранения
if (useLocal) {
  ['avatars', 'images', 'voice'].forEach(dir => {
    const fullPath = path.join(UPLOADS_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
}

async function uploadFile(fileBuffer, fileName, mimeType) {
  if (useLocal) {
    // Локальное сохранение
    const filePath = path.join(UPLOADS_DIR, fileName);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, fileBuffer);
    return `/uploads/${fileName}`;
  }

  // Supabase
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) throw new Error(`Upload error: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

async function deleteFile(fileName) {
  if (useLocal) {
    const filePath = path.join(UPLOADS_DIR, fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([fileName]);

  if (error) console.error('Delete error:', error.message);
}

module.exports = { uploadFile, deleteFile };