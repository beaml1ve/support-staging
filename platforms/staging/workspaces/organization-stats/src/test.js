#!/usr/bin/env node

import { OrganizationStatsService } from './organization-stats.js';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Test script for Organization Statistics Service
 * Tests all major functionality without generating Excel files
 */
async function runTests() {
  console.log(chalk.blue('🧪 Organization Statistics Service - Test Suite'));
  console.log(chalk.gray('='.repeat(60)));

  const service = new OrganizationStatsService();
  const tests = [];
  let passedTests = 0;

  // Test 1: Initialize connections
  tests.push({
    name: 'Initialize connections',
    test: async () => {
      const result = await service.initialize();
      if (!result) {
        throw new Error('Failed to initialize connections');
      }
      return 'Connections established successfully';
    }
  });

  // Test 2: Extract organizations
  tests.push({
    name: 'Extract organizations from Redis',
    test: async () => {
      const organizations = await service.redisClient.extractOrganizations();
      if (organizations.length === 0) {
        throw new Error('No organizations found');
      }
      return `Found ${organizations.length} organizations`;
    }
  });

  // Test 3: Count users for sample organization
  tests.push({
    name: 'Count users for sample organization',
    test: async () => {
      const organizations = await service.redisClient.extractOrganizations();
      if (organizations.length === 0) {
        throw new Error('No organizations available for testing');
      }
      
      const sampleOrg = organizations[0];
      const [activeUsers, nonBeamerUsers, registeredUsers] = await Promise.all([
        service.redisClient.countActiveUsers(sampleOrg),
        service.redisClient.countNonBeamerUsers(sampleOrg),
        service.redisClient.countRegisteredUsers(sampleOrg)
      ]);
      
      return `${sampleOrg}: ${activeUsers} active, ${nonBeamerUsers} non-beamer, ${registeredUsers} registered users`;
    }
  });

  // Test 4: Count objects for sample organization
  tests.push({
    name: 'Count objects for sample organization',
    test: async () => {
      const organizations = await service.redisClient.extractOrganizations();
      if (organizations.length === 0) {
        throw new Error('No organizations available for testing');
      }
      
      const sampleOrg = organizations[0];
      const [pages, messages, media] = await Promise.all([
        service.redisClient.countPages(sampleOrg),
        service.redisClient.countMessages(sampleOrg),
        service.redisClient.countMedia(sampleOrg)
      ]);
      
      return `${sampleOrg}: ${pages} pages, ${messages} messages, ${media} media objects`;
    }
  });

  // Test 5: Get parent hierarchy
  tests.push({
    name: 'Get parent hierarchy for sample organization',
    test: async () => {
      const organizations = await service.redisClient.extractOrganizations();
      if (organizations.length === 0) {
        throw new Error('No organizations available for testing');
      }
      
      const sampleOrg = organizations[0];
      const parentId = await service.postgresClient.getParentServiceId(sampleOrg);
      
      return `${sampleOrg} parent: ${parentId || 'None (root organization)'}`;
    }
  });

  // Test 6: Build hierarchy map
  tests.push({
    name: 'Build parent hierarchy map',
    test: async () => {
      const organizations = await service.redisClient.extractOrganizations();
      if (organizations.length === 0) {
        throw new Error('No organizations available for testing');
      }
      
      // Test with first 5 organizations to avoid long execution time
      const testOrgs = organizations.slice(0, 5);
      const parentMap = await service.postgresClient.buildParentHierarchyMap(testOrgs);
      
      return `Built hierarchy map for ${testOrgs.length} organizations, ${Object.keys(parentMap).length} with parents`;
    }
  });

  // Test 7: Get hierarchy statistics
  tests.push({
    name: 'Get hierarchy statistics',
    test: async () => {
      const organizations = await service.redisClient.extractOrganizations();
      if (organizations.length === 0) {
        throw new Error('No organizations available for testing');
      }
      
      // Test with first 10 organizations to avoid long execution time
      const testOrgs = organizations.slice(0, 10);
      const hierarchyStats = await service.getHierarchyStats(testOrgs);
      
      return `Max depth: ${hierarchyStats.maxDepth}, Root orgs: ${hierarchyStats.rootOrgs}`;
    }
  });

  // Run all tests
  for (const test of tests) {
    const spinner = ora(`Running test: ${test.name}`).start();
    
    try {
      const result = await test.test();
      spinner.succeed(chalk.green(`✅ ${test.name}: ${result}`));
      passedTests++;
    } catch (error) {
      spinner.fail(chalk.red(`❌ ${test.name}: ${error.message}`));
    }
  }

  // Cleanup
  await service.cleanup();

  // Summary
  console.log(chalk.blue('\n📊 Test Summary:'));
  console.log(chalk.gray('='.repeat(40)));
  console.log(chalk.green(`✅ Passed: ${passedTests}/${tests.length}`));
  console.log(chalk.red(`❌ Failed: ${tests.length - passedTests}/${tests.length}`));
  
  if (passedTests === tests.length) {
    console.log(chalk.green('\n🎉 All tests passed! Service is ready for production use.'));
    process.exit(0);
  } else {
    console.log(chalk.red('\n💥 Some tests failed. Please check the errors above.'));
    process.exit(1);
  }
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Uncaught Exception:'), error.message);
  console.error(chalk.red('Stack trace:'), error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:'), promise);
  console.error(chalk.red('Reason:'), reason);
  process.exit(1);
});

// Run tests
runTests().catch((error) => {
  console.error(chalk.red('❌ Test suite failed:'), error.message);
  console.error(chalk.red('Stack trace:'), error.stack);
  process.exit(1);
});
