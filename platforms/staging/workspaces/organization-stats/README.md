# Organization Statistics Table Generator

Node.js version of the Python organization statistics script for generating comprehensive Excel reports of organization data from the Beam Data Store (BDS).

## Features

- **Complete Organization Analysis**: Extracts all active organizations from Redis BDS
- **User Statistics**: Counts active users, non-beamer users, and registered users
- **Object Statistics**: Counts pages, messages, and media objects per organization
- **Hierarchy Analysis**: Determines parent-child relationships and creates hierarchy columns
- **Excel Generation**: Creates formatted Excel files with sortable hierarchy columns
- **Database Integration**: Connects to Redis (BDS) and PostgreSQL for comprehensive data analysis

## Installation

```bash
# Install dependencies
npm install

# Or install specific dependencies
npm install redis pg exceljs commander chalk ora date-fns
```

## Usage

### Generate Complete Organization Table

```bash
# Generate table with default settings
npm run generate

# Or run directly
node src/index.js generate

# With custom output directory
npm run generate -- --output ./reports

# With custom database settings
npm run generate -- --redis-host localhost --redis-port 6379 --postgres-host localhost --postgres-port 5432
```

### Test Connections

```bash
# Test database connections
npm run test

# Or run directly
node src/index.js test
```

### Get Hierarchy Statistics

```bash
# Get hierarchy statistics without generating Excel
npm run stats

# Or run directly
node src/index.js stats
```

### Run Test Suite

```bash
# Run comprehensive test suite
npm run test:suite

# Or run directly
node src/test.js
```

## Configuration

### Environment Variables

You can set these environment variables instead of using command-line options:

```bash
export REDIS_HOST=localhost
export REDIS_PORT=6379
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_USER=beam
export POSTGRES_PASSWORD=beamL1ve
```

### Command Line Options

- `--redis-host <host>`: Redis server host (default: localhost)
- `--redis-port <port>`: Redis server port (default: 6379)
- `--postgres-host <host>`: PostgreSQL server host (default: localhost)
- `--postgres-port <port>`: PostgreSQL server port (default: 5432)
- `--postgres-user <user>`: PostgreSQL username (default: beam)
- `--postgres-password <password>`: PostgreSQL password (default: beamL1ve)
- `--output <dir>`: Output directory for Excel files (default: current directory)

## Output

### Excel File Structure

The generated Excel file contains two sheets:

#### 1. Organization Statistics Sheet
- **Level Columns**: Level_0, Level_1, Level_2, Level_3, Level_4 (hierarchy path)
- **Organization Info**: Organization, ServiceId, Status, Type
- **User Statistics**: ActiveUsers, NonBeamerUsers, RegisteredUsers
- **Object Statistics**: Pages, Messages, Media
- **Hierarchy Reference**: ParentServiceId

#### 2. Summary Statistics Sheet
- Total counts for all metrics
- Top 10 organizations by active users
- Hierarchy depth information
- Generation timestamp

### Column Order

The columns are ordered for optimal hierarchy-based sorting:
1. Level_0, Level_1, Level_2, Level_3, Level_4 (hierarchy columns first)
2. Organization, ServiceId, Status, Type (basic organization info)
3. ActiveUsers, NonBeamerUsers, RegisteredUsers (user statistics)
4. Pages, Messages, Media (object statistics)
5. ParentServiceId (hierarchy reference)

## Architecture

### Core Modules

- **`redis-client.js`**: Handles all Redis BDS operations and queries
- **`postgres-client.js`**: Manages PostgreSQL connections and hierarchy queries
- **`excel-generator.js`**: Creates and formats Excel files with statistics
- **`organization-stats.js`**: Main service orchestrating the complete workflow
- **`index.js`**: CLI interface and command handling

### Data Flow

1. **Extract Organizations**: Query Redis BDS for active organizations
2. **Count Statistics**: For each organization, count users and objects
3. **Build Hierarchy**: Query PostgreSQL for parent-child relationships
4. **Create Hierarchy Columns**: Generate Level_0 through Level_N columns
5. **Generate Excel**: Create formatted Excel file with all data
6. **Cleanup**: Remove old Excel files and close connections

## BDS (Beam Data Store) Integration

### Redis Indexes Used

- `beamdevlive:config:type`: Organization configuration data
- `beamdevlive:user:serviceId`: User data by organization
- `beamdevlive:page:title_29`: Page objects
- `beamdevlive:message:title_29`: Message objects
- `beamdevlive:medium:title_29`: Media objects

### Query Patterns

- **Organization Extraction**: `@type:{service\:cudb} @objectStatus:{active}`
- **User Counting**: `@serviceId:{<orgId>} @objectStatus:{active|pending}`
- **Object Counting**: `@partitions:{"org\:<orgId>"}`

## PostgreSQL Integration

### Database Structure

- Each organization has its own database: `<serviceId>-dev`
- Hierarchy information stored in `cudb_relation` table
- Parent relationships determined by `group_id = 1` queries

### Hierarchy Queries

```sql
SELECT parent_service_id 
FROM cudb_relation 
WHERE group_id = 1 
LIMIT 1
```

## Error Handling

The service includes comprehensive error handling:

- **Connection Failures**: Graceful handling of Redis/PostgreSQL connection issues
- **Query Errors**: Individual organization failures don't stop the entire process
- **Data Validation**: Checks for missing or invalid data
- **File Operations**: Safe Excel file creation and cleanup

## Performance Considerations

- **Parallel Processing**: User and object counting operations run in parallel
- **Batch Operations**: Efficient Redis queries with proper limits
- **Connection Pooling**: Reuses database connections where possible
- **Memory Management**: Processes organizations in batches to avoid memory issues

## Comparison with Python Version

### Advantages of Node.js Version

- **Better Error Handling**: More robust error handling and recovery
- **Parallel Processing**: Native async/await for better performance
- **CLI Interface**: Comprehensive command-line interface with options
- **Test Suite**: Built-in test suite for validation
- **Modular Design**: Clean separation of concerns with dedicated modules

### Feature Parity

- ✅ Organization extraction from Redis BDS
- ✅ User statistics counting (active, non-beamer, registered)
- ✅ Object statistics counting (pages, messages, media)
- ✅ Hierarchy analysis and parent relationship mapping
- ✅ Excel file generation with hierarchy columns
- ✅ Summary statistics and top organizations
- ✅ Automatic cleanup of old files

## Troubleshooting

### Common Issues

1. **Connection Failures**: Check Redis and PostgreSQL server status
2. **Permission Errors**: Ensure database user has proper permissions
3. **Memory Issues**: For large datasets, consider processing in smaller batches
4. **File Access**: Ensure output directory is writable

### Debug Mode

Run with verbose logging:

```bash
DEBUG=* npm run generate
```

### Test Individual Components

```bash
# Test Redis connection only
node -e "import('./src/redis-client.js').then(m => new m.RedisClient().connect())"

# Test PostgreSQL connection only
node -e "import('./src/postgres-client.js').then(m => new m.PostgresClient().connect())"
```

## Development

### Project Structure

```
src/
├── index.js              # CLI interface and main entry point
├── organization-stats.js  # Main service orchestrator
├── redis-client.js       # Redis BDS operations
├── postgres-client.js    # PostgreSQL hierarchy operations
├── excel-generator.js    # Excel file generation and formatting
└── test.js              # Comprehensive test suite
```

### Adding New Features

1. **New Statistics**: Add counting methods to `redis-client.js`
2. **New Output Formats**: Extend `excel-generator.js` or create new generators
3. **New Data Sources**: Add new client modules following the existing pattern
4. **New CLI Commands**: Add commands to `index.js` using Commander.js

## License

MIT License - See LICENSE file for details.

## Support

For issues and questions, please refer to the Beam Support Team documentation or create an issue in the project repository.
