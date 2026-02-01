import { updatePlatformSiteStatus } from '../api/lib/database.js';

async function main() {
    const siteId = '98e32922-0bc8-4f30-b03e-b4c2bd18f1bd';

    console.log('[Reset Site Status] Resetting site to pending...');

    try {
        const result = await updatePlatformSiteStatus(siteId, 'pending');

        if (result) {
            console.log('[Reset Site Status] ✅ Success!');
            console.log('[Reset Site Status] Site ID:', result.id);
            console.log('[Reset Site Status] Platform:', result.platform);
            console.log('[Reset Site Status] Status:', result.status);
            console.log('[Reset Site Status] Project ID:', result.platform_project_id);
        } else {
            console.error('[Reset Site Status] ❌ Site not found');
        }
    } catch (error: any) {
        console.error('[Reset Site Status] ❌ Error:', error.message);
    }
}

main();
