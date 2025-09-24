import { NextRequest, NextResponse } from 'next/server';
import { PartyService } from '@/lib/services/party.service';
import { partyUpdateSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '정당 ID가 필요합니다.',
      }, { status: 400 });
    }

    const party = await PartyService.getById(id);

    if (!party) {
      return NextResponse.json({
        success: false,
        error: '정당을 찾을 수 없습니다.',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: party,
    });
  } catch (error) {
    console.error('GET /api/parties/[id] error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '정당 ID가 필요합니다.',
      }, { status: 400 });
    }

    // Validate input
    const validatedData = partyUpdateSchema.parse(body);

    // Update party
    const party = await PartyService.update(id, validatedData);

    return NextResponse.json({
      success: true,
      data: party,
      message: '정당이 성공적으로 수정되었습니다.',
    });
  } catch (error) {
    console.error('PUT /api/parties/[id] error:', error);

    if (error instanceof Error) {
      if (error.message.includes('찾을 수 없습니다')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 404 });
      }

      if (error.message.includes('이미 존재하는')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 409 });
      }

      if (error.message.includes('validation')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '정당 ID가 필요합니다.',
      }, { status: 400 });
    }

    if (hardDelete) {
      await PartyService.hardDelete(id);
    } else {
      await PartyService.delete(id);
    }

    return NextResponse.json({
      success: true,
      message: hardDelete ? '정당이 영구적으로 삭제되었습니다.' : '정당이 비활성화되었습니다.',
    });
  } catch (error) {
    console.error('DELETE /api/parties/[id] error:', error);

    if (error instanceof Error) {
      if (error.message.includes('찾을 수 없습니다')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 404 });
      }

      if (error.message.includes('활성화된 현수막')) {
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