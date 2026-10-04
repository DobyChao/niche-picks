'use client';

import { useState, useEffect } from 'react';
import { addReview, updateReview } from '@/lib/db';
import type { MergedReview } from '@/lib/types';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import StarRating from '@/components/ui/StarRating';

interface ReviewFormProps {
  shopId: string;
  review?: MergedReview;
  onSubmit?: () => void;
  onCancel?: () => void;
}

interface FormErrors {
  rating?: string;
  content?: string;
  general?: string;
}

export default function ReviewForm({ shopId, review, onSubmit, onCancel }: ReviewFormProps) {
  const isEditing = !!review;

  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (review) {
      setRating(review.rating);
      setContent(review.content ?? '');
      setAuthor(review.author ?? '');
      setAvgPrice(review.avgPrice?.toString() ?? '');
      setVisitDate(review.visitDate ?? '');
      setTagsInput(review.tags?.join(', ') ?? '');
    }
  }, [review]);

  function validate(): FormErrors {
    const newErrors: FormErrors = {};
    if (rating < 0 || rating > 5) newErrors.rating = '评分必须在 0-5 之间';
    if (!content.trim()) newErrors.content = '点评内容不能为空';
    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const tags = tagsInput.split(/[,，]/).map((t) => t.trim()).filter((t) => t.length > 0);
      const reviewData = {
        shopId,
        rating,
        content: content.trim(),
        author: author.trim() || undefined,
        avgPrice: avgPrice ? Number(avgPrice) : null,
        visitDate: visitDate || null,
        tags: tags.length > 0 ? tags : [],
        updatedAt: new Date().toISOString(),
      };

      if (isEditing && review) {
        await updateReview(review.id, reviewData);
      } else {
        await addReview({ ...reviewData, createdAt: new Date().toISOString() } as any);
      }

      onSubmit?.();
    } catch (err) {
      setErrors({ general: `保存失败: ${err instanceof Error ? err.message : '未知错误'}` });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {errors.general && <Toast variant="error">✕ {errors.general}</Toast>}

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          评分 <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <StarRating rating={rating} size="md" />
          <span className="text-lg font-semibold text-foreground tabular-nums">{rating.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full mt-2"
        />
        {errors.rating && <p className="mt-1 text-xs text-red-600">{errors.rating}</p>}
      </div>

      <Textarea
        id="review-content"
        label="点评内容 *"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="分享你的体验..."
        rows={3}
        error={errors.content}
      />

      <Input id="review-author" label="作者" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="你的名字" />

      <div className="grid grid-cols-2 gap-3">
        <Input id="review-price" label="人均消费 (¥)" type="number" step="any" value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} placeholder="如：80" />
        <Input id="review-date" label="到访日期" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
      </div>

      <Input id="review-tags" label="标签" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="用逗号分隔，如：环境好, 值得推荐" />

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? '保存中...' : isEditing ? '更新点评' : '提交点评'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            取消
          </Button>
        )}
      </div>
    </form>
  );
}
