import { decryptToken } from '../api/lib/database.js';

const tokens = [
    { name: 'GITHUB1', encrypted: 'Z2hwX0VLMFVQblFMWW1o' },
    { name: 'Primary Token (ylyy)', encrypted: 'Z2hwXzhpWW1WUms2QXNR' },
    { name: 'Correct GitHub 2423818852', encrypted: 'eGl4aWRlaml1eW91Z2hw' }
];

console.log('Checking tokens...');
console.log('\nDecrypting tokens from database:');

// Just show the base64 decoded values to compare
tokens.forEach(t => {
    try {
        const decoded = Buffer.from(t.encrypted, 'base64').toString('utf-8');
        console.log(`\n${t.name}:`);
        console.log(`  Encrypted: ${t.encrypted}`);
        console.log(`  Decoded: ${decoded.substring(0, 50)}...`);
    } catch (err) {
        console.error(`Error decoding ${t.name}:`, err.message);
    }
});
