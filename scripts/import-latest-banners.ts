/**
 * Script to import non-deleted banners from 최신현수막.json file to database
 *
 * Usage: npx tsx scripts/import-latest-banners.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'exists' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface JsonBanner {
  deleted: string; // "네" or "아니오"
  latitude: string;
  longitude: string;
  시작일: string;
  정당명: string;
  종료일: string;
  행정동: string;
  "현수막 메모": string;
  "현수막 문구": string;
  "현수막 사진": string;
  "현수막 위치": string;
  "Creation Date": string;
  "Modified Date": string;
  Slug: string;
  Creator: string;
  "unique id": string;
}

// Helper function to parse date from Korean format
function parseKoreanDate(dateStr: string): string | null {
  if (!dateStr) return null;

  try {
    // Format: "Jun 12, 2025 12:00 am" -> "2025-06-12"
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Date parse error:', dateStr, error);
    return null;
  }
}

// Get all parties for mapping
async function getAllParties(): Promise<Map<string, string>> {
  const { data: parties, error } = await supabase
    .from('parties')
    .select('id, name');

  if (error || !parties) {
    console.error('Error fetching parties:', error);
    return new Map();
  }

  const partyMap = new Map<string, string>();
  parties.forEach((party) => {
    partyMap.set(party.name, party.id);
  });

  return partyMap;
}

async function importBanners() {
  console.log('Starting banner import from 최신현수막.json...\n');

  // Read JSON file
  const jsonPath = join(process.cwd(), '최신현수막.json');
  const jsonData = readFileSync(jsonPath, 'utf-8');
  const banners: JsonBanner[] = JSON.parse(jsonData);

  console.log(`Found ${banners.length} banners in JSON file\n`);

  // Filter only non-deleted banners
  const activeBanners = banners.filter(b => b.deleted === '아니오');
  console.log(`Filtered to ${activeBanners.length} active banners (deleted: "아니오")\n`);

  // Get all parties
  const partyMap = await getAllParties();
  console.log(`\nLoaded ${partyMap.size} parties from database:`);
  partyMap.forEach((id, name) => {
    console.log(`  - ${name}`);
  });
  console.log('\nStarting import...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < activeBanners.length; i++) {
    const banner = activeBanners[i];
    const num = i + 1;

    // Parse dates
    const startDate = parseKoreanDate(banner.시작일);
    const endDate = parseKoreanDate(banner.종료일);

    // Skip if dates are missing
    if (!startDate || !endDate) {
      console.log(`[${num}/${activeBanners.length}] SKIP: 날짜 정보 없음 - ${banner['현수막 위치']}`);
      skipCount++;
      continue;
    }

    // Skip if text is empty
    if (!banner['현수막 문구'] || banner['현수막 문구'].trim() === '') {
      console.log(`[${num}/${activeBanners.length}] SKIP: 문구 없음 - ${banner['현수막 위치']}`);
      skipCount++;
      continue;
    }

    // Get party ID
    const partyId = partyMap.get(banner.정당명);
    if (!partyId) {
      console.log(`[${num}/${activeBanners.length}] SKIP: 정당 없음 ("${banner.정당명}") - ${banner['현수막 위치']}`);
      skipCount++;
      continue;
    }

    // Parse coordinates
    const lat = parseFloat(banner.latitude);
    const lng = parseFloat(banner.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      console.log(`[${num}/${activeBanners.length}] ERROR: 잘못된 좌표 - ${banner['현수막 위치']}`);
      errorCount++;
      continue;
    }

    console.log(`[${num}/${activeBanners.length}] Processing: ${banner['현수막 위치']} (${banner.정당명})`);

    // Prepare banner data
    const bannerData = {
      party_id: partyId,
      address: banner['현수막 위치'],
      lat: lat,
      lng: lng,
      administrative_district: banner.행정동 || null,
      text: banner['현수막 문구'],
      start_date: startDate,
      end_date: endDate,
      image_url: banner['현수막 사진'] && banner['현수막 사진'].startsWith('//')
        ? `https:${banner['현수막 사진']}`
        : banner['현수막 사진'] || null,
      memo: banner['현수막 메모'] || null,
      is_active: true,
    };

    // Insert into database
    const { data, error } = await supabase
      .from('banners')
      .insert(bannerData)
      .select()
      .single();

    if (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ SUCCESS: ${data.id}`);
      successCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total in file: ${banners.length}`);
  console.log(`Active (deleted: "아니오"): ${activeBanners.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

// Run the import
importBanners()
  .then(() => {
    console.log('\n✨ Import completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
