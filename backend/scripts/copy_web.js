import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.resolve(__dirname, '../../web_admin/dist');
const targetPublic = path.resolve(__dirname, '../public');
const targetDistPublic = path.resolve(__dirname, '../dist/public');

if (fs.existsSync(source) && fs.existsSync(path.join(source, 'index.html'))) {
  console.log(`📦 Copying built web portal from ${source} to backend public directories...`);
  
  fs.mkdirSync(targetPublic, { recursive: true });
  fs.cpSync(source, targetPublic, { recursive: true });
  console.log(`✅ Copied to: ${targetPublic}`);

  fs.mkdirSync(targetDistPublic, { recursive: true });
  fs.cpSync(source, targetDistPublic, { recursive: true });
  console.log(`✅ Copied to: ${targetDistPublic}`);
} else {
  console.warn(`⚠️ Warning: Web admin dist not found at ${source}. Please build web_admin first.`);
}
