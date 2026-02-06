'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setTempPassword(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '임시 비밀번호 발급에 실패했습니다.');
      }

      setSuccess(true);
      if (data.tempPassword) {
        setTempPassword(data.tempPassword);
      }
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess(false);
    setTempPassword(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            비밀번호 찾기
          </DialogTitle>
          <DialogDescription>
            등록된 이메일을 입력하시면 임시 비밀번호를 발급해드립니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {tempPassword ? (
                  <div className="space-y-2">
                    <p className="font-semibold">임시 비밀번호가 발급되었습니다!</p>
                    <div className="bg-white p-3 rounded border border-green-300">
                      <p className="text-sm text-gray-600 mb-1">임시 비밀번호:</p>
                      <p className="text-lg font-mono font-bold text-green-700 select-all">
                        {tempPassword}
                      </p>
                    </div>
                    <p className="text-sm">
                      위 임시 비밀번호로 로그인한 후, 반드시 비밀번호를 변경해주세요.
                    </p>
                    <p className="text-xs text-gray-600">
                      ※ 임시 비밀번호는 24시간 후 만료됩니다.
                    </p>
                  </div>
                ) : (
                  '등록된 이메일인 경우 임시 비밀번호가 발급되었습니다.'
                )}
              </AlertDescription>
            </Alert>
          )}

          {!success && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={loading}
              >
                {loading ? '처리 중...' : '임시 비밀번호 발급'}
              </Button>
            </>
          )}

          {success && (
            <Button
              type="button"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={handleClose}
            >
              확인
            </Button>
          )}
        </form>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p className="font-semibold mb-1">안내사항:</p>
          <ul className="space-y-1">
            <li>• 임시 비밀번호는 24시간 동안 유효합니다.</li>
            <li>• 로그인 후 반드시 비밀번호를 변경해주세요.</li>
            <li>• 임시 비밀번호는 1회만 사용 가능합니다.</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
