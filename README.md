# Wappalyzer Privacy Technology Scraper

A Node.js tool that scrapes the Wappalyzer database to generate privacy-focused technology detection lists for browser monitoring and privacy protection.

## Overview

This scraper fetches all technology data from Wappalyzer's GitHub repository and generates comprehensive datasets focused on privacy-related technologies. It categorizes technologies by threat level and provides detection patterns for cookies, JavaScript, and network requests.

## Features

- 🔍 **Comprehensive Data Collection**: Fetches all technologies from Wappalyzer's main branch
- 🛡️ **Privacy-Focused Analysis**: Identifies and categorizes privacy-related technologies
- 📊 **Threat Assessment**: Calculates threat levels based on technology categories
- 🍪 **Cookie Detection**: Extracts cookie patterns for tracking detection
- 🔧 **JavaScript Patterns**: Generates JavaScript detection patterns
- 🌐 **Network Monitoring**: Creates network request patterns for monitoring
- 📈 **Detailed Reporting**: Generates summary reports and statistics
- 🔌 **Extension Ready**: Outputs browser extension-compatible database format

## Installation

1. Clone or download this repository
2. Ensure you have Node.js 18.0.0 or higher installed
3. No additional dependencies required (uses built-in Node.js modules)

## Usage

### Basic Usage

```bash
# Run the scraper
npm start
# or
node wappalyzer-scraper.js
```

### Advanced Usage

```bash
# Use custom configuration
node wappalyzer-scraper.js --config custom-config.json

# Validate configuration without scraping
node wappalyzer-scraper.js --dry-run

# Show help
node wappalyzer-scraper.js --help

# Clean generated files
npm run clean
```

### Configuration

The scraper uses a `config.json` file for configuration. You can customize:

- **baseUrl**: Wappalyzer repository URL
- **outputDir**: Output directory for generated files
- **retries**: Number of retry attempts for failed requests
- **timeout**: Request timeout in milliseconds
- **userAgent**: User agent string for requests
- **privacyCategories**: Array of privacy-related category IDs
- **highRiskCategories**: Array of high-risk category IDs
- **mediumRiskCategories**: Array of medium-risk category IDs

### Output Files

The scraper generates the following files in the `wappalyzer-data/` directory:

- **`privacy-technologies.json`** - Complete list of privacy-related technologies with threat assessments
- **`cookie-patterns.json`** - Cookie detection patterns for tracking identification
- **`javascript-patterns.json`** - JavaScript patterns for client-side detection
- **`network-patterns.json`** - Network request patterns for monitoring
- **`complete-database.json`** - Full database with categories, groups, and technologies
- **`extension-database.json`** - Browser extension optimized format
- **`summary-report.json`** - Statistical summary and analysis
- **`REPORT.md`** - Human-readable analysis report

## Privacy Categories

The scraper focuses on these privacy-related technology categories:

- **Analytics** (Category 10)
- **Advertising** (Category 36)
- **Cookie Compliance** (Category 67)
- **Affiliate Programs** (Category 71)
- **Retargeting** (Category 77)
- **Browser Fingerprinting** (Category 83)
- **Customer Data Platform** (Category 97)
- **Marketing Automation** (Category 32)
- **Personalisation** (Category 76)
- **Segmentation** (Category 86)
- **Tag Managers** (Category 42)
- **RUM (Real User Monitoring)** (Category 78)

## Threat Levels

Technologies are classified by threat level:

- **High Risk** 🔴: Browser fingerprinting, retargeting, customer data platforms
- **Medium Risk** 🟡: Analytics, advertising, tag managers, marketing automation
- **Low Risk** 🟢: Other privacy-related categories

## Data Structure

### Privacy Technologies Format

```json
{
  "name": "Technology Name",
  "description": "Technology description",
  "categories": [10, 36],
  "categoryNames": ["Analytics", "Advertising"],
  "threatLevel": 2,
  "riskLevel": "medium",
  "detectionMethods": ["cookies", "javascript", "network"],
  "cookies": ["_ga", "_gid"],
  "website": "https://example.com",
  "pricing": ["freemium"],
  "saas": true
}
```

### Detection Patterns Format

```json
{
  "technology": "Google Analytics",
  "pattern": "_ga",
  "threatLevel": 2,
  "categories": [10],
  "description": "Web analytics service"
}
```

## Use Cases

- **Browser Extensions**: Privacy-focused ad blockers and tracking protection
- **Privacy Auditing**: Website privacy analysis and compliance checking
- **Research**: Academic and commercial privacy research
- **Monitoring**: Real-time privacy threat detection
- **Compliance**: GDPR/CCPA compliance assessment tools

## Technical Details

- **Node.js Version**: 18.0.0+
- **Dependencies**: None (uses built-in modules)
- **Data Source**: Wappalyzer GitHub repository (main branch)
- **Update Frequency**: Run manually to get latest data
- **Output Format**: JSON files with comprehensive metadata

## Contributing

This is a data scraping tool. To contribute:

1. Fork the repository
2. Make improvements to the scraping logic or output formats
3. Test with the latest Wappalyzer data
4. Submit a pull request

## License

MIT License - see package.json for details

## Author

Leonardo Poleto

## Data Source

This tool scrapes data from the [Wappalyzer](https://github.com/HTTPArchive/wappalyzer) project, which is licensed under the GPL-3.0 License.
