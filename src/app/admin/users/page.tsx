'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Shield, User as UserIcon, RefreshCw } from 'lucide-react';
import { UserRole } from '@/types/auth';

interface UserData {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // 사용자 목록 가져오기
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Get Supabase session token
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert('로그인 세션이 만료되었습니다.');
        return;
      }

      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        setUsers(data.data);
        setFilteredUsers(data.data);
      } else {
        alert(data.error || '사용자 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert('사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 검색 처리
  useEffect(() => {
    if (search.trim()) {
      const filtered = users.filter(user =>
        user.email.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [search, users]);

  // 권한 변경
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const user = users.find(u => u.id === userId);
    const roleText = newRole === UserRole.ADMIN ? '관리자' : '일반 사용자';

    if (!confirm(`${user?.email}을(를) ${roleText}(으)로 변경하시겠습니까?`)) {
      return;
    }

    setIsUpdating(userId);
    try {
      // Get Supabase session token
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert('로그인 세션이 만료되었습니다.');
        return;
      }

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert('권한이 변경되었습니다.');
        fetchUsers(); // 새로고침
      } else {
        alert(data.error || '권한 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('권한 변경 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(null);
    }
  };

  // 통계 계산
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === UserRole.ADMIN).length,
    users: users.filter(u => u.role === UserRole.USER).length,
  };

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 사용자</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">관리자</p>
                <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">일반 사용자</p>
                <p className="text-2xl font-bold text-gray-900">{stats.users}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 사용자 목록 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>사용자 관리</CardTitle>
              <CardDescription>사용자 권한을 관리할 수 있습니다.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 검색 */}
          <div className="mb-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="이메일로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 테이블 */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">사용자 목록을 불러오는 중...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                {search ? '검색 결과가 없습니다.' : '사용자가 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      이메일
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      역할
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      가입일
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      최종 수정
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {user.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          variant={user.role === UserRole.ADMIN ? 'default' : 'secondary'}
                          className={
                            user.role === UserRole.ADMIN
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }
                        >
                          {user.role === UserRole.ADMIN ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              관리자
                            </>
                          ) : (
                            '일반 사용자'
                          )}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {new Date(user.updated_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {user.role === UserRole.ADMIN ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleChange(user.id, UserRole.USER)}
                            disabled={isUpdating === user.id}
                            className="text-gray-600"
                          >
                            {isUpdating === user.id ? '처리중...' : 'Admin 해제'}
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleRoleChange(user.id, UserRole.ADMIN)}
                            disabled={isUpdating === user.id}
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            {isUpdating === user.id ? '처리중...' : 'Admin 부여'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
