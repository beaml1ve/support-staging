import pkg from 'pg';
const { Client } = pkg;
import chalk from 'chalk';

/**
 * PostgreSQL Client for Organization Hierarchy Operations
 * Handles database connections and hierarchy queries
 */
export class PostgresClient {
  constructor(host = 'localhost', port = 5432, user = 'beam', password = 'beamL1ve') {
    this.host = host;
    this.port = port;
    this.user = user;
    this.password = password;
    this.client = null;
  }

  /**
   * Connect to PostgreSQL server
   */
  async connect() {
    try {
      this.client = new Client({
        host: this.host,
        port: this.port,
        user: this.user,
        password: this.password,
        database: 'postgres' // Connect to default database first
      });

      await this.client.connect();
      console.log(chalk.green(`✅ Connected to PostgreSQL at ${this.host}:${this.port}`));
      return true;
    } catch (error) {
      console.error(chalk.red('❌ Failed to connect to PostgreSQL:'), error.message);
      return false;
    }
  }

  /**
   * Disconnect from PostgreSQL server
   */
  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log(chalk.yellow('🔌 Disconnected from PostgreSQL'));
    }
  }

  /**
   * Get database connection for a specific organization
   * @param {string} orgServiceId - Organization service ID
   * @returns {Client|null} - Database client or null
   */
  async getOrgDatabaseConnection(orgServiceId) {
    try {
      const dbName = `${orgServiceId}-dev`;
      const orgClient = new Client({
        host: this.host,
        port: this.port,
        user: this.user,
        password: this.password,
        database: dbName
      });

      await orgClient.connect();
      return orgClient;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to connect to database ${orgServiceId}-dev:`), error.message);
      return null;
    }
  }

  /**
   * Close organization database connection
   * @param {Client} client - Database client to close
   */
  async closeOrgDatabaseConnection(client) {
    if (client) {
      await client.end();
    }
  }

  /**
   * Get parent service ID for an organization
   * @param {string} orgServiceId - Organization service ID
   * @returns {string|null} - Parent service ID or null
   */
  async getParentServiceId(orgServiceId) {
    let orgClient = null;
    
    try {
      orgClient = await this.getOrgDatabaseConnection(orgServiceId);
      if (!orgClient) {
        return null;
      }

      // Query the cudb-relation table to find parent organization
      const query = `
        SELECT c."serviceId" as parent_service_id
        FROM "cudb-relation" cr
        JOIN cudb c ON cr."cudbId" = c.id
        WHERE cr."groupId" = 1
        AND cr."deletedAt" IS NULL
        AND c."deletedAt" IS NULL
        LIMIT 1
      `;

      const result = await orgClient.query(query);
      
      if (result.rows.length > 0) {
        return result.rows[0].parent_service_id;
      }
      
      return null;
    } catch (error) {
      console.error(chalk.red(`❌ Error getting parent for ${orgServiceId}:`), error.message);
      return null;
    } finally {
      await this.closeOrgDatabaseConnection(orgClient);
    }
  }

  /**
   * Build parent hierarchy map for all organizations
   * @param {Array<string>} organizations - Array of organization service IDs
   * @returns {Object} - Parent hierarchy map {orgId: parentId}
   */
  async buildParentHierarchyMap(organizations) {
    console.log(chalk.blue('🔍 Building parent hierarchy map...'));
    
    const parentMap = {};
    const totalOrgs = organizations.length;
    
    for (let i = 0; i < organizations.length; i++) {
      const orgServiceId = organizations[i];
      console.log(chalk.gray(`   Processing ${i + 1}/${totalOrgs}: ${orgServiceId}`));
      
      const parentId = await this.getParentServiceId(orgServiceId);
      if (parentId) {
        parentMap[orgServiceId] = parentId;
      }
    }
    
    console.log(chalk.green(`✅ Built hierarchy map for ${Object.keys(parentMap).length} organizations`));
    return parentMap;
  }

  /**
   * Find hierarchy path for an organization
   * @param {string} orgServiceId - Organization service ID
   * @param {Array<string>} allOrgs - All organization service IDs
   * @param {Object} parentMap - Parent hierarchy map
   * @returns {Array<string>} - Hierarchy path from root to leaf
   */
  findHierarchyPath(orgServiceId, allOrgs, parentMap) {
    const path = [];
    let current = orgServiceId;
    
    while (current && allOrgs.includes(current)) {
      path.unshift(current);
      current = parentMap[current];
    }
    
    return path;
  }

  /**
   * Get hierarchy statistics
   * @param {Object} parentMap - Parent hierarchy map
   * @returns {Object} - Hierarchy statistics
   */
  getHierarchyStats(parentMap) {
    const stats = {
      totalOrgs: Object.keys(parentMap).length,
      rootOrgs: 0,
      maxDepth: 0,
      depthDistribution: {}
    };

    // Find root organizations (those with no parent)
    const allOrgs = Object.keys(parentMap);
    const children = Object.values(parentMap);
    
    for (const org of allOrgs) {
      if (!children.includes(org)) {
        stats.rootOrgs++;
      }
    }

    // Calculate depth for each organization
    for (const org of allOrgs) {
      const depth = this.findHierarchyPath(org, allOrgs, parentMap).length;
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      
      if (!stats.depthDistribution[depth]) {
        stats.depthDistribution[depth] = 0;
      }
      stats.depthDistribution[depth]++;
    }

    return stats;
  }
}
