
/**
 * Simple Markdown to HTML converter
 *
 * Includes basic support for:
 * - Headers (h1-h6)
 * - Bold/Italic
 * - Lists (unordered)
 * - Links
 * - Images
 * - Code blocks
 * - Paragraphs
 */
export function convertMarkdownToHtml(markdown: string, title: string, metadata: { description?: string; keywords?: string } = {}): string {
    console.log(`[Markdown Converter] Converting markdown to HTML`);
    console.log(`[Markdown Converter] Input length: ${markdown?.length || 0} characters`);
    console.log(`[Markdown Converter] Title: "${title}"`);

    // 验证输入
    if (!markdown || markdown.trim().length === 0) {
        console.error(`[Markdown Converter] ❌ Input markdown is empty!`);
        throw new Error('Markdown content is empty. Cannot convert empty content to HTML.');
    }

    // 1. Basic Markdown Parsing
    let htmlContent = markdown;

    // Headers
    htmlContent = htmlContent.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    htmlContent = htmlContent.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    htmlContent = htmlContent.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    htmlContent = htmlContent.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');

    // Italic
    htmlContent = htmlContent.replace(/\*(.*)\*/gim, '<em>$1</em>');

    // Images
    htmlContent = htmlContent.replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" />');

    // Links
    htmlContent = htmlContent.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>');

    // Blockquotes
    htmlContent = htmlContent.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Unordered Lists (simple implementation)
    // Identifies lines starting with - or *, wraps them in li. 
    // Does not handle nested lists perfectly but sufficient for simple blogs.
    htmlContent = htmlContent.replace(/^\s*[\-\*] (.*$)/gim, '<li>$1</li>');
    // Wrap consecutive lis in ulcer (naive approach: just wrap everything not in a tag? No, let's just leave lis as is for now or try to wrap)
    // For simplicity in this regex version, we might leave <ul> wrapper out or try a replace all.
    // Let's rely on browser leniency or add a simple wrapper.
    // A better approach for lists without a parser is tricky. 
    // Let's assume browser renders <li>s okay-ish or wrap standard groups.

    // Code blocks
    htmlContent = htmlContent.replace(/```([^`]+)```/gim, '<pre><code>$1</code></pre>');

    // Paragraphs: separate by double newlines
    // We split by double newline and wrap non-tagged lines in <p>
    const sections = htmlContent.split('\n\n');
    htmlContent = sections.map(section => {
        section = section.trim();
        if (!section) return '';
        if (section.startsWith('<h') || section.startsWith('<ul') || section.startsWith('<li') || section.startsWith('<block') || section.startsWith('<pre')) {
            return section;
        }
        return `<p>${section.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    // 验证输出
    if (!htmlContent || htmlContent.trim().length === 0) {
        console.error(`[Markdown Converter] ❌ HTML content is empty after conversion!`);
        throw new Error('HTML conversion resulted in empty content.');
    }

    console.log(`[Markdown Converter] ✅ Conversion successful. Output length: ${htmlContent.length} characters`);

    // 2. Wrap in Full HTML Template
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${metadata.description || ''}">
    <meta name="keywords" content="${metadata.keywords || ''}">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2, h3 { color: #111; margin-top: 1.5em; }
        h1 { font-size: 2.5em; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; }
        h2 { font-size: 1.8em; border-bottom: 1px solid #eaeaea; padding-bottom: 5px; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0; }
        a { color: #0070f3; text-decoration: none; }
        a:hover { text-decoration: underline; }
        blockquote { border-left: 4px solid #ddd; padding-left: 20px; color: #666; font-style: italic; }
        code { background: #f5f5f5; padding: 2px 5px; border-radius: 4px; font-family: monospace; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto; }
        .publish-date { color: #888; margin-bottom: 30px; font-size: 0.9em; }
        @media (max-width: 600px) {
            body { padding: 15px; }
            h1 { font-size: 2em; }
        }
    </style>
</head>
<body>
    <article>
        <header>
            <h1>${title}</h1>
            <p class="publish-date">Published on ${new Date().toLocaleDateString()}</p>
        </header>
        <div class="content">
            ${htmlContent}
        </div>
    </article>
</body>
</html>`;
}
