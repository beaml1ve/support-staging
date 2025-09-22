import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * Excel Generator for Organization Statistics
 * Handles Excel file creation and formatting
 */
export class ExcelGenerator {
  constructor() {
    this.workbook = new ExcelJS.Workbook();
  }

  /**
   * Create hierarchy columns for organization data
   * @param {Array<Object>} data - Organization data array
   * @param {Object} parentMap - Parent hierarchy map
   * @returns {Object} - Updated data with hierarchy columns and column info
   */
  createHierarchyColumns(data, parentMap) {
    console.log(chalk.blue('🔍 Creating hierarchy columns...'));

    const allOrgs = data.map(org => org.ServiceId);
    const maxDepth = Math.max(...data.map(org => 
      this.findHierarchyPath(org.ServiceId, allOrgs, parentMap).length
    ));

    console.log(chalk.gray(`   Maximum hierarchy depth: ${maxDepth}`));

    // Add hierarchy columns to each organization
    const updatedData = data.map(org => {
      const hierarchyPath = this.findHierarchyPath(org.ServiceId, allOrgs, parentMap);
      
      const hierarchyColumns = {};
      for (let i = 0; i < maxDepth; i++) {
        hierarchyColumns[`Level_${i}`] = hierarchyPath[i] || '';
      }
      
      return {
        ...hierarchyColumns,
        ...org
      };
    });

    // Create hierarchy column names
    const hierarchyColumnNames = [];
    for (let i = 0; i < maxDepth; i++) {
      hierarchyColumnNames.push(`Level_${i}`);
    }

    console.log(chalk.green(`✅ Created ${maxDepth} hierarchy levels`));
    
    return {
      data: updatedData,
      hierarchyColumns: hierarchyColumnNames,
      maxDepth
    };
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
    const visited = new Set(); // Prevent infinite loops from circular references
    const maxDepth = 10; // Safety limit
    
    while (current && allOrgs.includes(current) && !visited.has(current) && path.length < maxDepth) {
      visited.add(current);
      path.unshift(current);
      current = parentMap[current];
    }
    
    return path;
  }

  /**
   * Create final Excel file with organization data
   * @param {Array<Object>} data - Organization data with hierarchy columns
   * @param {Array<string>} hierarchyColumns - Hierarchy column names
   * @param {string} outputFilename - Output filename
   * @returns {string} - Path to created Excel file
   */
  async createFinalExcel(data, hierarchyColumns, outputFilename) {
    console.log(chalk.blue('🔍 Creating final Excel file...'));

    const worksheet = this.workbook.addWorksheet('Organization Statistics');

    // Define column order: Level columns first, then organization details
    const columnOrder = [
      ...hierarchyColumns,
      'Organization',
      'ServiceId', 
      'Status',
      'Type',
      'ActiveUsers',
      'NonBeamerUsers',
      'RegisteredUsers',
      'Pages',
      'Messages',
      'Media',
      'ParentServiceId'
    ];

    // Add headers
    worksheet.columns = columnOrder.map(col => ({
      header: col,
      key: col,
      width: this.getColumnWidth(col)
    }));

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Sort by hierarchy columns (Level_0 → Level_1 → Level_2 → Level_3 → Level_4)
    // Note: ExcelJS doesn't have a built-in sort function, so we'll sort the data before adding to worksheet
    if (hierarchyColumns.length > 0) {
      data.sort((a, b) => {
        for (const col of hierarchyColumns) {
          const aVal = a[col] || '';
          const bVal = b[col] || '';
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
        }
        return 0;
      });
    }

    // Add data rows
    data.forEach(org => {
      const row = {};
      columnOrder.forEach(col => {
        row[col] = org[col] || '';
      });
      worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.width < 15) column.width = 15;
      if (column.width > 50) column.width = 50;
    });

    // Add summary statistics
    await this.addSummarySheet(data, hierarchyColumns);

    // Save the file
    const filePath = path.resolve(outputFilename);
    await this.workbook.xlsx.writeFile(filePath);

    console.log(chalk.green(`✅ Excel file created: ${filePath}`));
    return filePath;
  }

  /**
   * Get appropriate column width for a column
   * @param {string} columnName - Column name
   * @returns {number} - Column width
   */
  getColumnWidth(columnName) {
    const widths = {
      'Organization': 25,
      'ServiceId': 25,
      'Status': 10,
      'Type': 15,
      'ActiveUsers': 12,
      'NonBeamerUsers': 15,
      'RegisteredUsers': 15,
      'Pages': 8,
      'Messages': 10,
      'Media': 8,
      'ParentServiceId': 20
    };

    if (columnName.startsWith('Level_')) {
      return 20;
    }

    return widths[columnName] || 15;
  }

  /**
   * Add summary statistics sheet
   * @param {Array<Object>} data - Organization data
   * @param {Array<string>} hierarchyColumns - Hierarchy column names
   */
  async addSummarySheet(data, hierarchyColumns) {
    const summarySheet = this.workbook.addWorksheet('Summary Statistics');

    // Calculate summary statistics
    const totalOrgs = data.length;
    const totalActiveUsers = data.reduce((sum, org) => sum + (org.ActiveUsers || 0), 0);
    const totalNonBeamerUsers = data.reduce((sum, org) => sum + (org.NonBeamerUsers || 0), 0);
    const totalRegisteredUsers = data.reduce((sum, org) => sum + (org.RegisteredUsers || 0), 0);
    const totalPages = data.reduce((sum, org) => sum + (org.Pages || 0), 0);
    const totalMessages = data.reduce((sum, org) => sum + (org.Messages || 0), 0);
    const totalMedia = data.reduce((sum, org) => sum + (org.Media || 0), 0);

    // Add summary data
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 15 }
    ];

    const summaryData = [
      { metric: 'Total Organizations', value: totalOrgs },
      { metric: 'Total Active Users', value: totalActiveUsers },
      { metric: 'Total Non-Beamer Users', value: totalNonBeamerUsers },
      { metric: 'Total Registered Users', value: totalRegisteredUsers },
      { metric: 'Total Pages', value: totalPages },
      { metric: 'Total Messages', value: totalMessages },
      { metric: 'Total Media Objects', value: totalMedia },
      { metric: 'Hierarchy Levels', value: hierarchyColumns.length },
      { metric: 'Generated At', value: format(new Date(), 'yyyy-MM-dd HH:mm:ss') }
    ];

    summaryData.forEach(row => summarySheet.addRow(row));

    // Style the summary sheet
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add top organizations by users
    const topOrgsByUsers = data
      .sort((a, b) => (b.ActiveUsers || 0) - (a.ActiveUsers || 0))
      .slice(0, 10);

    summarySheet.addRow({ metric: '', value: '' }); // Empty row
    summarySheet.addRow({ metric: 'Top 10 Organizations by Active Users', value: '' });
    
    topOrgsByUsers.forEach((org, index) => {
      summarySheet.addRow({
        metric: `${index + 1}. ${org.Organization}`,
        value: org.ActiveUsers || 0
      });
    });
  }

  /**
   * Print summary statistics to console
   * @param {Array<Object>} data - Organization data
   */
  printSummary(data) {
    console.log(chalk.blue('\n📊 Organization Statistics Summary'));
    console.log(chalk.gray('='.repeat(50)));

    const totalOrgs = data.length;
    const totalActiveUsers = data.reduce((sum, org) => sum + (org.ActiveUsers || 0), 0);
    const totalPages = data.reduce((sum, org) => sum + (org.Pages || 0), 0);
    const totalMessages = data.reduce((sum, org) => sum + (org.Messages || 0), 0);
    const totalMedia = data.reduce((sum, org) => sum + (org.Media || 0), 0);

    console.log(chalk.green(`✅ Total Organizations: ${totalOrgs}`));
    console.log(chalk.green(`✅ Total Active Users: ${totalActiveUsers.toLocaleString()}`));
    console.log(chalk.green(`✅ Total Pages: ${totalPages.toLocaleString()}`));
    console.log(chalk.green(`✅ Total Messages: ${totalMessages.toLocaleString()}`));
    console.log(chalk.green(`✅ Total Media Objects: ${totalMedia.toLocaleString()}`));

    // Top 10 organizations by users
    const topOrgs = data
      .sort((a, b) => (b.ActiveUsers || 0) - (a.ActiveUsers || 0))
      .slice(0, 10);

    console.log(chalk.blue('\n🏆 Top 10 Organizations by Active Users:'));
    topOrgs.forEach((org, index) => {
      console.log(chalk.gray(`   ${(index + 1).toString().padStart(2, ' ')}. ${org.Organization}: ${org.Pages} pages, ${org.Messages} messages, ${org.Media} media, ${org.ActiveUsers} users`));
    });
  }

  /**
   * Clean up old Excel files
   * @param {string} currentFile - Current Excel file to keep
   */
  cleanupOldFiles(currentFile) {
    try {
      const currentDir = path.dirname(currentFile);
      const files = fs.readdirSync(currentDir);
      
      const excelFiles = files.filter(file => 
        file.startsWith('organizations_complete_table_') && 
        file.endsWith('.xlsx') && 
        file !== path.basename(currentFile)
      );

      excelFiles.forEach(file => {
        const filePath = path.join(currentDir, file);
        fs.unlinkSync(filePath);
        console.log(chalk.yellow(`🗑️  Removed old file: ${file}`));
      });

      if (excelFiles.length > 0) {
        console.log(chalk.green(`✅ Cleaned up ${excelFiles.length} old Excel files`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error cleaning up old files:'), error.message);
    }
  }
}
