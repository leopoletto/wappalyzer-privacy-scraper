/**
 * Wappalyzer Database Scraper
 *
 * This script fetches all technology data from Wappalyzer's GitHub repository
 * and generates a flat list with privacy threat assessments for browser monitoring.
 *
 * Usage: node wappalyzer-scraper.js
 */

const fs = require('fs').promises;
const path = require('path');

class WappalyzerScraper {
  constructor(configPath = './config.json') {
    this.config = this.loadConfig(configPath);
    this.baseUrl = this.config.baseUrl;
    this.outputDir = this.config.outputDir;
    this.retries = this.config.retries || 3;
    this.timeout = this.config.timeout || 30000;
    this.userAgent = this.config.userAgent;
    this.privacyCategories = new Set(this.config.privacyCategories);
    this.highRiskCategories = new Set(this.config.highRiskCategories);
    this.mediumRiskCategories = new Set(this.config.mediumRiskCategories);
  }

  loadConfig(configPath) {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.warn(`⚠️  Could not load config from ${configPath}, using defaults`);
      return {
        baseUrl: 'https://raw.githubusercontent.com/HTTPArchive/wappalyzer/refs/heads/main/src',
        outputDir: './wappalyzer-data',
        retries: 3,
        timeout: 30000,
        userAgent: 'Wappalyzer-Privacy-Scraper/1.0.0',
        privacyCategories: [10, 36, 67, 71, 77, 83, 97, 32, 76, 86, 42, 78],
        highRiskCategories: [83, 77, 97],
        mediumRiskCategories: [10, 36, 42, 32]
      };
    }
  }

  async run() {
    console.log('🚀 Starting Wappalyzer database scraping...');

    try {
      // Validate configuration
      this.validateConfiguration();

      // Create output directory
      await this.ensureDirectory(this.outputDir);

      // Fetch categories and groups
      console.log('📥 Fetching categories and groups...');
      const [categories, groups] = await Promise.all([
        this.fetchJson(`${this.baseUrl}/categories.json`),
        this.fetchJson(`${this.baseUrl}/groups.json`)
      ]);

      // Validate fetched data
      this.validateCategories(categories);
      this.validateGroups(groups);

      // Fetch all technologies
      const technologies = await this.fetchAllTechnologies();

      // Validate technologies data
      this.validateTechnologies(technologies);

      // Generate comprehensive datasets
      console.log('🔄 Generating datasets...');
      await this.generateDatasets(categories, groups, technologies);

      console.log('✅ Database scraping completed successfully!');
      console.log(`📁 Output saved to: ${path.resolve(this.outputDir)}`);

    } catch (error) {
      console.error('❌ Error during scraping:', error.message);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  }

  validateConfiguration() {
    if (!this.baseUrl || typeof this.baseUrl !== 'string') {
      throw new Error('Invalid baseUrl configuration');
    }
    if (!this.outputDir || typeof this.outputDir !== 'string') {
      throw new Error('Invalid outputDir configuration');
    }
    if (!this.privacyCategories || !(this.privacyCategories instanceof Set)) {
      throw new Error('Invalid privacyCategories configuration');
    }
    console.log('✅ Configuration validated');
  }

  validateCategories(categories) {
    if (!categories || typeof categories !== 'object') {
      throw new Error('Invalid categories data received');
    }
    console.log(`✅ Categories validated: ${Object.keys(categories).length} categories`);
  }

  validateGroups(groups) {
    if (!groups || typeof groups !== 'object') {
      throw new Error('Invalid groups data received');
    }
    console.log(`✅ Groups validated: ${Object.keys(groups).length} groups`);
  }

  validateTechnologies(technologies) {
    if (!technologies || typeof technologies !== 'object') {
      throw new Error('Invalid technologies data received');
    }
    const techCount = Object.keys(technologies).length;
    if (techCount === 0) {
      throw new Error('No technologies loaded');
    }
    console.log(`✅ Technologies validated: ${techCount} technologies`);
  }

  async fetchJson(url, retries = null) {
    const maxRetries = retries || this.retries;
    console.log(`Fetching: ${url}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent
          },
          timeout: this.timeout
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid JSON response: not an object');
        }
        
        return data;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const errorMsg = `Failed to fetch ${url} (attempt ${attempt}/${maxRetries}): ${error.message}`;
        
        if (isLastAttempt) {
          console.error(errorMsg);
          throw new Error(errorMsg);
        } else {
          console.warn(`${errorMsg} - Retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
      }
    }
  }

  async fetchAllTechnologies() {
    console.log('Fetching all technology files...');

    const technologies = {};
    const letters = 'abcdefghijklmnopqrstuvwxyz_'.split('');
    const fetchPromises = [];
    let completed = 0;

    for (const letter of letters) {
      const promise = this.fetchJson(`${this.baseUrl}/technologies/${letter}.json`)
          .then(data => {
            completed++;
            const progress = Math.round((completed / letters.length) * 100);
            console.log(`[${progress}%] Loaded ${Object.keys(data).length} technologies from ${letter}.json`);
            return { letter, data };
          })
          .catch(error => {
            completed++;
            const progress = Math.round((completed / letters.length) * 100);
            console.warn(`[${progress}%] Failed to fetch ${letter}.json:`, error.message);
            return { letter, data: {} };
          });

      fetchPromises.push(promise);
    }

    const results = await Promise.all(fetchPromises);

    results.forEach(({ letter, data }) => {
      Object.assign(technologies, data);
    });

    console.log(`✅ Total technologies loaded: ${Object.keys(technologies).length}`);
    return technologies;
  }

  async generateDatasets(categories, groups, technologies) {
    console.log('Generating datasets...');

    // Process datasets in batches to manage memory usage
    const datasets = [
      { name: 'privacy-technologies', generator: () => this.generatePrivacyTechnologies(categories, technologies) },
      { name: 'cookie-patterns', generator: () => this.generateCookiePatterns(technologies) },
      { name: 'javascript-patterns', generator: () => this.generateJavaScriptPatterns(technologies) },
      { name: 'network-patterns', generator: () => this.generateNetworkPatterns(technologies) }
    ];

    // Generate and save each dataset individually
    for (const dataset of datasets) {
      console.log(`🔄 Generating ${dataset.name}...`);
      const data = dataset.generator();
      await this.saveJson(`${dataset.name}.json`, data);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }

    // Generate privacy technologies for later use
    console.log('🔄 Generating privacy technologies for reports...');
    const privacyTechnologies = this.generatePrivacyTechnologies(categories, technologies);

    // 5. Complete technology database (stream to avoid memory issues)
    console.log('🔄 Generating complete database...');
    const completeDb = {
      categories,
      groups,
      technologies,
      metadata: {
        totalTechnologies: Object.keys(technologies).length,
        privacyTechnologies: privacyTechnologies.length,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
    await this.saveJson('complete-database.json', completeDb);

    // 6. Browser extension ready format
    console.log('🔄 Generating extension database...');
    const extensionDb = this.generateExtensionDatabase(categories, technologies);
    await this.saveJson('extension-database.json', extensionDb);

    // 7. Generate summary report
    console.log('🔄 Generating summary report...');
    await this.generateSummaryReport(categories, technologies, privacyTechnologies);

    console.log('✅ All datasets generated successfully');
  }

  generatePrivacyTechnologies(categories, technologies) {
    const privacyTechs = [];
    let invalidTechs = 0;

    Object.entries(technologies).forEach(([name, tech]) => {
      // Validate technology data
      if (!tech || typeof tech !== 'object') {
        invalidTechs++;
        return;
      }

      if (!tech.cats || !Array.isArray(tech.cats)) {
        invalidTechs++;
        return;
      }

      const hasPrivacyCategory = tech.cats.some(cat => 
        typeof cat === 'number' && this.privacyCategories.has(cat)
      );
      if (!hasPrivacyCategory) return;

      const threatLevel = this.calculateThreatLevel(tech.cats);
      const categoryNames = tech.cats.map(cat => {
        if (typeof cat !== 'number' || !categories[cat]) {
          return `Unknown(${cat})`;
        }
        return categories[cat].name || `Unknown(${cat})`;
      });

      privacyTechs.push({
        name: String(name || ''),
        description: String(tech.description || ''),
        categories: tech.cats.filter(cat => typeof cat === 'number'),
        categoryNames,
        threatLevel,
        riskLevel: this.getRiskLevel(threatLevel),
        detectionMethods: this.extractDetectionMethods(tech),
        cookies: this.extractCookies(tech),
        website: String(tech.website || ''),
        pricing: Array.isArray(tech.pricing) ? tech.pricing : [],
        saas: Boolean(tech.saas)
      });
    });

    // Sort by threat level (high to low)
    privacyTechs.sort((a, b) => b.threatLevel - a.threatLevel);

    if (invalidTechs > 0) {
      console.warn(`⚠️  Skipped ${invalidTechs} invalid technologies`);
    }

    console.log(`📋 Generated ${privacyTechs.length} privacy-related technologies`);
    return privacyTechs;
  }

  generateCookiePatterns(technologies) {
    const patterns = [];

    Object.entries(technologies).forEach(([name, tech]) => {
      if (!tech.cookies) return;

      const cookiePatterns = typeof tech.cookies === 'object' ? Object.keys(tech.cookies) : [tech.cookies];

      cookiePatterns.forEach(pattern => {
        patterns.push({
          technology: name,
          pattern,
          threatLevel: this.calculateThreatLevel(tech.cats || []),
          categories: tech.cats || [],
          description: tech.description || ''
        });
      });
    });

    console.log(`🍪 Generated ${patterns.length} cookie detection patterns`);
    return patterns;
  }

  generateJavaScriptPatterns(technologies) {
    const patterns = [];

    Object.entries(technologies).forEach(([name, tech]) => {
      if (!tech.js) return;

      const jsPatterns = typeof tech.js === 'object' ? Object.keys(tech.js) : [tech.js];

      jsPatterns.forEach(pattern => {
        patterns.push({
          technology: name,
          pattern,
          threatLevel: this.calculateThreatLevel(tech.cats || []),
          categories: tech.cats || [],
          description: tech.description || ''
        });
      });
    });

    console.log(`🔧 Generated ${patterns.length} JavaScript detection patterns`);
    return patterns;
  }

  generateNetworkPatterns(technologies) {
    const patterns = [];

    Object.entries(technologies).forEach(([name, tech]) => {
      const networkSources = ['scriptSrc', 'xhr', 'dom'];

      networkSources.forEach(source => {
        if (!tech[source]) return;

        const sourcePatterns = Array.isArray(tech[source]) ? tech[source] : [tech[source]];

        sourcePatterns.forEach(pattern => {
          // Handle different pattern types safely
          const patternStr = typeof pattern === 'string' ? pattern :
              typeof pattern === 'object' ? JSON.stringify(pattern) :
                  String(pattern);

          // Skip DOM patterns that aren't URLs (only for string patterns)
          if (source === 'dom' && typeof pattern === 'string' && !pattern.includes('http')) return;

          patterns.push({
            technology: name,
            type: source,
            pattern: patternStr,
            threatLevel: this.calculateThreatLevel(tech.cats || []),
            categories: tech.cats || [],
            description: tech.description || ''
          });
        });
      });
    });

    console.log(`🌐 Generated ${patterns.length} network detection patterns`);
    return patterns;
  }

  generateExtensionDatabase(categories, technologies) {
    const db = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      categories: {},
      privacyCategories: Array.from(this.privacyCategories),
      technologies: {}
    };

    // Include only relevant categories
    this.privacyCategories.forEach(catId => {
      if (categories[catId]) {
        db.categories[catId] = categories[catId];
      }
    });

    // Include only privacy-related technologies with simplified structure
    Object.entries(technologies).forEach(([name, tech]) => {
      if (!tech.cats || !tech.cats.some(cat => this.privacyCategories.has(cat))) return;

      db.technologies[name] = {
        cats: tech.cats,
        description: tech.description || '',
        threatLevel: this.calculateThreatLevel(tech.cats),
        cookies: tech.cookies || {},
        js: tech.js || {},
        scriptSrc: tech.scriptSrc || [],
        xhr: tech.xhr || [],
        dom: tech.dom || [],
        headers: tech.headers || {},
        saas: tech.saas || false,
        pricing: tech.pricing || []
      };
    });

    console.log(`🔌 Generated extension database with ${Object.keys(db.technologies).length} technologies`);
    return db;
  }

  async generateSummaryReport(categories, technologies, privacyTechnologies) {
    const report = {
      summary: {
        totalTechnologies: Object.keys(technologies).length,
        privacyRelatedTechnologies: privacyTechnologies.length,
        privacyPercentage: ((privacyTechnologies.length / Object.keys(technologies).length) * 100).toFixed(1)
      },
      riskDistribution: {
        high: privacyTechnologies.filter(t => t.riskLevel === 'high').length,
        medium: privacyTechnologies.filter(t => t.riskLevel === 'medium').length,
        low: privacyTechnologies.filter(t => t.riskLevel === 'low').length
      },
      categoryBreakdown: {},
      topThreats: privacyTechnologies.slice(0, 20).map(t => ({
        name: t.name,
        threatLevel: t.threatLevel,
        riskLevel: t.riskLevel,
        categories: t.categoryNames
      })),
      detectionMethodStats: {
        cookies: privacyTechnologies.filter(t => t.cookies.length > 0).length,
        javascript: privacyTechnologies.filter(t => t.detectionMethods.includes('javascript')).length,
        network: privacyTechnologies.filter(t => t.detectionMethods.includes('network')).length,
        dom: privacyTechnologies.filter(t => t.detectionMethods.includes('dom')).length
      }
    };

    // Category breakdown
    this.privacyCategories.forEach(catId => {
      const categoryName = categories[catId]?.name || `Unknown(${catId})`;
      const count = privacyTechnologies.filter(t => t.categories.includes(catId)).length;
      report.categoryBreakdown[categoryName] = count;
    });

    await this.saveJson('summary-report.json', report);

    // Generate human-readable report
    const readableReport = this.generateReadableReport(report);
    await fs.writeFile(path.join(this.outputDir, 'REPORT.md'), readableReport);

    console.log('📊 Generated summary report');
  }

  generateReadableReport(report) {
    return `# Wappalyzer Privacy Technology Analysis Report

Generated on: ${new Date().toLocaleDateString()}

## Summary
- **Total Technologies**: ${report.summary.totalTechnologies.toLocaleString()}
- **Privacy-Related Technologies**: ${report.summary.privacyRelatedTechnologies.toLocaleString()} (${report.summary.privacyPercentage}%)

## Risk Distribution
- 🔴 **High Risk**: ${report.riskDistribution.high} technologies
- 🟡 **Medium Risk**: ${report.riskDistribution.medium} technologies  
- 🟢 **Low Risk**: ${report.riskDistribution.low} technologies

## Category Breakdown
${Object.entries(report.categoryBreakdown)
        .sort(([,a], [,b]) => b - a)
        .map(([category, count]) => `- **${category}**: ${count} technologies`)
        .join('\n')}

## Detection Method Coverage
- 🍪 **Cookie Detection**: ${report.detectionMethodStats.cookies} technologies
- 🔧 **JavaScript Detection**: ${report.detectionMethodStats.javascript} technologies
- 🌐 **Network Detection**: ${report.detectionMethodStats.network} technologies
- 📄 **DOM Detection**: ${report.detectionMethodStats.dom} technologies

## Top 20 Privacy Threats
${report.topThreats.map((tech, i) =>
        `${i + 1}. **${tech.name}** (${tech.riskLevel.toUpperCase()}) - ${tech.categories.join(', ')}`
    ).join('\n')}

---
*Report generated by Wappalyzer Privacy Technology Scraper*
`;
  }

  calculateThreatLevel(categories) {
    if (categories.some(cat => this.highRiskCategories.has(cat))) return 3;
    if (categories.some(cat => this.mediumRiskCategories.has(cat))) return 2;
    if (categories.some(cat => this.privacyCategories.has(cat))) return 1;
    return 0;
  }

  getRiskLevel(threatLevel) {
    if (threatLevel >= 3) return 'high';
    if (threatLevel >= 2) return 'medium';
    if (threatLevel >= 1) return 'low';
    return 'none';
  }

  extractDetectionMethods(tech) {
    const methods = [];
    if (tech.cookies) methods.push('cookies');
    if (tech.js) methods.push('javascript');
    if (tech.scriptSrc || tech.xhr) methods.push('network');
    if (tech.dom || tech.html) methods.push('dom');
    if (tech.headers) methods.push('headers');
    return methods;
  }

  extractCookies(tech) {
    if (!tech.cookies) return [];
    if (typeof tech.cookies === 'object') return Object.keys(tech.cookies);
    return [tech.cookies];
  }

  async ensureDirectory(dir) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  async saveJson(filename, data) {
    const filepath = path.join(this.outputDir, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`💾 Saved: ${filename}`);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const configPath = args.includes('--config') ? args[args.indexOf('--config') + 1] : './config.json';
  const dryRun = args.includes('--dry-run');
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Wappalyzer Privacy Technology Scraper

Usage: node wappalyzer-scraper.js [options]

Options:
  --config <path>    Path to configuration file (default: ./config.json)
  --dry-run          Validate configuration and exit without scraping
  --help, -h         Show this help message

Examples:
  node wappalyzer-scraper.js
  node wappalyzer-scraper.js --config custom-config.json
  node wappalyzer-scraper.js --dry-run
`);
    process.exit(0);
  }

  const scraper = new WappalyzerScraper(configPath);
  
  if (dryRun) {
    console.log('🔍 Dry run mode - validating configuration...');
    try {
      scraper.validateConfiguration();
      console.log('✅ Configuration is valid');
      process.exit(0);
    } catch (error) {
      console.error('❌ Configuration validation failed:', error.message);
      process.exit(1);
    }
  } else {
    scraper.run();
  }
}

module.exports = WappalyzerScraper;