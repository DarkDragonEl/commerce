import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { ArrowLeft } from 'lucide-react';

const blogSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
});

type BlogFormData = z.infer<typeof blogSchema>;

export default function BlogForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BlogFormData>({
    resolver: zodResolver(blogSchema),
    defaultValues: {
      status: 'DRAFT',
    },
  });

  const title = watch('title');

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  useEffect(() => {
    if (!id && title) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setValue('slug', slug);
    }
  }, [title, id, setValue]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const post = await api.getBlogPost(id!);
      reset(post);
    } catch (error) {
      console.error('Failed to fetch post:', error);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: BlogFormData) => {
    setError('');

    try {
      const postData = {
        ...data,
        authorId: user?.id,
        publishedAt: data.status === 'PUBLISHED' ? new Date().toISOString() : undefined,
      };

      if (id) {
        await api.updateBlogPost(id, postData);
      } else {
        await api.createBlogPost(postData);
      }
      navigate('/blog');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save post');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate('/blog')}
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Blog
      </button>

      <h1 className="text-3xl font-bold mb-6">{id ? 'Edit Post' : 'New Post'}</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              {...register('title')}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
            />
            {errors.title && (
              <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <input
              {...register('slug')}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
            />
            {errors.slug && (
              <p className="text-red-600 text-sm mt-1">{errors.slug.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Excerpt</label>
            <textarea
              {...register('excerpt')}
              rows={2}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Content *</label>
            <textarea
              {...register('content')}
              rows={15}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            />
            {errors.content && (
              <p className="text-red-600 text-sm mt-1">{errors.content.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status *</label>
            <select
              {...register('status')}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/blog')}
              className="px-6 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Saving...' : id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
