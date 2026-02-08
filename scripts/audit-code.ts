/**
 * Comprehensive Code Audit Script
 *
 * This script performs deep analysis of the codebase to catch common TypeScript
 * errors, anti-patterns, and potential build issues before deployment.
 *
 * Based on industry best practices from:
 * - Google TypeScript Style Guide
 * - Airbnb JavaScript Style Guide
 * - Microsoft TypeScript Handbook
 * - Next.js Production Checklist
 *
 * Usage: npm run audit
 */

import * as fs from 'fs';
import * as path from 'path';

interface AuditResult {
  category: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
}

const results: AuditResult[] = [];

/**
 * Recursively get all TypeScript files in a directory
 */
function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, and other build directories
      if (!['node_modules', '.next', 'dist', 'build', '.git'].includes(file)) {
        getAllTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Check for duplicate property definitions (common TypeScript error)
 */
function checkDuplicateProperties(content: string, filePath: string): void {
  const lines = content.split('\n');

  // Pattern: object with spread operator
  const returnPattern = /return\s*\{/;

  lines.forEach((line, index) => {
    if (returnPattern.test(line)) {
      // Check next few lines for spreads
      let hasSpread = false;
      const properties = new Set<string>();

      for (let i = index; i < Math.min(index + 15, lines.length); i++) {
        const currentLine = lines[i]!;

        // Check for spread operator
        if (/\.\.\.\w+/.test(currentLine)) {
          hasSpread = true;
        }

        // Extract property names
        const propertyMatch = currentLine.match(/^\s*(\w+):/);
        if (propertyMatch && propertyMatch[1]) {
          const propName = propertyMatch[1];
          if (properties.has(propName)) {
            results.push({
              category: 'Duplicate Properties',
              severity: 'error',
              message: `Duplicate property '${propName}' - will be overwritten by spread operator`,
              file: filePath,
              line: i + 1,
            });
          }
          properties.add(propName);
        }

        // Stop at closing brace
        if (/^\s*\}/.test(currentLine)) {
          break;
        }
      }
    }
  });
}

/**
 * Check for explicit 'any' types (TypeScript anti-pattern)
 */
function checkExplicitAnyTypes(content: string, filePath: string): void {
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip lines with eslint-disable
    if (line.includes('eslint-disable')) {
      return;
    }

    // Match explicit any types
    if (/:\s*any\b/.test(line) && !line.includes('eslint-disable-next-line')) {
      results.push({
        category: 'Explicit Any',
        severity: 'warning',
        message: 'Explicit "any" type detected - consider using proper types',
        file: filePath,
        line: index + 1,
      });
    }
  });
}

/**
 * Check for missing null checks on potentially undefined values
 */
function checkNullSafety(content: string, filePath: string): void {
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check for array access without optional chaining
    // Pattern: array[0].property without checking if array[0] exists
    const unsafeArrayAccess = /\w+\[0\]\.\w+/;
    if (
      unsafeArrayAccess.test(line) &&
      !line.includes('?') &&
      !line.includes('if')
    ) {
      results.push({
        category: 'Null Safety',
        severity: 'warning',
        message:
          'Array access without null check - consider using optional chaining (?)',
        file: filePath,
        line: index + 1,
      });
    }
  });
}

/**
 * Check for missing _type property in objects (Sanity/common pattern)
 */
function checkMissingTypeProperty(content: string, filePath: string): void {
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Look for category or similar object constructions
    if (/category:\s*\{/.test(line)) {
      let hasType = false;

      // Check next few lines for _type property
      for (let i = index; i < Math.min(index + 10, lines.length); i++) {
        if (lines[i]!.includes('_type:')) {
          hasType = true;
          break;
        }
        if (/^\s*\}/.test(lines[i]!)) {
          break;
        }
      }

      if (!hasType && filePath.includes('api/reports')) {
        results.push({
          category: 'Missing Type Property',
          severity: 'warning',
          message: 'Object construction missing "_type" property',
          file: filePath,
          line: index + 1,
        });
      }
    }
  });
}

/**
 * Check for console.log statements (should use proper logging)
 */
function checkConsoleStatements(content: string, filePath: string): void {
  // Skip this check for scripts and development files
  if (filePath.includes('scripts/') || filePath.includes('.test.')) {
    return;
  }

  const lines = content.split('\n');

  lines.forEach((line, index) => {
    if (
      /console\.(log|debug|info)/.test(line) &&
      !line.includes('console.error')
    ) {
      results.push({
        category: 'Console Statement',
        severity: 'info',
        message:
          'console.log detected - consider using proper logging in production',
        file: filePath,
        line: index + 1,
      });
    }
  });
}

/**
 * Check for unused imports (common in TypeScript)
 */
function checkUnusedImports(content: string, filePath: string): void {
  const lines = content.split('\n');
  const imports = new Set<string>();

  lines.forEach((line) => {
    // Extract imported names
    const importMatch = line.match(/import\s+(?:type\s+)?\{([^}]+)\}/);
    if (importMatch && importMatch[1]) {
      const importedNames = importMatch[1].split(',').map((n) =>
        n
          .trim()
          .split(/\s+as\s+/)[0]!
          .trim()
      );
      importedNames.forEach((name) => imports.add(name));
    }

    // Extract default imports
    const defaultImportMatch = line.match(/import\s+(\w+)\s+from/);
    if (defaultImportMatch && defaultImportMatch[1]) {
      imports.add(defaultImportMatch[1]);
    }
  });

  // Check if imports are used in the file
  imports.forEach((importName) => {
    const usagePattern = new RegExp(`\\b${importName}\\b`, 'g');
    const matches = content.match(usagePattern) || [];

    // If only mentioned once (the import statement itself), it's unused
    if (matches.length === 1) {
      results.push({
        category: 'Unused Import',
        severity: 'warning',
        message: `Import '${importName}' is defined but never used`,
        file: filePath,
      });
    }
  });
}

/**
 * Main audit function
 */
async function runAudit(): Promise<void> {
  console.log('🔍 Starting comprehensive code audit...\n');

  const srcFiles = getAllTypeScriptFiles('./src');

  console.log(`📂 Found ${srcFiles.length} TypeScript files in src/\n`);

  let processedFiles = 0;

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf-8');

    checkDuplicateProperties(content, file);
    checkExplicitAnyTypes(content, file);
    checkNullSafety(content, file);
    checkMissingTypeProperty(content, file);
    checkConsoleStatements(content, file);
    checkUnusedImports(content, file);

    processedFiles++;
  }

  console.log(`✅ Processed ${processedFiles} files\n`);

  // Print results
  console.log('═'.repeat(80));
  console.log('📊 AUDIT RESULTS');
  console.log('═'.repeat(80));

  if (results.length === 0) {
    console.log('✅ No issues found! Code is clean.\n');
    process.exit(0);
  }

  // Group by severity
  const errors = results.filter((r) => r.severity === 'error');
  const warnings = results.filter((r) => r.severity === 'warning');
  const info = results.filter((r) => r.severity === 'info');

  if (errors.length > 0) {
    console.log(`\n❌ ERRORS (${errors.length}):`);
    errors.forEach((err) => {
      console.log(`   ${err.file}:${err.line || '?'}`);
      console.log(`   ${err.category}: ${err.message}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach((warn) => {
      console.log(`   ${warn.file}:${warn.line || '?'}`);
      console.log(`   ${warn.category}: ${warn.message}\n`);
    });
  }

  if (info.length > 0) {
    console.log(`\nℹ️  INFO (${info.length}):`);
    info.forEach((i) => {
      console.log(`   ${i.file}:${i.line || '?'}`);
      console.log(`   ${i.category}: ${i.message}\n`);
    });
  }

  console.log('═'.repeat(80));
  console.log(
    `Total issues: ${results.length} (${errors.length} errors, ${warnings.length} warnings, ${info.length} info)`
  );
  console.log('═'.repeat(80));

  // Exit with error code if there are errors
  if (errors.length > 0) {
    console.log(
      '\n❌ Audit failed due to errors. Please fix them before deployment.\n'
    );
    process.exit(1);
  }

  console.log('\n✅ Audit passed! No blocking errors found.\n');
  process.exit(0);
}

// Run the audit
runAudit().catch((error) => {
  console.error('❌ Audit script failed:', error);
  process.exit(1);
});
