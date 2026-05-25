'use client';

import { useState, useEffect } from 'react';
import { addReview, updateReview } from '@/lib/db';
import type { MergedReview } from '@/lib/types';

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
    if (rating < 1 || rating > 5) newErrors.rating = '评分必须在 1-5 之间';
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
      const tags = tagsInput
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

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
        await addReview({
          ...reviewData,
          createdAt: new Date().toISOString(),
        } as any);
      }

      onSubmit?.();
    } catch (err) {
      setErrors({
        general: `保存失败: ${err instanceof Error ? err.message : '未知错误'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {errors.general && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ✕ {errors.general}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          评分 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl transition-colors ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>
        {errors.rating && <p className="mt-1 text-xs text-red-600">{errors.rating}</p>}
      </div>

      <div>
        <label htmlFor="review-content" className="block text-sm font-medium text-gray-700 mb-1">
          点评内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="分享你的体验..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder-gray-400 resize-none
                     ${errors.content ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
        />
        {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content}</p>}
      </div>

      <div>
        <label htmlFor="review-author" className="block text-sm font-medium text-gray-700 mb-1">作者</label>
        <input
          id="review-author"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="你的名字"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder-gray-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="review-price" className="block text-sm font-medium text-gray-700 mb-1">人均消费 (¥)</label>
          <input
            id="review-price"
            type="number"
            step="any"
            value={avgPrice}
            onChange={(e) => setAvgPrice(e.target.value)}
            placeholder="如：80"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-400"
          />
        </div>
        <div>
          <label htmlFor="review-date" className="block text-sm font-medium text-gray-700 mb-1">到访日期</label>
          <input
            id="review-date"
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-400"
          />
        </div>
      </div>

      <div>
        <label htmlFor="review-tags" className="block text-sm font-medium text-gray-700 mb-1">标签</label>
        <input
          id="review-tags"
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="用逗号分隔，如：环境好, 值得推荐"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder-gray-400"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2 px-4 bg-orange-500 text-white font-medium rounded-lg
                     hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-200 text-sm"
        >
          {isSubmitting ? '保存中...' : isEditing ? '更新点评' : '提交点评'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
}
