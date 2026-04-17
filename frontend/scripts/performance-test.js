#!/usr/bin/env node

const { performance } = require('perf_hooks');
const http = require('http');

// Performance testing configuration
const config = {
  baseUrl: process.env.TEST_URL || 'http://localhost:5000',
  concurrency: parseInt(process.env.CONCURRENCY) || 10,
  duration: parseInt(process.env.DURATION) || 30, // seconds
  endpoints: [
    '/health',
    '/api/auth/me',
    '/api/complaints/reports',
    '/api/incidents/reports',
    '/api/fuel-maintenance/requests'
  ]
};

class PerformanceTester {
  constructor(config) {
    this.config = config;
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      startTime: null,
      endTime: null
    };
  }

  async makeRequest(endpoint) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      const req = http.get(`${this.config.baseUrl}${endpoint}`, (res) => {
        let data = '';
        
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          this.results.totalRequests++;
          this.results.responseTimes.push(responseTime);
          
          if (res.statusCode >= 200 && res.statusCode < 400) {
            this.results.successfulRequests++;
          } else {
            this.results.failedRequests++;
            this.results.errors.push({
              endpoint,
              statusCode: res.statusCode,
              responseTime
            });
          }
          
          resolve({
            statusCode: res.statusCode,
            responseTime,
            dataSize: data.length
          });
        });
      });
      
      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.results.totalRequests++;
        this.results.failedRequests++;
        this.results.responseTimes.push(responseTime);
        this.results.errors.push({
          endpoint,
          error: error.message,
          responseTime
        });
        
        resolve({
          error: error.message,
          responseTime
        });
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.results.totalRequests++;
        this.results.failedRequests++;
        this.results.responseTimes.push(responseTime);
        this.results.errors.push({
          endpoint,
          error: 'Timeout',
          responseTime
        });
        
        resolve({
          error: 'Timeout',
          responseTime
        });
      });
    });
  }

  async runSingleWorker(workerId) {
    const endTime = Date.now() + (this.config.duration * 1000);
    let requestCount = 0;
    
    while (Date.now() < endTime) {
      const endpoint = this.config.endpoints[requestCount % this.config.endpoints.length];
      await this.makeRequest(endpoint);
      requestCount++;
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    }
    
    console.log(`Worker ${workerId} completed ${requestCount} requests`);
  }

  async runTest() {
    console.log(`Starting performance test with ${this.config.concurrency} concurrent workers`);
    console.log(`Test duration: ${this.config.duration} seconds`);
    console.log(`Target URL: ${this.config.baseUrl}`);
    console.log('Endpoints to test:', this.config.endpoints);
    console.log('---');
    
    this.results.startTime = new Date().toISOString();
    
    const workers = [];
    for (let i = 0; i < this.config.concurrency; i++) {
      workers.push(this.runSingleWorker(i));
    }
    
    await Promise.all(workers);
    
    this.results.endTime = new Date().toISOString();
    this.generateReport();
  }

  generateReport() {
    const responseTimes = this.results.responseTimes.sort((a, b) => a - b);
    const totalDuration = (new Date(this.results.endTime) - new Date(this.results.startTime)) / 1000;
    
    const stats = {
      totalRequests: this.results.totalRequests,
      successfulRequests: this.results.successfulRequests,
      failedRequests: this.results.failedRequests,
      successRate: ((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2) + '%',
      requestsPerSecond: (this.results.totalRequests / totalDuration).toFixed(2),
      avgResponseTime: (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2) + 'ms',
      minResponseTime: responseTimes[0]?.toFixed(2) + 'ms' || 'N/A',
      maxResponseTime: responseTimes[responseTimes.length - 1]?.toFixed(2) + 'ms' || 'N/A',
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)]?.toFixed(2) + 'ms' || 'N/A',
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)]?.toFixed(2) + 'ms' || 'N/A',
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)]?.toFixed(2) + 'ms' || 'N/A',
      testDuration: totalDuration.toFixed(2) + 's'
    };
    
    console.log('\n=== PERFORMANCE TEST RESULTS ===');
    console.log(`Test Period: ${this.results.startTime} to ${this.results.endTime}`);
    console.log(`Total Duration: ${stats.testDuration}`);
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Successful Requests: ${stats.successfulRequests}`);
    console.log(`Failed Requests: ${stats.failedRequests}`);
    console.log(`Success Rate: ${stats.successRate}`);
    console.log(`Requests/Second: ${stats.requestsPerSecond}`);
    console.log(`Average Response Time: ${stats.avgResponseTime}`);
    console.log(`Min Response Time: ${stats.minResponseTime}`);
    console.log(`Max Response Time: ${stats.maxResponseTime}`);
    console.log(`50th Percentile: ${stats.p50}`);
    console.log(`95th Percentile: ${stats.p95}`);
    console.log(`99th Percentile: ${stats.p99}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n=== ERRORS ===');
      console.log(`Total Errors: ${this.results.errors.length}`);
      
      const errorCounts = {};
      this.results.errors.forEach(error => {
        const key = error.error || `HTTP ${error.statusCode}`;
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      });
      
      Object.entries(errorCounts).forEach(([error, count]) => {
        console.log(`${error}: ${count} occurrences`);
      });
      
      // Show first few errors for debugging
      console.log('\nFirst 5 errors:');
      this.results.errors.slice(0, 5).forEach((error, index) => {
        console.log(`${index + 1}. ${error.endpoint}: ${error.error || `HTTP ${error.statusCode}`} (${error.responseTime}ms)`);
      });
    }
    
    // Performance recommendations
    console.log('\n=== PERFORMANCE RECOMMENDATIONS ===');
    
    if (parseFloat(stats.avgResponseTime) > 1000) {
      console.log('WARNING: Average response time is high (>1s). Consider optimization.');
    }
    
    if (parseFloat(stats.p95) > 2000) {
      console.log('WARNING: 95th percentile response time is high (>2s). Check for slow queries.');
    }
    
    if (parseFloat(stats.successRate) < 95) {
      console.log('WARNING: Success rate is low (<95%). Check for errors.');
    }
    
    if (parseFloat(stats.requestsPerSecond) < 50) {
      console.log('INFO: Low throughput detected. Consider scaling or optimization.');
    }
    
    console.log('\n=== TEST COMPLETED ===');
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  const tester = new PerformanceTester(config);
  tester.runTest().catch(console.error);
}

module.exports = PerformanceTester;
