/**
 * Script to import banners from JSON file to database
 *
 * Usage: npx tsx scripts/import-banners.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface JsonBanner {
  deleted: string; // "네" or "아니오"
  시작일: string;
  종료일: string;
  행정동: string;
  "현수막 메모": string;
  "현수막 문구": string;
  "현수막 사진": string;
  "현수막 위치": string;
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

// Geocoding function using Kakao API
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
  if (!kakaoApiKey) {
    console.error('Kakao API key not found');
    return null;
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      {
        headers: {
          Authorization: `KakaoAK ${kakaoApiKey}`,
        },
      }
    );

    const data = await response.json();

    if (data.documents && data.documents.length > 0) {
      const doc = data.documents[0];
      return {
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error for address:', address, error);
    return null;
  }
}

// Get or create default party (you need to specify which party these banners belong to)
async function getDefaultPartyId(): Promise<string | null> {
  // First, try to get existing parties
  const { data: parties, error } = await supabase
    .from('parties')
    .select('id, name')
    .eq('is_active', true)
    .limit(10);

  if (error) {
    console.error('Error fetching parties:', error);
    return null;
  }

  if (parties && parties.length > 0) {
    console.log('\nAvailable parties:');
    parties.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.name} (${p.id})`);
    });

    // Return first party ID as default
    // You should modify this to use the correct party
    return parties[0].id;
  }

  console.error('No parties found in database. Please create parties first.');
  return null;
}

async function importBanners() {
  console.log('Starting banner import...\n');

  // Read JSON file
  const jsonPath = join(process.cwd(), '현수막 목록.json');
  const jsonData = readFileSync(jsonPath, 'utf-8');
  const banners: JsonBanner[] = JSON.parse(jsonData);

  console.log(`Found ${banners.length} banners in JSON file\n`);

  // Get default party ID
  const defaultPartyId = await getDefaultPartyId();
  if (!defaultPartyId) {
    console.error('Cannot proceed without a party ID');
    return;
  }

  console.log(`\nUsing party ID: ${defaultPartyId}`);
  console.log('\nStarting import...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < banners.length; i++) {
    const banner = banners[i];
    const num = i + 1;

    // Skip deleted banners
    if (banner.deleted === '네') {
      console.log(`[${num}/${banners.length}] SKIP: 삭제된 현수막 - ${banner['현수막 위치']}`);
      skipCount++;
      continue;
    }

    // Parse dates
    const startDate = parseKoreanDate(banner.시작일);
    const endDate = parseKoreanDate(banner.종료일);

    // Skip if dates are missing
    if (!startDate || !endDate) {
      console.log(`[${num}/${banners.length}] SKIP: 날짜 정보 없음 - ${banner['현수막 위치']}`);
      skipCount++;
      continue;
    }

    // Skip if text is empty
    if (!banner['현수막 문구'] || banner['현수막 문구'].trim() === '') {
      console.log(`[${num}/${banners.length}] SKIP: 문구 없음 - ${banner['현수막 위치']}`);
      skipCount++;
      continue;
    }

    // Geocode address
    console.log(`[${num}/${banners.length}] Processing: ${banner['현수막 위치']}`);

    const coords = await geocodeAddress(banner['현수막 위치']);
    if (!coords) {
      console.log(`  ❌ ERROR: 주소 변환 실패`);
      errorCount++;
      continue;
    }

    // Prepare banner data
    const bannerData = {
      party_id: defaultPartyId,
      address: banner['현수막 위치'],
      lat: coords.lat,
      lng: coords.lng,
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
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total: ${banners.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

// Run the import
importBanners()
  .then(() => {
    console.log('\nImport completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nImport failed:', error);
    process.exit(1);
  });
