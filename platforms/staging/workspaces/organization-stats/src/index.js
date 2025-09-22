#!/usr/bin/env node

import { Command } from 'commander';
import { OrganizationStatsService } from './organization-stats.js';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';

const program = new Command();

program
  .name('organization-stats')
  .description('Organization Statistics Table Generator - Node.js version')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate complete organization statistics table')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('--redis-host <host>', 'Redis host', 'localhost')
  .option('--redis-port <port>', 'Redis port', '6379')
  .option('--postgres-host <host>', 'PostgreSQL host', 'localhost')
  .option('--postgres-port <port>', 'PostgreSQL port', '5432')
  .option('--postgres-user <user>', 'PostgreSQL user', 'beam')
  .option('--postgres-password <password>', 'PostgreSQL password', 'beamL1ve')
  .action(async (options) => {
    const spinner = ora('Initializing service').start();
    
    try {
      const service = new OrganizationStatsService({
        redisHost: options.redisHost,
        redisPort: parseInt(options.redisPort),
        postgresHost: options.postgresHost,
        postgresPort: parseInt(options.postgresPort),
        postgresUser: options.postgresUser,
        postgresPassword: options.postgresPassword
      });

      spinner.text = 'Connecting to databases';
      const initialized = await service.initialize();
      
      if (!initialized) {
        spinner.fail(chalk.red('Failed to initialize service'));
        process.exit(1);
      }

      spinner.text = 'Generating organization statistics table';
      const outputPath = await service.generateCompleteTable(options.output);
      
      if (outputPath) {
        spinner.succeed(chalk.green('Organization statistics table generated successfully!'));
        console.log(chalk.blue(`📁 Output file: ${outputPath}`));
      } else {
        spinner.fail(chalk.red('Failed to generate table'));
        process.exit(1);
      }

      await service.cleanup();
      
    } catch (error) {
      spinner.fail(chalk.red('Error generating table:') + ' ' + error.message);
      console.error(chalk.red('Stack trace:'), error.stack);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test database connections and basic functionality')
  .option('--redis-host <host>', 'Redis host', 'localhost')
  .option('--redis-port <port>', 'Redis port', '6379')
  .option('--postgres-host <host>', 'PostgreSQL host', 'localhost')
  .option('--postgres-port <port>', 'PostgreSQL port', '5432')
  .option('--postgres-user <user>', 'PostgreSQL user', 'beam')
  .option('--postgres-password <password>', 'PostgreSQL password', 'beamL1ve')
  .action(async (options) => {
    const spinner = ora('Testing connections').start();
    
    try {
      const service = new OrganizationStatsService({
        redisHost: options.redisHost,
        redisPort: parseInt(options.redisPort),
        postgresHost: options.postgresHost,
        postgresPort: parseInt(options.postgresPort),
        postgresUser: options.postgresUser,
        postgresPassword: options.postgresPassword
      });

      const initialized = await service.initialize();
      
      if (!initialized) {
        spinner.fail(chalk.red('Failed to initialize service'));
        process.exit(1);
      }

      const results = await service.testConnections();
      
      if (results.redis && results.postgres) {
        spinner.succeed(chalk.green('All connections successful!'));
      } else {
        spinner.fail(chalk.red('Some connections failed'));
        process.exit(1);
      }

      await service.cleanup();
      
    } catch (error) {
      spinner.fail(chalk.red('Connection test failed:') + ' ' + error.message);
      console.error(chalk.red('Stack trace:'), error.stack);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Get hierarchy statistics without generating Excel file')
  .option('--redis-host <host>', 'Redis host', 'localhost')
  .option('--redis-port <port>', 'Redis port', '6379')
  .option('--postgres-host <host>', 'PostgreSQL host', 'localhost')
  .option('--postgres-port <port>', 'PostgreSQL port', '5432')
  .option('--postgres-user <user>', 'PostgreSQL user', 'beam')
  .option('--postgres-password <password>', 'PostgreSQL password', 'beamL1ve')
  .action(async (options) => {
    const spinner = ora('Getting hierarchy statistics').start();
    
    try {
      const service = new OrganizationStatsService({
        redisHost: options.redisHost,
        redisPort: parseInt(options.redisPort),
        postgresHost: options.postgresHost,
        postgresPort: parseInt(options.postgresPort),
        postgresUser: options.postgresUser,
        postgresPassword: options.postgresPassword
      });

      const initialized = await service.initialize();
      
      if (!initialized) {
        spinner.fail(chalk.red('Failed to initialize service'));
        process.exit(1);
      }

      const organizations = await service.redisClient.extractOrganizations();
      const hierarchyStats = await service.getHierarchyStats(organizations);
      
      spinner.succeed(chalk.green('Hierarchy statistics retrieved!'));
      
      console.log(chalk.blue('\n📊 Hierarchy Statistics:'));
      console.log(chalk.gray('=' * 40));
      console.log(chalk.green(`Total Organizations: ${hierarchyStats.totalOrgs}`));
      console.log(chalk.green(`Root Organizations: ${hierarchyStats.rootOrgs}`));
      console.log(chalk.green(`Maximum Depth: ${hierarchyStats.maxDepth}`));
      
      console.log(chalk.blue('\n📈 Depth Distribution:'));
      Object.entries(hierarchyStats.depthDistribution).forEach(([depth, count]) => {
        console.log(chalk.gray(`   Level ${depth}: ${count} organizations`));
      });

      await service.cleanup();
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to get statistics:') + ' ' + error.message);
      console.error(chalk.red('Stack trace:'), error.stack);
      process.exit(1);
    }
  });

// Default command (when no subcommand is provided)
program
  .action(async () => {
    console.log(chalk.blue('🚀 Organization Statistics Table Generator'));
    console.log(chalk.gray('Node.js version of the Python organization statistics script'));
    console.log(chalk.gray('='.repeat(60)));
    console.log(chalk.yellow('\nAvailable commands:'));
    console.log(chalk.gray('  generate  - Generate complete organization statistics table'));
    console.log(chalk.gray('  test      - Test database connections'));
    console.log(chalk.gray('  stats     - Get hierarchy statistics'));
    console.log(chalk.gray('\nUse --help with any command for more options'));
    console.log(chalk.gray('\nExample:'));
    console.log(chalk.gray('  npm run generate'));
    console.log(chalk.gray('  npm run test'));
    console.log(chalk.gray('  npm run stats'));
  });

// Handle uncaught errors
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

// Parse command line arguments
program.parse();
