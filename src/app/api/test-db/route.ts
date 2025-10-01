import { NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';

export async function GET() {
  try {
    // Test connection by checking if tables exist
    const { data: parties, error: partiesError } = await supabase
      .from('parties')
      .select('*')
      .limit(5);

    if (partiesError) {
      return NextResponse.json({
        success: false,
        error: 'Parties table error: ' + partiesError.message,
      }, { status: 500 });
    }

    const { data: banners, error: bannersError } = await supabase
      .from('banners')
      .select('*')
      .limit(5);

    if (bannersError) {
      return NextResponse.json({
        success: false,
        error: 'Banners table error: ' + bannersError.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        parties: parties || [],
        banners: banners || [],
      },
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}