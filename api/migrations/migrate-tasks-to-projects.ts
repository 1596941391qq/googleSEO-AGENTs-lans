// Migration script: Migrate old execution_tasks to the new Project/Keyword/Draft system
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { 
  sql, 
  initContentManagementTables, 
  createOrGetProject, 
  createOrGetKeyword, 
  saveContentDraft,
  saveImages
} from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    // 权限校验 (Admin only recommended, but here we'll allow authenticated users to migrate their own)
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }
    const userId = authResult.userId;

    await initContentManagementTables();

    // 1. Get all completed article-generator tasks for this user
    const tasksResult = await sql`
      SELECT * FROM execution_tasks
      WHERE user_id::text = ${userId.toString()}
      AND type = 'article-generator'
      AND status = 'completed'
    `;

    const tasks = tasksResult.rows;
    let migratedCount = 0;

    for (const task of tasks) {
      const state = typeof task.state === 'string' ? JSON.parse(task.state) : task.state;
      const params = typeof task.params === 'string' ? JSON.parse(task.params) : task.params;
      
      const finalArticle = state?.finalArticle;
      if (!finalArticle) continue;

      const keyword = params?.keyword || state?.keyword || 'Unknown Keyword';
      const projectName = `Migrated: ${keyword}`;
      const targetLanguage = params?.targetLanguage || 'en';

      // Create project
      const project = await createOrGetProject(userId, projectName, keyword, targetLanguage);

      // Create keyword
      const keywordRecord = await createOrGetKeyword(
        project.id,
        keyword,
        undefined,
        'Informational',
        undefined,
        undefined
      );

      // Check if draft already exists to avoid duplicates
      const existingDraft = await sql`
        SELECT id FROM content_drafts
        WHERE project_id = ${project.id} AND keyword_id = ${keywordRecord.id}
        LIMIT 1
      `;

      if (existingDraft.rows.length === 0) {
        // Save draft
        const draft = await saveContentDraft(
          project.id,
          keywordRecord.id,
          finalArticle.title || keyword,
          finalArticle.content || finalArticle.article_body || '',
          finalArticle.seo_meta?.description || '',
          undefined,
          finalArticle.qualityReview?.total_score || 0
        );

        // Save images
        if (finalArticle.images && Array.isArray(finalArticle.images)) {
          await saveImages(
            draft.id,
            finalArticle.images.map((img: any, idx: number) => ({
              imageUrl: img.url,
              prompt: img.prompt,
              altText: img.prompt,
              position: idx,
              metadata: { isScreenshot: img.isScreenshot || false }
            }))
          );
        }
        migratedCount++;
      }
    }

    return res.json({
      success: true,
      data: {
        totalTasks: tasks.length,
        migratedCount,
        message: `Successfully migrated ${migratedCount} tasks to the new project system.`
      },
    });
  } catch (error: any) {
    console.error('[Migration] Error:', error);
    return sendErrorResponse(res, error, 'Migration failed', 500);
  }
}
