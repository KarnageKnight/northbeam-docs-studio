import { and, desc, eq } from 'drizzle-orm'
import type { PublicDetail, PublicSummary, VersionDetail, VersionSummary, WriterSummary } from '../../../shared/types/articles'
import { db } from '../../db/client'
import { articles, articleVersions } from '../../db/schema'
import { toWriterArticle } from './toWriterArticle'

export async function listWriterArticles(): Promise<WriterSummary[]> {
  const rows = await db.select({
    id: articles.id, slug: articles.slug, title: articles.draftTitle, status: articles.status,
  }).from(articles)
  return rows.map((row) => ({ ...row, status: row.status as WriterSummary['status'] }))
}

export async function getWriterArticle(id: string) {
  const [article] = await db.select().from(articles).where(eq(articles.id, id))
  return article ? toWriterArticle(article) : null
}

export async function getWriterArticleBySlug(slug: string) {
  const [article] = await db.select().from(articles).where(eq(articles.slug, slug))
  return article ? toWriterArticle(article) : null
}

export async function listPublicArticles(): Promise<PublicSummary[]> {
  const rows = await db.select({
    slug: articles.slug, title: articleVersions.title, tags: articleVersions.tags, publishedAt: articles.publishedAt,
  }).from(articles).innerJoin(articleVersions, and(
    eq(articles.id, articleVersions.articleId), eq(articles.currentPublishedVersionId, articleVersions.id),
  )).where(eq(articles.status, 'published'))
  return rows.map((row) => ({ ...row, publishedAt: row.publishedAt!.toISOString() }))
}

export async function getPublicArticle(slug: string): Promise<PublicDetail | null> {
  const [article] = await db.select({
    slug: articles.slug, title: articleVersions.title, body: articleVersions.body,
    tags: articleVersions.tags, publishedAt: articles.publishedAt,
  }).from(articles).innerJoin(articleVersions, and(
    eq(articles.id, articleVersions.articleId), eq(articles.currentPublishedVersionId, articleVersions.id),
  )).where(and(eq(articles.status, 'published'), eq(articles.slug, slug)))
  return article ? { ...article, publishedAt: article.publishedAt!.toISOString() } : null
}

export function listArticleVersions(articleId: string): Promise<VersionSummary[]> {
  return db.select({ id: articleVersions.id, versionNumber: articleVersions.versionNumber })
    .from(articleVersions).where(eq(articleVersions.articleId, articleId))
    .orderBy(desc(articleVersions.versionNumber))
}

export async function getArticleVersion(articleId: string, versionId: string): Promise<VersionDetail | null> {
  const [version] = await db.select({
    id: articleVersions.id, versionNumber: articleVersions.versionNumber,
    title: articleVersions.title, body: articleVersions.body, tags: articleVersions.tags,
  }).from(articleVersions).where(and(eq(articleVersions.articleId, articleId), eq(articleVersions.id, versionId)))
  return version ?? null
}
