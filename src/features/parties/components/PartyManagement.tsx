'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useParties, usePartyActions } from '@/store/party.store';
import { Party, PartyCreateInput } from '@/types/party';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface PartyManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PartyManagement({ open, onOpenChange }: PartyManagementProps) {
  const parties = useParties();
  const { setParties, addParty, updateParty, removeParty } = usePartyActions();
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [formData, setFormData] = useState<PartyCreateInput>({
    name: '',
    color: '#1D4ED8',
    is_active: true,
  });

  // Fetch parties when dialog opens
  useEffect(() => {
    if (open) {
      fetchParties();
    }
  }, [open]);

  const fetchParties = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/parties');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setParties(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch parties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('정당명을 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      if (editingId) {
        // Update existing party
        const response = await fetch(`/api/parties/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            updateParty(editingId, result.data);
            resetForm();
          }
        } else {
          const error = await response.json();
          alert(error.error || '정당 수정에 실패했습니다.');
        }
      } else {
        // Create new party
        const response = await fetch('/api/parties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            addParty(result.data);
            resetForm();
          }
        } else {
          const error = await response.json();
          alert(error.error || '정당 등록에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Failed to save party:', error);
      alert('정당 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (party: Party) => {
    setEditingId(party.id);
    setFormData({
      name: party.name,
      color: party.color,
      marker_icon_url: party.marker_icon_url,
      is_active: party.is_active,
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 정당을 완전히 삭제하시겠습니까?\n연관된 현수막도 함께 영향을 받을 수 있습니다.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/parties/${id}?hard=true`, {
        method: 'DELETE',
      });

      if (response.ok) {
        removeParty(id);
      } else {
        const error = await response.json();
        alert(error.error || '정당 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete party:', error);
      alert('정당 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#1D4ED8',
      is_active: true,
    });
    setEditingId(null);
    setIsAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">정당 관리</DialogTitle>
          <DialogDescription>
            정당 정보를 추가, 수정, 삭제할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add/Edit Form */}
          {isAdding && (
            <Card className="border-2 border-indigo-200 bg-indigo-50/50">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">
                      {editingId ? '정당 수정' : '새 정당 추가'}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetForm}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">정당명 *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="예: 더불어민주당"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="color">대표 색상 *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="color"
                          type="color"
                          value={formData.color}
                          onChange={(e) =>
                            setFormData({ ...formData, color: e.target.value })
                          }
                          className="w-20 h-10"
                          required
                        />
                        <Input
                          type="text"
                          value={formData.color}
                          onChange={(e) =>
                            setFormData({ ...formData, color: e.target.value })
                          }
                          placeholder="#1D4ED8"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marker_icon_url">마커 아이콘 URL (선택)</Label>
                    <Input
                      id="marker_icon_url"
                      value={formData.marker_icon_url || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          marker_icon_url: e.target.value,
                        })
                      }
                      placeholder="https://example.com/icon.png"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({ ...formData, is_active: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      활성 상태
                    </Label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {editingId ? '수정 완료' : '추가'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                    >
                      취소
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Add Button */}
          {!isAdding && (
            <Button
              onClick={() => setIsAdding(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              새 정당 추가
            </Button>
          )}

          {/* Party List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">
              등록된 정당 ({parties.length}개)
            </h3>

            {isLoading && parties.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                로딩 중...
              </div>
            ) : parties.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                등록된 정당이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {parties.map((party) => (
                  <Card
                    key={party.id}
                    className={`transition-all ${
                      editingId === party.id ? 'ring-2 ring-indigo-500' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-8 h-8 rounded-full border-2 border-gray-200"
                            style={{ backgroundColor: party.color }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">
                                {party.name}
                              </h4>
                              {party.is_active ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                  활성
                                </Badge>
                              ) : (
                                <Badge variant="secondary">비활성</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {party.color}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(party)}
                            disabled={isLoading}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(party.id, party.name)}
                            disabled={isLoading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
