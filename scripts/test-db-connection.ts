#!/usr/bin/env tsx
/**
 * Test database connection and verify which database is being used
 */

import { sql } from '../api/lib/database';

async function testConnection() {
    console.log('\n=== Testing Database Connection ===\n');

    try {
        // Test basic connection
        const result = await sql`SELECT 
      current_database() as db_name,
      current_user as db_user,
      inet_server_addr() as server_ip,
      inet_server_port() as server_port,
      version() as pg_version
    `;

        const info = result.rows[0];

        console.log('✅ Database connection successful!\n');
        console.log('Connection Details:');
        console.log('  Database:', info.db_name);
        console.log('  User:', info.db_user);
        console.log('  Server IP:', info.server_ip || 'localhost (Unix socket)');
        console.log('  Server Port:', info.server_port);
        console.log('  PostgreSQL Version:', info.pg_version.split(' ')[0], info.pg_version.split(' ')[1]);

        // Check if it's local or remote
        const isLocal = !info.server_ip ||
            info.server_ip === '127.0.0.1' ||
            info.server_ip === '::1' ||
            info.server_ip.startsWith('192.168.') ||
            info.server_ip.startsWith('10.');

        console.log('\n🔍 Connection Type:', isLocal ? '🏠 LOCAL DATABASE' : '☁️  REMOTE DATABASE');

        // Test query performance
        const start = Date.now();
        await sql`SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'`;
        const duration = Date.now() - start;

        console.log(`\n⚡ Query Performance: ${duration}ms`);

        if (duration > 100) {
            console.log('⚠️  Warning: Query is slow. You might still be using remote database.');
        } else {
            console.log('✨ Query is fast! Local database is working well.');
        }

    } catch (error: any) {
        console.error('❌ Database connection failed:', error.message);
        console.error('\nEnvironment variables:');
        console.error('  DATABASE_URL:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@'));
        console.error('  POSTGRES_URL:', process.env.POSTGRES_URL?.replace(/:([^:@]+)@/, ':****@'));
        process.exit(1);
    }
}

testConnection();
