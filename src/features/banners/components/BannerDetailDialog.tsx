'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Edit2, Trash2 } from 'lucide-react';
import { BannerWithParty } from '@/types/banner';
import { useBannerActions } from '@/store/banner.store';
import { useAuth } from '@/contexts/AuthContext';
import { PLACEHOLDER_IMAGES } from '@/lib/utils/placeholder';

interface BannerDetailDialogProps {
  banner: BannerWithParty | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function BannerDetailDialog({ banner, open, onOpenChange, onUpdate }: BannerDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBanner, setEditedBanner] = useState<BannerWithParty | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { updateBanner, removeBanner } = useBannerActions();
  const { hasPermission } = useAuth();

  if (!banner) return null;

  const handleEdit = () => {
    setEditedBanner({ ...banner });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedBanner(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editedBanner) return;

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('banner_type', editedBanner.banner_type);
      formData.append('text', editedBanner.text);
      formData.append('address', editedBanner.address);
      if (editedBanner.start_date) formData.append('start_date', editedBanner.start_date);
      if (editedBanner.end_date) formData.append('end_date', editedBanner.end_date);
      if (editedBanner.banner_type === 'public' && editedBanner.department) {
        formData.append('department', editedBanner.department);
      }
      if ((editedBanner as any).poster_name) {
        formData.append('poster_name', (editedBanner as any).poster_name);
      }
      formData.append('memo', editedBanner.memo || '');
      formData.append('is_active', String(editedBanner.is_active));

      const response = await fetch(`/api/banners/${editedBanner.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          updateBanner(editedBanner.id, result.data);
          setIsEditing(false);
          setEditedBanner(null);
          onOpenChange(false);
          if (onUpdate) onUpdate(); else window.location.reload();
        } else {
          alert('저장 중 오류가 발생했습니다: ' + result.error);
        }
      } else {
        const result = await response.json();
        alert('저장 중 오류가 발생했습니다: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('Failed to update banner:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('현수막을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/banners/${banner.id}`, { method: 'DELETE' });
      if (response.ok) {
        removeBanner(banner.id);
        onOpenChange(false);
        if (onUpdate) onUpdate(); else window.location.reload();
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const currentBanner = isEditing ? editedBanner! : banner;
  const isExpired = currentBanner.banner_type !== 'rally' && !!currentBanner.end_date && currentBanner.end_date < today;

  const bannerTypeLabel =
    currentBanner.banner_type === 'political' ? '정당' :
    currentBanner.banner_type === 'public' ? '공공' : '집회시위';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {isEditing ? '현수막 수정' : '현수막 상세'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isEditing && hasPermission('banners', 'update') && (
                <Button variant="outline" size="sm" onClick={handleEdit} className="gap-2">
                  <Edit2 className="w-4 h-4" />
                  수정
                </Button>
              )}
              {!isEditing && hasPermission('banners', 'delete') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? '삭제 중...' : '삭제'}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* 현수막 이미지 */}
          <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={currentBanner.image_url || PLACEHOLDER_IMAGES.bannerLarge}
              alt={currentBanner.text}
              className="w-full h-full object-contain"
            />
          </div>

          {/* 배지 영역 */}
          <div className="flex items-center gap-2 flex-wrap">
            {currentBanner.party ? (
              <Badge
                style={{ backgroundColor: currentBanner.party.color, color: 'white' }}
                className="text-sm px-3 py-1"
              >
                {currentBanner.party.name}
              </Badge>
            ) : (
              <Badge className="text-sm px-3 py-1">
                {bannerTypeLabel}
              </Badge>
            )}
            {currentBanner.banner_type === 'public' && currentBanner.department && (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {currentBanner.department}
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" className="text-sm px-3 py-1">
                만료됨
              </Badge>
            )}
            {!currentBanner.is_active && (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                비활성
              </Badge>
            )}
          </div>

          {/* 타입 변경 (공공/집회시위만, 편집 모드) */}
          {isEditing && currentBanner.banner_type !== 'political' && (
            <div className="space-y-2">
              <Label>현수막 타입</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditedBanner({ ...currentBanner, banner_type: 'public', department: currentBanner.department || '' })}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentBanner.banner_type === 'public'
                      ? 'bg-green-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🟢 공공 현수막
                </button>
                <button
                  type="button"
                  onClick={() => setEditedBanner({ ...currentBanner, banner_type: 'rally', department: undefined })}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentBanner.banner_type === 'rally'
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🔵 집회시위 현수막
                </button>
              </div>
            </div>
          )}

          {/* 현수막 문구 */}
          <div className="space-y-2">
            <Label htmlFor="text">현수막 문구</Label>
            {isEditing ? (
              <Input
                id="text"
                value={currentBanner.text}
                onChange={(e) => setEditedBanner({ ...currentBanner, text: e.target.value })}
                placeholder="현수막 문구를 입력하세요"
              />
            ) : (
              <p className="text-lg font-medium text-gray-900">{currentBanner.text}</p>
            )}
          </div>

          {/* 주소 */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              주소
            </Label>
            {isEditing ? (
              <Input
                id="address"
                value={currentBanner.address}
                onChange={(e) => setEditedBanner({ ...currentBanner, address: e.target.value })}
                placeholder="주소를 입력하세요"
              />
            ) : (
              <p className="text-gray-700">{currentBanner.address}</p>
            )}
            {currentBanner.administrative_district && (
              <p className="text-sm text-gray-500">행정동: {currentBanner.administrative_district}</p>
            )}
          </div>

          {/* 부서명 (공공만) */}
          {(currentBanner.banner_type === 'public' || (isEditing && editedBanner?.banner_type === 'public')) && (
            <div className="space-y-2">
              <Label htmlFor="department">부서명</Label>
              {isEditing ? (
                <Input
                  id="department"
                  value={currentBanner.department || ''}
                  onChange={(e) => setEditedBanner({ ...currentBanner, department: e.target.value })}
                />
              ) : (
                <p className="text-gray-700">{currentBanner.department || '-'}</p>
              )}
            </div>
          )}

          {/* 게시자명 (집회시위만) */}
          {(currentBanner.banner_type === 'rally') && (
            <div className="space-y-2">
              <Label htmlFor="poster_name">게시자명</Label>
              {isEditing ? (
                <Input
                  id="poster_name"
                  value={(currentBanner as any).poster_name || ''}
                  onChange={(e) => setEditedBanner({ ...currentBanner, ...(editedBanner || {}), poster_name: e.target.value } as any)}
                  placeholder="게시자명을 입력하세요"
                />
              ) : (
                <p className="text-gray-700">{(currentBanner as any).poster_name || '-'}</p>
              )}
            </div>
          )}

          {/* 기간 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                시작일
              </Label>
              {isEditing ? (
                <Input
                  id="start_date"
                  type="date"
                  value={currentBanner.start_date || ''}
                  onChange={(e) => setEditedBanner({ ...currentBanner, start_date: e.target.value })}
                />
              ) : (
                <p className="text-gray-700">{currentBanner.start_date || '-'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                종료일
              </Label>
              {isEditing ? (
                <Input
                  id="end_date"
                  type="date"
                  value={currentBanner.end_date || ''}
                  onChange={(e) => setEditedBanner({ ...currentBanner, end_date: e.target.value })}
                />
              ) : (
                <p className="text-gray-700">{currentBanner.end_date || '-'}</p>
              )}
            </div>
          </div>

          {/* 메모 */}
          {(isEditing || currentBanner.memo) && (
            <div className="space-y-2">
              <Label htmlFor="memo">메모</Label>
              {isEditing ? (
                <Textarea
                  id="memo"
                  value={currentBanner.memo || ''}
                  onChange={(e) => setEditedBanner({ ...currentBanner, memo: e.target.value })}
                  placeholder="메모를 입력하세요"
                  rows={3}
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{currentBanner.memo || '-'}</p>
              )}
            </div>
          )}

          {/* 등록/수정 일시 */}
          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500 space-y-1">
            <p>등록일: {currentBanner.created_at ? new Date(currentBanner.created_at).toLocaleString('ko-KR') : '-'}</p>
            <p>수정일: {currentBanner.updated_at ? new Date(currentBanner.updated_at).toLocaleString('ko-KR') : '-'}</p>
          </div>
        </div>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
