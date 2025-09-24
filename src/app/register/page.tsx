'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, MapPin, Upload, ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Validation schema
const bannerFormSchema = z.object({
  text: z.string().min(1, '현수막 문구를 입력해주세요'),
  address: z.string().min(1, '주소를 입력해주세요'),
  party: z.string().min(1, '정당을 선택해주세요'),
  startDate: z.string().min(1, '시작일을 선택해주세요'),
  endDate: z.string().min(1, '종료일을 선택해주세요'),
  memo: z.string().optional(),
  image: z.any().optional(),
});

type BannerFormData = z.infer<typeof bannerFormSchema>;

// Mock parties data
const parties = [
  { id: '1', name: '더불어민주당', color: '#1D4ED8' },
  { id: '2', name: '국민의힘', color: '#DC2626' },
  { id: '3', name: '정의당', color: '#F59E0B' },
  { id: '4', name: '개혁신당', color: '#10B981' },
];

export default function BannerRegisterPage() {
  const router = useRouter();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BannerFormData>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: {
      text: '',
      address: '',
      party: '',
      startDate: '',
      endDate: '',
      memo: '',
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('image', file);
    }
  };

  const onSubmit = async (data: BannerFormData) => {
    setIsSubmitting(true);
    try {
      console.log('Form submitted:', data);
      // TODO: Implement actual submission logic
      // - Upload image to Supabase Storage
      // - Geocode address using Kakao Map API
      // - Save to database

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Redirect to dashboard after successful submission
      router.push('/');
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로가기
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">현수막 등록</h1>
              <p className="text-sm text-gray-500">새로운 현수막 정보를 등록합니다</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 py-8 max-w-4xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Form Fields */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">기본 정보</CardTitle>
                    <CardDescription>현수막의 기본 정보를 입력해주세요</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>현수막 문구</FormLabel>
                          <FormControl>
                            <Input placeholder="예: 함께 만드는 더 나은 미래" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="party"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>정당 선택</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="정당을 선택해주세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {parties.map((party) => (
                                <SelectItem key={party.id} value={party.name}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: party.color }}
                                    />
                                    {party.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>설치 주소</FormLabel>
                          <FormControl>
                            <Input placeholder="예: 서울시 강남구 역삼동 123-45" {...field} />
                          </FormControl>
                          <FormDescription>
                            정확한 주소를 입력하면 자동으로 좌표와 행정동이 추출됩니다
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">설치 기간</CardTitle>
                    <CardDescription>현수막 설치 시작일과 종료일을 선택해주세요</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>시작일</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>종료일</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">추가 정보</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="memo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>메모</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="추가적인 메모나 특이사항을 입력해주세요"
                              className="resize-none"
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Image Upload */}
              <div>
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">현수막 사진</CardTitle>
                    <CardDescription>현수막 사진을 업로드해주세요</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {previewImage ? (
                        <div className="space-y-4">
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={previewImage}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setPreviewImage(null);
                              form.setValue('image', undefined);
                            }}
                            className="w-full"
                          >
                            사진 다시 선택
                          </Button>
                        </div>
                      ) : (
                        <div className="aspect-video bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center">
                          <Upload className="w-12 h-12 text-gray-400 mb-4" />
                          <p className="text-gray-600 font-medium mb-2">사진을 업로드하세요</p>
                          <p className="text-sm text-gray-500 mb-4">JPG, PNG 파일만 가능합니다</p>
                          <label htmlFor="image-upload">
                            <Button type="button" variant="outline" className="cursor-pointer">
                              파일 선택
                            </Button>
                            <input
                              id="image-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="mt-8">
                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '등록 중...' : '현수막 등록하기'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}