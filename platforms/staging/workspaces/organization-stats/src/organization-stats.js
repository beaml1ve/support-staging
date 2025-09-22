import { RedisClient } from './redis-client.js';
import { PostgresClient } from './postgres-client.js';
import { ExcelGenerator } from './excel-generator.js';
import chalk from 'chalk';
import ora from 'ora';
import { format } from 'date-fns';

/**
 * Organization Statistics Service
 * Main service that orchestrates the complete organization statistics generation
 */
export class OrganizationStatsService {
  constructor(options = {}) {
    this.redisClient = new RedisClient(
      options.redisHost || 'localhost',
      options.redisPort || 6379
    );
    
    this.postgresClient = new PostgresClient(
      options.postgresHost || 'localhost',
      options.postgresPort || 5432,
      options.postgresUser || 'beam',
      options.postgresPassword || 'beamL1ve'
    );
    
    this.excelGenerator = new ExcelGenerator();
    this.options = options;
  }

  /**
   * Initialize connections to Redis and PostgreSQL
   * @returns {boolean} - Success status
   */
  async initialize() {
    console.log(chalk.blue('🚀 Initializing Organization Statistics Service'));
    console.log(chalk.gray('='.repeat(60)));

    const redisConnected = await this.redisClient.connect();
    const postgresConnected = await this.postgresClient.connect();

    if (!redisConnected || !postgresConnected) {
      console.error(chalk.red('❌ Failed to initialize connections'));
      return false;
    }

    console.log(chalk.green('✅ All connections established'));
    return true;
  }

  /**
   * Cleanup connections
   */
  async cleanup() {
    await this.redisClient.disconnect();
    await this.postgresClient.disconnect();
  }

  /**
   * Create comprehensive organization data with all statistics
   * @param {Array<string>} organizations - Array of organization service IDs
   * @returns {Array<Object>} - Organization data with statistics
   */
  async createOrganizationData(organizations) {
    console.log(chalk.blue('🔍 Step 2: Counting users and objects for each organization...'));
    
    const data = [];
    const totalOrgs = organizations.length;
    const spinner = ora('Processing organizations').start();
    
    for (let i = 0; i < organizations.length; i++) {
      const orgServiceId = organizations[i];
      spinner.text = `Processing ${i + 1}/${totalOrgs}: ${orgServiceId}`;
      
      try {
        // Count different user types
        const [activeUsers, nonBeamerUsers, registeredUsers] = await Promise.all([
          this.redisClient.countActiveUsers(orgServiceId),
          this.redisClient.countNonBeamerUsers(orgServiceId),
          this.redisClient.countRegisteredUsers(orgServiceId)
        ]);
        
        // Count different object types
        const [pages, messages, media] = await Promise.all([
          this.redisClient.countPages(orgServiceId),
          this.redisClient.countMessages(orgServiceId),
          this.redisClient.countMedia(orgServiceId)
        ]);
        
        // Get parent organization
        const parentServiceId = await this.postgresClient.getParentServiceId(orgServiceId);
        
        data.push({
          Organization: orgServiceId,
          ServiceId: orgServiceId,
          Status: 'active',
          Type: 'service:cudb',
          ActiveUsers: activeUsers,
          NonBeamerUsers: nonBeamerUsers,
          RegisteredUsers: registeredUsers,
          Pages: pages,
          Messages: messages,
          Media: media,
          ParentServiceId: parentServiceId
        });
        
      } catch (error) {
        console.error(chalk.red(`❌ Error processing ${orgServiceId}:`), error.message);
        // Add empty data for failed organization
        data.push({
          Organization: orgServiceId,
          ServiceId: orgServiceId,
          Status: 'error',
          Type: 'service:cudb',
          ActiveUsers: 0,
          NonBeamerUsers: 0,
          RegisteredUsers: 0,
          Pages: 0,
          Messages: 0,
          Media: 0,
          ParentServiceId: null
        });
      }
    }
    
    spinner.succeed(chalk.green(`✅ Processed ${totalOrgs} organizations`));
    return data;
  }

  /**
   * Generate complete organization statistics table
   * @param {string} outputDir - Output directory for Excel files
   * @returns {string} - Path to generated Excel file
   */
  async generateCompleteTable(outputDir = '.') {
    try {
      console.log(chalk.blue('🚀 Starting Complete Organization Statistics Table Generation'));
      console.log(chalk.gray('='.repeat(60)));

      // Step 1: Extract organizations
      const organizations = await this.redisClient.extractOrganizations();
      if (organizations.length === 0) {
        console.error(chalk.red('❌ No organizations found. Exiting.'));
        return null;
      }

      // Step 2: Create organization data
      const data = await this.createOrganizationData(organizations);
      
      // Step 3: Build parent hierarchy map
      const parentMap = await this.postgresClient.buildParentHierarchyMap(organizations);
      
      // Step 4: Create hierarchy columns
      const { data: dataWithHierarchy, hierarchyColumns } = this.excelGenerator.createHierarchyColumns(data, parentMap);
      
      // Step 5: Create final Excel file
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const outputFilename = `${outputDir}/organizations_complete_table_${timestamp}.xlsx`;
      
      const filePath = await this.excelGenerator.createFinalExcel(
        dataWithHierarchy, 
        hierarchyColumns, 
        outputFilename
      );
      
      // Step 6: Print summary
      this.excelGenerator.printSummary(dataWithHierarchy);
      
      // Step 7: Cleanup old files
      this.excelGenerator.cleanupOldFiles(filePath);
      
      console.log(chalk.green(`\n✅ Complete organization table created: ${outputFilename}`));
      console.log(chalk.green(`📁 File location: ${filePath}`));
      console.log(chalk.green(`📋 Column order: Level columns first, then organization details`));
      console.log(chalk.green(`🔄 Ready for hierarchy-based sorting and analysis`));
      
      return filePath;
      
    } catch (error) {
      console.error(chalk.red('❌ Error generating organization table:'), error.message);
      throw error;
    }
  }

  /**
   * Get hierarchy statistics
   * @param {Array<string>} organizations - Array of organization service IDs
   * @returns {Object} - Hierarchy statistics
   */
  async getHierarchyStats(organizations) {
    const parentMap = await this.postgresClient.buildParentHierarchyMap(organizations);
    return this.postgresClient.getHierarchyStats(parentMap);
  }

  /**
   * Test connections and basic functionality
   * @returns {Object} - Test results
   */
  async testConnections() {
    console.log(chalk.blue('🧪 Testing connections and basic functionality...'));
    
    const results = {
      redis: false,
      postgres: false,
      organizations: 0,
      sampleOrg: null
    };
    
    try {
      // Test Redis connection
      const organizations = await this.redisClient.extractOrganizations();
      results.redis = true;
      results.organizations = organizations.length;
      results.sampleOrg = organizations[0] || null;
      
      // Test PostgreSQL connection
      if (results.sampleOrg) {
        const parentId = await this.postgresClient.getParentServiceId(results.sampleOrg);
        results.postgres = parentId !== null;
      }
      
      console.log(chalk.green('✅ Connection tests completed'));
      console.log(chalk.gray(`   Redis: ${results.redis ? '✅' : '❌'}`));
      console.log(chalk.gray(`   PostgreSQL: ${results.postgres ? '✅' : '❌'}`));
      console.log(chalk.gray(`   Organizations found: ${results.organizations}`));
      console.log(chalk.gray(`   Sample org: ${results.sampleOrg || 'None'}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Connection test failed:'), error.message);
    }
    
    return results;
  }
}
