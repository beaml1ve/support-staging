import { createClient } from 'redis';
import chalk from 'chalk';

/**
 * Redis Client for BDS (Beam Data Store) Operations
 * Handles all Redis operations for organization statistics
 */
export class RedisClient {
  constructor(host = 'localhost', port = 6379) {
    this.host = host;
    this.port = port;
    this.client = null;
  }

  /**
   * Connect to Redis server
   */
  async connect() {
    try {
      this.client = createClient({
        socket: {
          host: this.host,
          port: this.port
        }
      });

      this.client.on('error', (err) => {
        console.error(chalk.red('Redis Client Error:'), err);
      });

      await this.client.connect();
      console.log(chalk.green(`✅ Connected to Redis at ${this.host}:${this.port}`));
      return true;
    } catch (error) {
      console.error(chalk.red('❌ Failed to connect to Redis:'), error.message);
      return false;
    }
  }

  /**
   * Disconnect from Redis server
   */
  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      console.log(chalk.yellow('🔌 Disconnected from Redis'));
    }
  }

  /**
   * Escape special characters for Redis tag expressions
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeRedisTag(text) {
    // Based on Stack Overflow: https://stackoverflow.com/questions/65718424/redis-escape-special-character
    const replacements = {
      ',': '\\,', 
      '.': '\\.',
      '<': '\\<',
      '>': '\\>',
      '{': '\\{',
      '}': '\\}',
      '[': '\\[',
      ']': '\\]',
      '"': '\\"',
      "'": "\\'",
      ':': '\\:',
      ';': '\\;',
      '!': '\\!',
      '@': '\\@',
      '#': '\\#',
      '$': '\\$',
      '%': '\\%',
      '^': '\\^',
      '&': '\\&',
      '*': '\\*',
      '(': '\\(',
      ')': '\\)',
      '-': '\\-',
      '+': '\\+',
      '=': '\\=',
      '~': '\\~',
    };

    return text.replace(/,|\.|<|>|\{|\}|\[|\]|"|'|:|;|!|@|#|\$|%|\^|&|\*|\(|\)|-|\+|=|~/g, function(x) {
      return replacements[x] || x;
    });
  }

  /**
   * Escape special characters for Redis partition tag expressions
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeRedisPartitionTag(text) {
    // Based on Stack Overflow: https://stackoverflow.com/questions/65718424/redis-escape-special-character
    const replacements = {
      ',': '\\,', 
      '.': '\\.',
      '<': '\\<',
      '>': '\\>',
      '{': '\\{',
      '}': '\\}',
      '[': '\\[',
      ']': '\\]',
      '"': '\\"',
      "'": "\\'",
      ':': '\\:',
      ';': '\\;',
      '!': '\\!',
      '@': '\\@',
      '#': '\\#',
      '$': '\\$',
      '%': '\\%',
      '^': '\\^',
      '&': '\\&',
      '*': '\\*',
      '(': '\\(',
      ')': '\\)',
      '-': '\\-',
      '+': '\\+',
      '=': '\\=',
      '~': '\\~',
    };

    return text.replace(/,|\.|<|>|\{|\}|\[|\]|"|'|:|;|!|@|#|\$|%|\^|&|\*|\(|\)|-|\+|=|~/g, function(x) {
      return replacements[x] || x;
    });
  }

  /**
   * Execute Redis FT.SEARCH command
   * @param {string} index - Index name
   * @param {string} query - Search query
   * @param {Array} returnFields - Fields to return
   * @param {number} limit - Result limit (0 = no limit)
   * @returns {Array} - Search results
   */
  async ftSearch(index, query, returnFields = [], limit = 0) {
    try {
      const options = {
        RETURN: returnFields
      };
      
      // If limit is 0, we want all results, so don't set LIMIT
      // If limit > 0, set the limit
      if (limit > 0) {
        options.LIMIT = { from: 0, size: limit };
      }
      
      const result = await this.client.ft.search(index, query, options);

      return result.documents || [];
    } catch (error) {
      console.error(chalk.red(`❌ FT.SEARCH error for index ${index}:`), error.message);
      return [];
    }
  }

  /**
   * Execute Redis FT.AGGREGATE command
   * @param {string} index - Index name
   * @param {string} query - Search query
   * @param {Array} loadFields - Fields to load
   * @param {Array} groupBy - Group by fields
   * @param {Array} reduce - Reduce operations
   * @returns {Array} - Aggregate results
   */
  async ftAggregate(index, query, loadFields = [], groupBy = [], reduce = []) {
    try {
      // Build the command arguments for sendCommand
      const args = ['FT.AGGREGATE', index, query];
      
      if (loadFields.length > 0) {
        args.push('LOAD', loadFields.length.toString(), ...loadFields);
      }
      
      if (groupBy.length > 0) {
        args.push('GROUPBY', groupBy.length.toString(), ...groupBy);
      }
      
      if (reduce.length > 0) {
        args.push(...reduce);
      }

      // Use sendCommand to get the raw result
      const result = await this.client.sendCommand(args);
      
      // Parse the result - FT.AGGREGATE returns [total_count, [field_name, value, "count", count_value], ...]
      if (Array.isArray(result) && result.length >= 2) {
        const totalCount = result[0];
        const parsedResults = [];
        
        // Skip the first element (total count) and process each result group
        for (let i = 1; i < result.length; i++) {
          const resultGroup = result[i];
          if (Array.isArray(resultGroup) && resultGroup.length >= 4) {
            // Format: [field_name, value, "count", count_value]
            const fieldName = resultGroup[0];
            const fieldValue = resultGroup[1];
            const countValue = parseInt(resultGroup[3]);
            
            parsedResults.push({
              [fieldName]: fieldValue,
              count: countValue
            });
          }
        }
        
        return parsedResults;
      }
      
      return [];
    } catch (error) {
      console.error(chalk.red(`❌ FT.AGGREGATE error for index ${index}:`), error.message);
      return [];
    }
  }

  /**
   * Execute Redis JSON.GET command
   * @param {string} key - Redis key
   * @param {string} path - JSON path (default: '$')
   * @returns {Object|null} - JSON object or null
   */
  async jsonGet(key, path = '$') {
    try {
      const result = await this.client.json.get(key, { path });
      return result;
    } catch (error) {
      console.error(chalk.red(`❌ JSON.GET error for key ${key}:`), error.message);
      return null;
    }
  }

  /**
   * Extract all active organizations from Redis BDS
   * @returns {Array<string>} - Array of organization service IDs
   */
  async extractOrganizations() {
    console.log(chalk.blue('🔍 Step 1: Extracting organizations from Redis BDS...'));

    try {
      const results = await this.ftSearch(
        'beamdevlive:config:type',
        '@type:{service\\:cudb} @objectStatus:{active}',
        ['$.info.service.cudb.serviceId'],
        1000
      );

      const organizations = [];
      for (const doc of results) {
        const serviceId = doc.value['$.info.service.cudb.serviceId'];
        if (serviceId && serviceId !== 'onboarding') {
          organizations.push(serviceId);
        }
      }

      console.log(chalk.green(`✅ Extracted ${organizations.length} active organizations`));
      return organizations;
    } catch (error) {
      console.error(chalk.red('❌ Error extracting organizations:'), error.message);
      return [];
    }
  }

  /**
   * Count active users for an organization
   * @param {string} orgServiceId - Organization service ID
   * @returns {number} - Count of active users
   */
  async countActiveUsers(orgServiceId) {
    try {
      const escapedServiceId = this.escapeRedisTag(orgServiceId);
      const result = await this.client.ft.search(
        'beamdevlive:user:name_29',
        `@serviceId:{${escapedServiceId}}`,
        {
          LIMIT: { from: 0, size: 0 }
        }
      );
      
      return result.total || 0;
    } catch (error) {
      console.error(chalk.red(`❌ Error counting active users for ${orgServiceId}:`), error.message);
      return 0;
    }
  }

  /**
   * Count non-beamer users (pending status) for an organization
   * @param {string} orgServiceId - Organization service ID
   * @returns {number} - Count of non-beamer users
   */
  async countNonBeamerUsers(orgServiceId) {
    try {
      const escapedServiceId = this.escapeRedisTag(orgServiceId);
      const results = await this.ftSearch(
        'beamdevlive:user:name_29',
        `@serviceId:{${escapedServiceId}}`,
        ['$.persistent.static.nonBeamer', '$.persistent.static.metadata.register.status'],
        10000
      );

      let count = 0;
      for (const doc of results) {
        const nonBeamer = doc.value['$.persistent.static.nonBeamer'];
        const status = doc.value['$.persistent.static.metadata.register.status'];
        
        // Check if nonBeamer exists (not null) and status is pending
        if (nonBeamer !== null && status === 'pending') {
          count++;
        }
      }
      return count;
    } catch (error) {
      console.error(chalk.red(`❌ Error counting non-beamer users for ${orgServiceId}:`), error.message);
      return 0;
    }
  }

  /**
   * Count registered users for an organization
   * @param {string} orgServiceId - Organization service ID
   * @returns {number} - Count of registered users
   */
  async countRegisteredUsers(orgServiceId) {
    try {
      const escapedServiceId = this.escapeRedisTag(orgServiceId);
      const results = await this.ftAggregate(
        'beamdevlive:user:name_29',
        `@serviceId:{${escapedServiceId}}`,
        ['$.persistent.static.metadata.register.status'],
        ['@$.persistent.static.metadata.register.status'],
        ['REDUCE', 'COUNT', '0', 'AS', 'count']
      );

      // Find the count for "registered" status
      for (const result of results) {
        if (result['$.persistent.static.metadata.register.status'] === 'registered') {
          return result.count || 0;
        }
      }
      return 0;
    } catch (error) {
      console.error(chalk.red(`❌ Error counting registered users for ${orgServiceId}:`), error.message);
      return 0;
    }
  }

  /**
   * Count pages tagged to an organization
   * @param {string} orgServiceId - Organization service ID
   * @returns {number} - Count of pages
   */
  async countPages(orgServiceId) {
    try {
      const escapedServiceId = this.escapeRedisPartitionTag(orgServiceId);
      const result = await this.client.ft.search(
        'beamdevlive:page:title_29',
        `@partitions:{org\\:${escapedServiceId}}`,
        {
          LIMIT: { from: 0, size: 0 }
        }
      );
      
      return result.total || 0;
    } catch (error) {
      console.error(chalk.red(`❌ Error counting pages for ${orgServiceId}:`), error.message);
      return 0;
    }
  }

  /**
   * Count messages tagged to an organization
   * @param {string} orgServiceId - Organization service ID
   * @returns {number} - Count of messages
   */
  async countMessages(orgServiceId) {
    // Messages don't have partition tags in the database, so we can't count them by organization
    // This matches the Python script behavior
    return 0;
  }

  /**
   * Count media objects tagged to an organization
   * @param {string} orgServiceId - Organization service ID
   * @returns {number} - Count of media objects
   */
  async countMedia(orgServiceId) {
    try {
      const escapedServiceId = this.escapeRedisPartitionTag(orgServiceId);
      const result = await this.client.ft.search(
        'beamdevlive:bds:partition_29',
        `@objectType:{medium} @partitions:{org\\:${escapedServiceId}}`,
        {
          LIMIT: { from: 0, size: 0 }
        }
      );
      
      return result.total || 0;
    } catch (error) {
      console.error(chalk.red(`❌ Error counting media for ${orgServiceId}:`), error.message);
      return 0;
    }
  }

}
