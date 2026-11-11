import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
// Domain records stay separate so private conversations never become public feed data.
export const records = sqliteTable('records', {
  kind: text('kind').notNull(), id: text('id').notNull(),
  owner: text('owner'), job: text('job'), applicant: text('applicant'),
  status: text('status'), at: text('at'), search: text('search'), data: text('data').notNull(),
}, t => [primaryKey({columns:[t.kind,t.id]}), index('records_owner').on(t.kind,t.owner),
  index('records_job').on(t.kind,t.job), index('records_applicant').on(t.kind,t.applicant),
  index('records_feed').on(t.kind,t.status,t.at)]);
export const revisions = sqliteTable('revisions', {
  id: text('id').primaryKey(), revision: integer('revision').notNull().default(0),
  token: text('token').notNull().default(''),
});
