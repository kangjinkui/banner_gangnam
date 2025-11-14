'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp({ email, password, name });
        setSuccess(true);
        setError('');
        // Show success message briefly
        setTimeout(() => {
          setIsSignUp(false);
          setSuccess(false);
          setPassword(''); // Clear password but keep email
        }, 2000);
      } else {
        await signIn({ email, password });
        // Reset form
        setEmail('');
        setPassword('');
        setName('');
        onOpenChange(false);
      }
    } catch (err: any) {
      // Handle email not confirmed error
      if (err.message?.includes('Email not confirmed')) {
        setError(
          '이메일 인증이 필요합니다.\n\n' +
          '개발 환경 해결 방법:\n' +
          '1. Supabase Dashboard → Authentication → Settings\n' +
          '2. "Enable email confirmations" 비활성화\n\n' +
          '또는 이메일에서 인증 링크를 클릭하세요.'
        );
      } else {
        setError(err.message || '오류가 발생했습니다.');
      }
    } finally {
      // ALWAYS reset loading state in finally block
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setSuccess(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSignUp ? (
              <>
                <UserPlus className="w-5 h-5" />
                회원가입
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                로그인
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isSignUp
              ? '새 계정을 생성하세요. 기본적으로 읽기 권한이 부여됩니다.'
              : '계정에 로그인하세요.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <AlertDescription>
                회원가입이 완료되었습니다! 이메일을 확인하여 인증을 완료해주세요.
              </AlertDescription>
            </Alert>
          )}

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">이름 (선택)</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
              />
            </div>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
            {isSignUp && (
              <p className="text-xs text-gray-500">최소 6자 이상 입력하세요</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
          </Button>

          <div className="text-center space-y-2">
            <Button
              type="button"
              variant="link"
              onClick={toggleMode}
              className="text-sm"
            >
              {isSignUp
                ? '이미 계정이 있으신가요? 로그인'
                : '계정이 없으신가요? 회원가입'}
            </Button>

            {!isSignUp && (
              <div>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    onOpenChange(false);
                    setIsForgotPasswordOpen(true);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  비밀번호를 잊으셨나요?
                </Button>
              </div>
            )}
          </div>
        </form>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p className="font-semibold mb-1">권한 안내:</p>
          <ul className="space-y-1">
            <li>• <strong>관리자</strong>: 모든 데이터 생성, 수정, 삭제 가능</li>
            <li>• <strong>일반 사용자</strong>: 데이터 조회만 가능</li>
          </ul>
        </div>
      </DialogContent>

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog
        open={isForgotPasswordOpen}
        onOpenChange={setIsForgotPasswordOpen}
      />
    </Dialog>
  );
}
