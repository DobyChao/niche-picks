'use client';

import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';

export default function FeedbackPage() {
  const [nickname, setNickname] = useState('');
  const [contact, setContact] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), contact: contact.trim(), content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交失败');

      setMsg({ type: 'success', text: '感谢您的反馈！' });
      setNickname('');
      setContact('');
      setContent('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || '提交失败，请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 min-h-full lg:h-full flex flex-col gap-5">
      <PageHeader title="意见箱" description="欢迎提出您的建议和意见" />

      <div className="flex-1 flex items-start justify-center pt-4 lg:pt-8">
        <div className="w-full max-w-lg">
          <Card padding="lg" className="space-y-5">
            {msg && <Toast variant={msg.type === 'success' ? 'success' : 'error'}>{msg.text}</Toast>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="nickname"
                label="昵称（可选）"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="您的称呼"
              />

              <Input
                id="contact"
                label="联系方式（可选）"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="邮箱或其他联系方式"
              />

              <Textarea
                id="content"
                label="意见内容 *"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请写下您的建议或意见..."
                rows={5}
                required
              />

              <Button type="submit" disabled={submitting || !content.trim()} className="w-full">
                {submitting ? '提交中...' : '提交反馈'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
