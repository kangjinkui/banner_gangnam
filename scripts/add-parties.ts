/**
 * Script to add new parties to database
 *
 * Usage: npx tsx scripts/add-parties.ts
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// New parties to add with their colors
const newParties = [
  { name: '자유민주당', color: '#0066CC', is_active: true },
  { name: '내일로미래로', color: '#FF6B35', is_active: true },
  { name: '자유통일당', color: '#2E86AB', is_active: true },
  { name: '개혁신당', color: '#A23B72', is_active: true },
  { name: '조국혁신당', color: '#F18F01', is_active: true },
  { name: '우리공화당', color: '#C73E1D', is_active: true },
  { name: '사회민주당', color: '#6A994E', is_active: true },
  { name: '기타정당', color: '#999999', is_active: true },
];

async function addParties() {
  console.log('Adding new parties to database...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const party of newParties) {
    // Check if party already exists
    const { data: existingParty, error: checkError } = await supabase
      .from('parties')
      .select('id, name')
      .eq('name', party.name)
      .single();

    if (existingParty) {
      console.log(`⏭️  SKIP: ${party.name} (이미 존재함)`);
      skipCount++;
      continue;
    }

    // Insert new party
    const { data, error } = await supabase
      .from('parties')
      .insert({
        name: party.name,
        color: party.color,
        is_active: party.is_active,
      })
      .select()
      .single();

    if (error) {
      console.log(`❌ ERROR: ${party.name} - ${error.message}`);
      errorCount++;
    } else {
      console.log(`✅ SUCCESS: ${party.name} (${data.id})`);
      successCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total: ${newParties.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

// Run the script
addParties()
  .then(() => {
    console.log('\n✨ Parties added successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
