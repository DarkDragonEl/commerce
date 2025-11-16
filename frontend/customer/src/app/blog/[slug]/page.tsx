'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { BlogPost } from '@/types';
import { ArrowLeft } from 'lucide-react';

export default function BlogPostPage() {
  const params = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await api.getBlogPost(params.slug as string);
        setPost(data);
      } catch (error) {
        console.error('Failed to fetch blog post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-200 h-10 w-3/4 mb-4 rounded animate-pulse" />
          <div className="bg-gray-200 h-6 w-1/4 mb-8 rounded animate-pulse" />
          <div className="space-y-4">
            <div className="bg-gray-200 h-4 rounded animate-pulse" />
            <div className="bg-gray-200 h-4 rounded animate-pulse" />
            <div className="bg-gray-200 h-4 w-5/6 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">Blog post not found</p>
        <Link href="/blog" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/blog"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Link>

        <article className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

          <p className="text-gray-600 mb-8">
            {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
          </p>

          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </div>
    </div>
  );
}
