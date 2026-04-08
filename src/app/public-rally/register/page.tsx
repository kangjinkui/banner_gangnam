'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PublicRallyRegisterPage() {
  const router = useRouter();
  const [bannerType, setBannerType] = useState<'public' | 'rally'>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set('banner_type', bannerType);

      const response = await fetch('/api/banners', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '현수막 등록에 실패했습니다.');
      }

      alert('현수막이 성공적으로 등록되었습니다.');
      router.push('/public-rally');
    } catch (error) {
      console.error('Submit error:', error);
      alert(error instanceof Error ? error.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1400px] mx-auto">
          <Link href="/public-rally">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로
            </Button>
          </Link>
        </div>
      </header>

      <div className="px-6 py-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>공공/집회시위 현수막 등록</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 타입 선택 */}
              <div>
                <Label>현수막 타입 *</Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    type="button"
                    variant={bannerType === 'public' ? 'default' : 'outline'}
                    className={bannerType === 'public' ? 'bg-green-600 hover:bg-green-700' : ''}
                    onClick={() => setBannerType('public')}
                  >
                    🟢 공공 현수막
                  </Button>
                  <Button
                    type="button"
                    variant={bannerType === 'rally' ? 'default' : 'outline'}
                    className={bannerType === 'rally' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    onClick={() => setBannerType('rally')}
                  >
                    🔵 집회시위 현수막
                  </Button>
                </div>
              </div>

              {/* 부서명 (공공만) */}
              {bannerType === 'public' && (
                <div>
                  <Label htmlFor="department">부서명 *</Label>
                  <Input
                    id="department"
                    name="department"
                    placeholder="예: 환경부, 교육청"
                    required
                  />
                </div>
              )}

              {/* 게시자명 (집회시위만) */}
              {bannerType === 'rally' && (
                <div>
                  <Label htmlFor="poster_name">게시자명</Label>
                  <Input
                    id="poster_name"
                    name="poster_name"
                    placeholder="게시자명을 입력하세요"
                  />
                  <p className="text-xs text-gray-500 mt-1">선택 사항</p>
                </div>
              )}

              {/* 주소 */}
              <div>
                <Label htmlFor="address">설치 주소 *</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="서울시 강남구 역삼동 ..."
                  required
                />
              </div>

              {/* 문구 */}
              <div>
                <Label htmlFor="text">현수막 문구 *</Label>
                <Textarea
                  id="text"
                  name="text"
                  placeholder="현수막에 표시될 문구를 입력하세요"
                  rows={3}
                  required
                />
              </div>

              {/* 기간 (선택) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">시작일</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                  />
                  <p className="text-xs text-gray-500 mt-1">선택 사항</p>
                </div>
                <div>
                  <Label htmlFor="end_date">종료일</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                  />
                  <p className="text-xs text-gray-500 mt-1">선택 사항</p>
                </div>
              </div>

              {/* 사진 */}
              <div>
                <Label htmlFor="image">사진</Label>
                <Input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                />
                <p className="text-xs text-gray-500 mt-1">선택 사항</p>
              </div>

              {/* 메모 */}
              <div>
                <Label htmlFor="memo">메모</Label>
                <Textarea
                  id="memo"
                  name="memo"
                  placeholder="추가 메모사항"
                  rows={2}
                />
              </div>

              {/* 버튼 */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={bannerType === 'public' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
                >
                  {isSubmitting ? '등록 중...' : '등록'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
