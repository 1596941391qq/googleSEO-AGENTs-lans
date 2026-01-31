#!/usr/bin/env tsx
/**
 * Test ThorData SERP API connection
 */

const THORDATA_API_TOKEN = process.env.THORDATA_API_TOKEN || '3802a36b781d24a4979a53c42fee5361';
const THORDATA_API_URL = 'https://scraperapi.thordata.com/request';

async function testThorDataAPI() {
    console.log('\n=== Testing ThorData SERP API ===\n');
    console.log('API URL:', THORDATA_API_URL);
    console.log('API Token:', THORDATA_API_TOKEN ? `${THORDATA_API_TOKEN.substring(0, 10)}...` : 'NOT SET');

    const testKeyword = 'best laptop 2024';
    console.log(`\nTest Keyword: "${testKeyword}"`);
    console.log('Starting request...\n');

    const formData = new URLSearchParams();
    formData.append('engine', 'google');
    formData.append('q', testKeyword);
    formData.append('json', '1');
    formData.append('gl', 'us');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const startTime = Date.now();

    try {
        const response = await fetch(THORDATA_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${THORDATA_API_TOKEN}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        console.log(`✅ Response received in ${duration}ms`);
        console.log(`Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`\n❌ API Error: ${response.status}`);
            console.error('Error details:', errorText.substring(0, 500));
            return;
        }

        const data = await response.json();

        // Extract results
        let results: any[] = [];
        if (data?.organic && Array.isArray(data.organic)) {
            results = data.organic;
        } else if (data?.data?.organic && Array.isArray(data.data.organic)) {
            results = data.data.organic;
        }

        console.log(`\n📊 Results: ${results.length} organic results found`);

        if (results.length > 0) {
            console.log('\nTop 3 Results:');
            results.slice(0, 3).forEach((result, index) => {
                console.log(`\n${index + 1}. ${result.title || 'No title'}`);
                console.log(`   URL: ${result.link || result.url || 'No URL'}`);
                console.log(`   Snippet: ${(result.description || result.snippet || 'No snippet').substring(0, 100)}...`);
            });
        } else {
            console.log('\n⚠️  No results found. Response structure:');
            console.log(JSON.stringify(data, null, 2).substring(0, 500));
        }

        console.log('\n✅ ThorData API is working correctly!');
        console.log(`⚡ Average response time: ${duration}ms`);

        if (duration > 10000) {
            console.log('\n⚠️  Warning: Response time is slow (>10s). This might cause delays in your analysis.');
        }

    } catch (error: any) {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        if (error.name === 'AbortError') {
            console.error(`\n❌ Request timeout after ${duration}ms (30s limit)`);
            console.error('This means ThorData API is too slow or not responding.');
        } else {
            console.error(`\n❌ Request failed after ${duration}ms`);
            console.error('Error:', error.message);
        }
    }
}

testThorDataAPI();
