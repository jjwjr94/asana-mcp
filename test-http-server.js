#!/usr/bin/env node

/**
 * Simple test script for the Asana MCP HTTP Server
 * Run this after starting the server to test basic functionality
 */

const http = require('http');

const HOST = 'localhost';
const PORT = process.env.PORT || 3000;

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Asana MCP HTTP Server...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResult = await makeRequest('/health');
    console.log(`   Status: ${healthResult.statusCode}`);
    console.log(`   Response: ${JSON.stringify(healthResult.data, null, 2)}\n`);

    // Test 2: List tools via MCP endpoint
    console.log('2. Testing MCP tools list...');
    const mcpToolsResult = await makeRequest('/mcp', 'POST', {
      method: 'tools/list'
    });
    console.log(`   Status: ${mcpToolsResult.statusCode}`);
    console.log(`   Tools count: ${mcpToolsResult.data?.result?.tools?.length || 'N/A'}`);
    console.log(`   First tool: ${mcpToolsResult.data?.result?.tools?.[0]?.name || 'N/A'}\n`);

    // Test 3: List tools via legacy endpoint
    console.log('3. Testing legacy tools list...');
    const toolsResult = await makeRequest('/tools');
    console.log(`   Status: ${toolsResult.statusCode}`);
    console.log(`   Tools count: ${toolsResult.data.length || 'N/A'}`);
    console.log(`   First tool: ${toolsResult.data[0]?.name || 'N/A'}\n`);

    // Test 4: Test MCP endpoint without auth (should fail)
    console.log('4. Testing MCP endpoint without authentication...');
    try {
      const authResult = await makeRequest('/mcp', 'POST', {
        method: 'tools/call',
        params: {
          name: 'asana_list_workspaces'
        }
      });
      console.log(`   Status: ${authResult.statusCode}`);
      console.log(`   Expected 401, got: ${authResult.statusCode}`);
    } catch (error) {
      console.log(`   Error (expected): ${error.message}`);
    }
    console.log('');

    console.log('✅ Basic tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Set ASANA_ACCESS_TOKEN environment variable');
    console.log('2. Test MCP endpoint with authentication:');
    console.log('   curl -H "x-asana-token: YOUR_TOKEN" -X POST http://localhost:3000/mcp \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"method": "tools/list"}\'');
    console.log('\n🚀 Ready for n8n integration!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running with: npm run start:http');
  }
}

// Run tests
runTests();
