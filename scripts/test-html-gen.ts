import { convertMarkdownToHtml } from '../api/_shared/utils/markdown-converter.js';

const sampleMarkdown = `
# Hello World

This is a **test** article.

## Section 1

- Item A
- Item B

![Test Image](https://example.com/image.png)

[Link to Google](https://google.com)
`;

console.log('--- Input Markdown ---');
console.log(sampleMarkdown);

console.log('\n--- Converting... ---');
const html = convertMarkdownToHtml(sampleMarkdown, 'Test Title', {
    description: 'A test description',
    keywords: 'test, html, markdown'
});

console.log('\n--- Output HTML ---');
console.log(html);

console.log('\n--- Verification ---');
if (html.includes('<!DOCTYPE html>') && html.includes('<title>Test Title</title>')) {
    console.log('✅ HTML Structure is correct');
} else {
    console.error('❌ HTML Structure is missing');
}

if (html.includes('<strong>test</strong>')) {
    console.log('✅ Strong tag converted');
}
