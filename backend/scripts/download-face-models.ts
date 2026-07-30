/**
 * Script to download face-api.js model weights.
 * Run with: npx ts-node scripts/download-face-models.ts
 * 
 * Models are downloaded from the face-api.js GitHub repository
 * and saved to the backend/models/ directory.
 */
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const MODELS_DIR = path.join(__dirname, '..', 'models');
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const MODEL_FILES = [
  // SSD MobileNet V1 - face detection
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  // Face Landmark 68 - facial landmark detection
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  // Face Recognition - 128-dim descriptor extraction
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          https.get(redirectUrl, (redirectResponse) => {
            redirectResponse.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve();
            });
          }).on('error', reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function main() {
  // Create models directory if it doesn't exist
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log(`Created models directory: ${MODELS_DIR}`);
  }

  console.log(`Downloading face-api.js models to ${MODELS_DIR}...`);
  console.log('');

  for (const file of MODEL_FILES) {
    const destPath = path.join(MODELS_DIR, file);
    
    // Skip if file already exists
    if (fs.existsSync(destPath)) {
      console.log(`  ✓ ${file} (already exists)`);
      continue;
    }

    const url = `${BASE_URL}/${file}`;
    console.log(`  ↓ Downloading ${file}...`);
    
    try {
      await downloadFile(url, destPath);
      console.log(`  ✓ ${file}`);
    } catch (error) {
      console.error(`  ✗ Failed to download ${file}: ${error}`);
    }
  }

  console.log('');
  console.log('Model download complete!');
}

main().catch(console.error);
