import { NextRequest, NextResponse } from 'next/server';
import { PartyService } from '@/lib/services/party.service';
import { partyCreateSchema } from '@/lib/validations';
import { QueryOptions } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const isActive = searchParams.get('is_active');
    const sortField = searchParams.get('sort_field') || 'name';
    const sortDirection = searchParams.get('sort_direction') || 'asc';

    const options: QueryOptions = {
      page,
      limit,
      filters: {
        search,
        is_active: isActive ? isActive === 'true' : undefined,
      },
      sort: {
        field: sortField,
        direction: sortDirection as 'asc' | 'desc',
      },
    };

    const result = await PartyService.getAll(options);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/parties error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = partyCreateSchema.parse(body);

    // Create party
    const party = await PartyService.create(validatedData);

    return NextResponse.json({
      success: true,
      data: party,
      message: '정당이 성공적으로 생성되었습니다.',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/parties error:', error);

    if (error instanceof Error) {
      // Check for validation errors
      if (error.message.includes('validation')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 400 });
      }

      // Check for duplicate name error
      if (error.message.includes('이미 존재하는')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 409 });
      }
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}