import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const isSupabaseConfigured = !!(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let supabaseClient: any = null;

if (isSupabaseConfigured) {
  supabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  console.log('Supabase Storage configured successfully.');
} else {
  console.log('Supabase Storage not configured. Falling back to local storage in uploads/');
}

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'mvgr-material-hub';

export const uploadToStorage = async (key: string, buffer: Buffer, mimetype: string): Promise<string> => {
  if (isSupabaseConfigured && supabaseClient) {
    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(key, buffer, {
        contentType: mimetype,
        upsert: true
      });

    if (error) {
      throw new Error(`Supabase Storage upload error: ${error.message}`);
    }
    return key;
  } else {
    // Local disk fallback
    const localPath = path.join(LOCAL_UPLOAD_DIR, key);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(localPath, buffer);
    return key;
  }
};

export const getSignedUrlForDownload = async (key: string): Promise<string> => {
  if (isSupabaseConfigured && supabaseClient) {
    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(key, 300); // 5 min link expiry

    if (error) {
      throw new Error(`Supabase Storage presigned URL error: ${error.message}`);
    }
    return data.signedUrl;
  } else {
    // Local download proxy URL
    return `/api/materials/local-download?key=${encodeURIComponent(key)}`;
  }
};

export const deleteFromStorage = async (key: string): Promise<void> => {
  if (isSupabaseConfigured && supabaseClient) {
    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove([key]);

    if (error) {
      throw new Error(`Supabase Storage delete error: ${error.message}`);
    }
  } else {
    const localPath = path.join(LOCAL_UPLOAD_DIR, key);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  }
};

// Returns a file buffer for serving (local disk or Supabase Storage)
export const getLocalFileBuffer = async (key: string): Promise<Buffer> => {
  if (isSupabaseConfigured && supabaseClient) {
    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .download(key);

    if (error) {
      throw new Error(`Supabase Storage download error: ${error.message}`);
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } else {
    const localPath = path.join(LOCAL_UPLOAD_DIR, key);
    if (!fs.existsSync(localPath)) {
      throw new Error('Local file not found');
    }
    return fs.promises.readFile(localPath);
  }
};
