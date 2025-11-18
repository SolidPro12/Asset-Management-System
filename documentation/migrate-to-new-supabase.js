/**
 * Migration Helper Script
 * 
 * This script helps you migrate your Supabase database to a new project.
 * It reads all migration files and provides options to run them.
 * 
 * Usage:
 *   node migrate-to-new-supabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

// Get all migration files sorted by name (which includes timestamp)
function getMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found!');
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort alphabetically (which is also chronologically)

  return files;
}

// Display migration files
function displayMigrations() {
  const files = getMigrationFiles();
  
  console.log('\n📋 Migration Files Found:\n');
  console.log(`Total: ${files.length} migration files\n`);
  
  files.forEach((file, index) => {
    console.log(`${(index + 1).toString().padStart(3, ' ')}. ${file}`);
  });
  
  return files;
}

// Generate SQL script to combine all migrations
function generateCombinedSQL() {
  const files = getMigrationFiles();
  let combinedSQL = '-- Combined Migration Script\n';
  combinedSQL += `-- Generated: ${new Date().toISOString()}\n`;
  combinedSQL += `-- Total Migrations: ${files.length}\n\n`;
  combinedSQL += '-- ============================================\n';
  combinedSQL += '-- IMPORTANT: Run this in Supabase SQL Editor\n';
  combinedSQL += '-- ============================================\n\n';

  files.forEach((file, index) => {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    combinedSQL += `\n-- ============================================\n`;
    combinedSQL += `-- Migration ${index + 1}/${files.length}: ${file}\n`;
    combinedSQL += `-- ============================================\n\n`;
    combinedSQL += content;
    combinedSQL += '\n\n';
  });

  return combinedSQL;
}

// Save combined SQL to file
function saveCombinedSQL() {
  const combinedSQL = generateCombinedSQL();
  const outputPath = path.join(__dirname, 'combined-migration.sql');
  
  fs.writeFileSync(outputPath, combinedSQL, 'utf8');
  console.log(`\n✅ Combined migration file created: ${outputPath}`);
  console.log(`\n📝 You can now:\n`);
  console.log(`   1. Open ${outputPath}`);
  console.log(`   2. Copy its contents`);
  console.log(`   3. Paste into Supabase SQL Editor`);
  console.log(`   4. Run the query\n`);
}

// Main function
function main() {
  console.log('\n🚀 Supabase Migration Helper\n');
  console.log('='.repeat(50));
  
  const files = displayMigrations();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📌 Next Steps:\n');
  console.log('Option 1: Use Supabase CLI (Recommended)');
  console.log('  1. Install: npm install -g supabase');
  console.log('  2. Link: supabase link --project-ref YOUR_PROJECT_REF');
  console.log('  3. Push: supabase db push\n');
  
  console.log('Option 2: Use Supabase Dashboard');
  console.log('  1. Run this script to generate combined SQL');
  console.log('  2. Copy the generated SQL file');
  console.log('  3. Paste into Supabase SQL Editor\n');
  
  console.log('Would you like to generate a combined SQL file? (y/n)');
  console.log('(This will create combined-migration.sql in the project root)');
  
  // For automated use, generate the file
  saveCombinedSQL();
}

// Run if executed directly
main();

export { getMigrationFiles, generateCombinedSQL, saveCombinedSQL };

