// ================================================================
// 🧹 Cleanup Script - ลบไฟล์ชั่วคราวที่เก่า
// ================================================================
// รันด้วย: node cleanup-temp-files.js
// ================================================================

require('dotenv').config({ path: '.env.local' });

const CLEANUP_SECRET = process.env.CLEANUP_SECRET || 'cleanup-secret-key-2024';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function cleanupTempFiles() {
  try {
    // console.log('🧹 Starting cleanup process...');
    // console.log(`📍 Target: ${BASE_URL}/api/cleanup/temp-files`);
    
    const response = await fetch(`${BASE_URL}/api/cleanup/temp-files`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLEANUP_SECRET}`,
      },
    });

    const data = await response.json(); 

    if (response.ok) {
      // console.log('✅ Cleanup completed successfully!');
      // console.log('📊 Stats:', data.stats);
    } else {
      console.error('❌ Cleanup failed:', data.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupTempFiles();
