'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Edit2, X } from 'lucide-react';
import { BannerWithParty } from '@/types/banner';
import { useBannerActions } from '@/store/banner.store';

interface BannerDetailDialogProps {
  banner: BannerWithParty | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BannerDetailDialog({ banner, open, onOpenChange }: BannerDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBanner, setEditedBanner] = useState<BannerWithParty | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { updateBanner } = useBannerActions();

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
      // Create FormData
      const formData = new FormData();

      formData.append('text', editedBanner.text);
      formData.append('address', editedBanner.address);
      formData.append('start_date', editedBanner.start_date);
      formData.append('end_date', editedBanner.end_date);
      formData.append('memo', editedBanner.memo || '');
      formData.append('is_active', String(editedBanner.is_active));

      const response = await fetch(`/api/banners/${editedBanner.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update local state with server response
          updateBanner(editedBanner.id, result.data);
          setIsEditing(false);
          setEditedBanner(null);
          onOpenChange(false);

          // Refresh the page to show updated data
          window.location.reload();
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

  const currentBanner = isEditing ? editedBanner! : banner;
  const isExpired = new Date(currentBanner.end_date) < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {isEditing ? '현수막 수정' : '현수막 상세 정보'}
            </DialogTitle>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="gap-2"
              >
                <Edit2 className="w-4 h-4" />
                수정
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Banner Image */}
          <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={currentBanner.image_url || 'https://via.placeholder.com/800x400?text=No+Image'}
              alt={currentBanner.text}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Party Badge */}
          <div className="flex items-center gap-2">
            <Badge
              style={{ backgroundColor: currentBanner.party.color, color: 'white' }}
              className="text-sm px-3 py-1"
            >
              {currentBanner.party.name}
            </Badge>
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

          {/* Banner Text */}
          <div className="space-y-2">
            <Label htmlFor="text">현수막 문구</Label>
            {isEditing ? (
              <Input
                id="text"
                value={currentBanner.text}
                onChange={(e) =>
                  setEditedBanner({ ...currentBanner, text: e.target.value })
                }
                placeholder="현수막에 표시될 문구를 입력하세요"
              />
            ) : (
              <p className="text-lg font-medium text-gray-900">{currentBanner.text}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              설치 주소
            </Label>
            {isEditing ? (
              <Input
                id="address"
                value={currentBanner.address}
                onChange={(e) =>
                  setEditedBanner({ ...currentBanner, address: e.target.value })
                }
                placeholder="주소를 입력하세요"
              />
            ) : (
              <p className="text-gray-700">{currentBanner.address}</p>
            )}
            {currentBanner.administrative_district && (
              <p className="text-sm text-gray-500">
                행정동: {currentBanner.administrative_district}
              </p>
            )}
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">위도</Label>
              <p className="text-sm text-gray-900">{currentBanner.lat}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">경도</Label>
              <p className="text-sm text-gray-900">{currentBanner.lng}</p>
            </div>
          </div>

          {/* Dates */}
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
                  value={currentBanner.start_date}
                  onChange={(e) =>
                    setEditedBanner({ ...currentBanner, start_date: e.target.value })
                  }
                />
              ) : (
                <p className="text-gray-700">{currentBanner.start_date}</p>
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
                  value={currentBanner.end_date}
                  onChange={(e) =>
                    setEditedBanner({ ...currentBanner, end_date: e.target.value })
                  }
                />
              ) : (
                <p className="text-gray-700">{currentBanner.end_date}</p>
              )}
            </div>
          </div>

          {/* Memo */}
          {(isEditing || currentBanner.memo) && (
            <div className="space-y-2">
              <Label htmlFor="memo">메모</Label>
              {isEditing ? (
                <Textarea
                  id="memo"
                  value={currentBanner.memo || ''}
                  onChange={(e) =>
                    setEditedBanner({ ...currentBanner, memo: e.target.value })
                  }
                  placeholder="메모를 입력하세요"
                  rows={3}
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {currentBanner.memo || '-'}
                </p>
              )}
            </div>
          )}

          {/* Created/Updated Info */}
          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500 space-y-1">
            <p>등록일: {currentBanner.created_at ? new Date(currentBanner.created_at).toLocaleString() : '-'}</p>
            <p>수정일: {currentBanner.updated_at ? new Date(currentBanner.updated_at).toLocaleString() : '-'}</p>
          </div>
        </div>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
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
