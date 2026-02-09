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
import { useAuth } from '@/contexts/AuthContext';
import { PLACEHOLDER_IMAGES } from '@/lib/utils/placeholder';

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
      // Create FormData
      const formData = new FormData();

      formData.append('banner_type', editedBanner.banner_type);
      formData.append('text', editedBanner.text);
      formData.append('address', editedBanner.address);
      if (editedBanner.start_date) formData.append('start_date', editedBanner.start_date);
      if (editedBanner.end_date) formData.append('end_date', editedBanner.end_date);
      if (editedBanner.banner_type === 'public' && editedBanner.department) {
        formData.append('department', editedBanner.department);
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
          // Update local state with server response
          updateBanner(editedBanner.id, result.data);
          setIsEditing(false);
          setEditedBanner(null);
          onOpenChange(false);

          // Refresh the page to show updated data
          window.location.reload();
        } else {
          alert('???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎: ' + result.error);
        }
      } else {
        const result = await response.json();
        alert('???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎: ' + (result.error || '?????녿뒗 ?ㅻ쪟'));
      }
    } catch (error) {
      console.error('Failed to update banner:', error);
      alert('???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentBanner = isEditing ? editedBanner! : banner;
  const isExpired = currentBanner.banner_type !== 'rally' && !!currentBanner.end_date && new Date(currentBanner.end_date) < new Date();
  const bannerTypeLabel = currentBanner.banner_type === 'political' ? 'Political' : currentBanner.banner_type === 'public' ? 'Public' : 'Rally';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {isEditing ? 'Edit Banner' : 'Banner Details'}
            </DialogTitle>
            {!isEditing && hasPermission('banners', 'update') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Banner Image */}
          <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={currentBanner.image_url || PLACEHOLDER_IMAGES.bannerLarge}
              alt={currentBanner.text}
              className="w-full h-full object-contain"
            />
          </div>

                    {/* Party Badge */}
          <div className="flex items-center gap-2">
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
                Expired
              </Badge>
            )}
            {!currentBanner.is_active && (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                Inactive
              </Badge>
            )}
          </div>

          {/* Banner Text */}
          <div className="space-y-2">
            <Label htmlFor="text">Banner Text</Label>
            {isEditing ? (
              <Input
                id="text"
                value={currentBanner.text}
                onChange={(e) =>
                  setEditedBanner({ ...currentBanner, text: e.target.value })
                }
                placeholder="Enter banner text"
              />
            ) : (
              <p className="text-lg font-medium text-gray-900">{currentBanner.text}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address
            </Label>
            {isEditing ? (
              <Input
                id="address"
                value={currentBanner.address}
                onChange={(e) =>
                  setEditedBanner({ ...currentBanner, address: e.target.value })
                }
                placeholder="Enter address"
              />
            ) : (
              <p className="text-gray-700">{currentBanner.address}</p>
            )}
            {currentBanner.administrative_district && (
              <p className="text-sm text-gray-500">
                District: {currentBanner.administrative_district}
              </p>
            )}
          </div>


          {/* Department */}
          {currentBanner.banner_type === 'public' && (
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              {isEditing ? (
                <Input
                  id="department"
                  value={currentBanner.department || ''}
                  onChange={(e) =>
                    setEditedBanner({ ...currentBanner, department: e.target.value })
                  }
                />
              ) : (
                <p className="text-gray-700">{currentBanner.department || '-'}</p>
              )}
            </div>
          )}

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Latitude</Label>
              <p className="text-sm text-gray-900">{currentBanner.lat}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Longitude</Label>
              <p className="text-sm text-gray-900">{currentBanner.lng}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Start Date
              </Label>
              {isEditing ? (
                <Input
                  id="start_date"
                  type="date"
                  value={currentBanner.start_date || ''}
                  onChange={(e) =>
                    setEditedBanner({ ...currentBanner, start_date: e.target.value })
                  }
                />
              ) : (
                <p className="text-gray-700">{currentBanner.start_date || '-'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                End Date
              </Label>
              {isEditing ? (
                <Input
                  id="end_date"
                  type="date"
                  value={currentBanner.end_date || ''}
                  onChange={(e) =>
                    setEditedBanner({ ...currentBanner, end_date: e.target.value })
                  }
                />
              ) : (
                <p className="text-gray-700">{currentBanner.end_date || '-'}</p>
              )}
            </div>
          </div>

          {/* Memo */}
          {(isEditing || currentBanner.memo) && (
            <div className="space-y-2">
              <Label htmlFor="memo">Memo</Label>
              {isEditing ? (
                <Textarea
                  id="memo"
                  value={currentBanner.memo || ''}
                  onChange={(e) =>
                    setEditedBanner({ ...currentBanner, memo: e.target.value })
                  }
                  placeholder="Enter memo"
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
            <p>Created: {currentBanner.created_at ? new Date(currentBanner.created_at).toLocaleString() : '-'}</p>
            <p>Updated: {currentBanner.updated_at ? new Date(currentBanner.updated_at).toLocaleString() : '-'}</p>
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
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}









