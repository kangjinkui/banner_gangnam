import { NextRequest, NextResponse } from 'next/server';
import { BannerService } from '@/lib/services/banner.service';
import { bannerExportSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = bannerExportSchema.parse(body);

    if (validatedData.format !== 'csv') {
      return NextResponse.json({
        success: false,
        error: '이 엔드포인트는 CSV 형식만 지원합니다.',
      }, { status: 400 });
    }

    // Get banner data with filters
    const { data: banners } = await BannerService.getAll({
      filters: validatedData.filters,
    });

    // Define default columns if not specified
    const defaultColumns = [
      'party_name',
      'text',
      'address',
      'administrative_district',
      'start_date',
      'end_date',
      'is_active',
      'created_at'
    ];

    const columns = validatedData.columns || defaultColumns;

    // Create CSV headers
    const headers = columns.map(col => {
      const headerMap: { [key: string]: string } = {
        party_name: '정당명',
        text: '현수막 문구',
        address: '주소',
        administrative_district: '행정동',
        start_date: '시작일',
        end_date: '종료일',
        is_active: '활성 상태',
        created_at: '생성일',
        memo: '메모',
        image_url: '이미지 URL',
      };
      return headerMap[col] || col;
    });

    // Create CSV rows
    const rows = banners.map(banner => {
      return columns.map(col => {
        let value: any;

        switch (col) {
          case 'party_name':
            value = banner.party.name;
            break;
          case 'is_active':
            value = banner.is_active ? '활성' : '비활성';
            break;
          case 'created_at':
            value = new Date(banner.created_at).toLocaleDateString('ko-KR');
            break;
          case 'start_date':
          case 'end_date':
            value = new Date(banner[col]).toLocaleDateString('ko-KR');
            break;
          default:
            value = banner[col as keyof typeof banner] || '';
        }

        // Escape commas and quotes for CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }

        return value;
      });
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Add BOM for proper Korean character encoding
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="banners_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('POST /api/export/csv error:', error);

    if (error instanceof Error) {
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