import { sql } from 'drizzle-orm'
import { check, foreignKey, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import type { PgTableExtraConfigValue } from 'drizzle-orm/pg-core'

export const articles = pgTable('articles', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull(),
  status: text('status').notNull().default('draft'),
  draftTitle: text('draft_title').notNull(),
  draftBody: text('draft_body').notNull().default(''),
  draftTags: text('draft_tags').array().notNull().default(sql`'{}'::text[]`),
  revision: integer('revision').notNull().default(0),
  nextVersionNumber: integer('next_version_number').notNull().default(1),
  currentPublishedVersionId: uuid('current_published_version_id'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table): PgTableExtraConfigValue[] => [
  unique('articles_slug_unique').on(table.slug),
  check('articles_status_check', sql`${table.status} IN ('draft', 'published', 'unpublished')`),
  foreignKey({
    name: 'articles_published_version_fk',
    columns: [table.id, table.currentPublishedVersionId],
    foreignColumns: [articleVersions.articleId, articleVersions.id],
  }).onDelete('restrict'),
])

export const articleVersions = pgTable('article_versions', {
  id: uuid('id').primaryKey(),
  articleId: uuid('article_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  tags: text('tags').array().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table): PgTableExtraConfigValue[] => [
  unique('article_versions_number_unique').on(table.articleId, table.versionNumber),
  unique('article_versions_owner_id_unique').on(table.articleId, table.id),
  foreignKey({
    name: 'article_versions_article_fk',
    columns: [table.articleId],
    foreignColumns: [articles.id],
  }).onDelete('restrict'),
])
