import { 
  pgTable, 
  uuid, 
  text, 
  integer, 
  boolean, 
  decimal, 
  timestamp, 
  primaryKey, 
  unique, 
  index 
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// 1. Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  supabaseUserId: text('supabase_user_id').unique().notNull(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  branch: text('branch').notNull(), // branch for students, department for educators
  semester: integer('semester'), // Nullable for educators or alumni
  regulation: text('regulation'), // Nullable for educators
  rollNumber: text('roll_number'),
  role: text('role', { enum: ['student', 'educator', 'admin'] }).default('student').notNull(),
  studentType: text('student_type'), // 'current' or 'alumni' for students
  graduationYear: integer('graduation_year'), // for alumni
  designation: text('designation'), // for educators e.g. 'Assistant Professor'
  employeeId: text('employee_id'), // optional employee id for educators
  photoUrl: text('photo_url'),
  totalUploads: integer('total_uploads').default(0).notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// 2. Materials Table
export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  regulation: text('regulation').notNull(),
  branch: text('branch').notNull(),
  semester: integer('semester').notNull(),
  materialType: text('material_type').notNull(),
  facultyName: text('faculty_name'),
  academicYear: text('academic_year'),
  description: text('description'),
  tags: text('tags').array(), // Text array for tags
  s3Key: text('s3_key').notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  uploaderName: text('uploader_name').notNull(),
  downloadCount: integer('download_count').default(0).notNull(),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0.00').notNull(),
  totalRatings: integer('total_ratings').default(0).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  isReported: boolean('is_reported').default(false).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  regulationIdx: index('idx_materials_regulation').on(table.regulation),
  branchIdx: index('idx_materials_branch').on(table.branch),
  semesterIdx: index('idx_materials_semester').on(table.semester),
  typeIdx: index('idx_materials_type').on(table.materialType),
  uploadedByIdx: index('idx_materials_uploaded_by').on(table.uploadedBy),
}));

// 3. Ratings Table
export const ratings = pgTable('ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  materialId: uuid('material_id').references(() => materials.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(), // CHECK (rating BETWEEN 1 AND 5) on app level
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  uniqueMaterialUser: unique('unique_material_user_rating').on(table.materialId, table.userId)
}));

// 4. Comments Table
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  materialId: uuid('material_id').references(() => materials.id, { onDelete: 'cascade' }).notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  text: text('text').notNull(),
  parentCommentId: uuid('parent_comment_id').references((): any => comments.id, { onDelete: 'cascade' }),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// 5. Saved Materials (Bookmarks)
export const savedMaterials = pgTable('saved_materials', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  materialId: uuid('material_id').references(() => materials.id, { onDelete: 'cascade' }).notNull(),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.materialId] })
}));

// 6. Notifications Table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'new_material' | 'comment_reply' | 'rating' | 'announcement'
  message: text('message').notNull(),
  link: text('link'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userReadIdx: index('idx_notifications_user').on(table.userId, table.isRead)
}));

// 7. Reports Table
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  materialId: uuid('material_id').references(() => materials.id, { onDelete: 'cascade' }).notNull(),
  reportedBy: uuid('reported_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reason: text('reason').notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'resolved'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// 8. Rejected Upload Logs Table
export const rejectedUploads = pgTable('rejected_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  supabaseUserId: text('supabase_user_id').notNull(),
  uploaderName: text('uploader_name'),
  originalFilename: text('original_filename'),
  rejectionReason: text('rejection_reason').notNull(),
  pageCount: integer('page_count'),
  extractedTextLength: integer('extracted_text_length'),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }).defaultNow().notNull()
});

// 9. Announcements Table
export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// 10. Interview Experiences Table
export const interviewExperiences = pgTable('interview_experiences', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  company: text('company').notNull(),
  role: text('role').notNull(),
  year: integer('year'),
  experience: text('experience').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Relations Definition for queries
export const usersRelations = relations(users, ({ many }) => ({
  materials: many(materials),
  ratings: many(ratings),
  comments: many(comments),
  bookmarks: many(savedMaterials),
  notifications: many(notifications),
  reports: many(reports),
  announcements: many(announcements),
  interviewExperiences: many(interviewExperiences)
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  uploader: one(users, {
    fields: [materials.uploadedBy],
    references: [users.id]
  }),
  ratings: many(ratings),
  comments: many(comments),
  bookmarks: many(savedMaterials),
  reports: many(reports)
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  material: one(materials, {
    fields: [ratings.materialId],
    references: [materials.id]
  }),
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id]
  })
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  material: one(materials, {
    fields: [comments.materialId],
    references: [materials.id]
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id]
  }),
  parent: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
    relationName: 'commentReplies'
  }),
  replies: many(comments, {
    relationName: 'commentReplies'
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  material: one(materials, {
    fields: [reports.materialId],
    references: [materials.id]
  }),
  reporter: one(users, {
    fields: [reports.reportedBy],
    references: [users.id]
  })
}));

export const savedMaterialsRelations = relations(savedMaterials, ({ one }) => ({
  user: one(users, {
    fields: [savedMaterials.userId],
    references: [users.id]
  }),
  material: one(materials, {
    fields: [savedMaterials.materialId],
    references: [materials.id]
  })
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  creator: one(users, {
    fields: [announcements.createdBy],
    references: [users.id]
  })
}));

export const interviewExperiencesRelations = relations(interviewExperiences, ({ one }) => ({
  author: one(users, {
    fields: [interviewExperiences.authorId],
    references: [users.id]
  })
}));
