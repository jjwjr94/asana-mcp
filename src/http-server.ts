#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { VERSION } from './version.js';
import { tool_handler, list_of_tools } from './tool-handler.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AsanaClientWrapper } from './asana-client-wrapper.js';
import { createPromptHandlers } from './prompt-handler.js';
import { createResourceHandlers } from './resource-handler.js';

interface StreamResponse {
  id: string;
  type: 'data' | 'error' | 'complete';
  data?: any;
  error?: string;
}

class AsanaHttpServer {
  private app: express.Application;
  private server: Server;
  private asanaClient: AsanaClientWrapper;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeMCP();
  }

  private setupMiddleware() {
    // Security middleware - configure for Render deployment
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
    
    // CORS for n8n integration - allow Render domains
    this.app.use(cors({
      origin: [
        'https://*.render.com',
        'https://*.n8n.cloud',
        'https://*.n8n.io',
        'http://localhost:3000',
        'http://localhost:5678' // n8n local development
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-asana-token']
    }));
    
    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    
    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  private initializeMCP() {
    // Get Asana token from environment or request headers
    const getAsanaToken = (req?: express.Request): string => {
      // Priority: 1. Request header, 2. Environment variable
      const token = req?.headers['x-asana-token'] as string || process.env.ASANA_ACCESS_TOKEN;
      
      if (!token) {
        throw new Error("Asana access token required. Set ASANA_ACCESS_TOKEN environment variable or pass x-asana-token header.");
      }
      
      return token;
    };

    this.asanaClient = new AsanaClientWrapper(getAsanaToken());
    
    this.server = new Server(
      {
        name: "Asana MCP HTTP Server",
        version: VERSION,
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {}
        },
      }
    );

    // Set up MCP handlers
    this.server.setRequestHandler(
      CallToolRequestSchema,
      tool_handler(this.asanaClient)
    );

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log("Received ListToolsRequest");
      return {
        tools: list_of_tools,
      };
    });

    const promptHandlers = createPromptHandlers(this.asanaClient);
    this.server.setRequestHandler(ListPromptsRequestSchema, promptHandlers.listPrompts);
    this.server.setRequestHandler(GetPromptRequestSchema, promptHandlers.getPrompt);

    const resourceHandlers = createResourceHandlers(this.asanaClient);
    this.server.setRequestHandler(ListResourcesRequestSchema, resourceHandlers.listResources);
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, resourceHandlers.listResourceTemplates);
    this.server.setRequestHandler(ReadResourceRequestSchema, resourceHandlers.readResource);
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        version: VERSION,
        timestamp: new Date().toISOString()
      });
    });

    // MCP HTTP Streaming endpoint - handles all MCP operations
    this.app.post('/mcp', async (req, res) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Set headers for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      try {
        // Get fresh asana client with token from request
        const asanaToken = req.headers['x-asana-token'] as string || process.env.ASANA_ACCESS_TOKEN;
        if (!asanaToken) {
          this.sendStreamResponse(res, requestId, 'error', null, 'Asana access token required');
          res.end();
          return;
        }

        const asanaClient = new AsanaClientWrapper(asanaToken);
        const toolHandler = tool_handler(asanaClient);

        const { method, params } = req.body;

        if (!method) {
          this.sendStreamResponse(res, requestId, 'error', null, 'MCP method is required');
          res.end();
          return;
        }

        // Send initial response
        this.sendStreamResponse(res, requestId, 'data', { 
          message: `Starting MCP operation: ${method}`,
          method: method,
          params: params
        });

        let result;
        
        // Handle different MCP methods
        switch (method) {
          case 'tools/list':
            result = await this.server.handleRequest({
              jsonrpc: "2.0",
              id: requestId,
              method: "tools/list",
              params: {}
            });
            break;
            
          case 'tools/call':
            if (!params || !params.name) {
              this.sendStreamResponse(res, requestId, 'error', null, 'Tool name is required for tools/call');
              res.end();
              return;
            }
            
            // Find the tool
            const tool = list_of_tools.find(t => t.name === params.name);
            if (!tool) {
              this.sendStreamResponse(res, requestId, 'error', null, `Tool '${params.name}' not found`);
              res.end();
              return;
            }
            
            result = await toolHandler({
              jsonrpc: "2.0",
              id: requestId,
              method: "tools/call",
              params: {
                name: params.name,
                arguments: params.arguments || {}
              }
            });
            break;
            
          case 'prompts/list':
            const promptHandlers = createPromptHandlers(asanaClient);
            result = await promptHandlers.listPrompts({
              jsonrpc: "2.0",
              id: requestId,
              method: "prompts/list",
              params: {}
            });
            break;
            
          case 'prompts/get':
            if (!params || !params.name) {
              this.sendStreamResponse(res, requestId, 'error', null, 'Prompt name is required for prompts/get');
              res.end();
              return;
            }
            
            const promptHandlers2 = createPromptHandlers(asanaClient);
            result = await promptHandlers2.getPrompt({
              jsonrpc: "2.0",
              id: requestId,
              method: "prompts/get",
              params: { name: params.name }
            });
            break;
            
          case 'resources/list':
            const resourceHandlers = createResourceHandlers(asanaClient);
            result = await resourceHandlers.listResources({
              jsonrpc: "2.0",
              id: requestId,
              method: "resources/list",
              params: {}
            });
            break;
            
          case 'resources/read':
            if (!params || !params.uri) {
              this.sendStreamResponse(res, requestId, 'error', null, 'Resource URI is required for resources/read');
              res.end();
              return;
            }
            
            const resourceHandlers2 = createResourceHandlers(asanaClient);
            result = await resourceHandlers2.readResource({
              jsonrpc: "2.0",
              id: requestId,
              method: "resources/read",
              params: { uri: params.uri }
            });
            break;
            
          default:
            this.sendStreamResponse(res, requestId, 'error', null, `Unsupported MCP method: ${method}`);
            res.end();
            return;
        }

        // Send the result
        this.sendStreamResponse(res, requestId, 'data', result);

        // Send completion
        this.sendStreamResponse(res, requestId, 'complete', { message: 'MCP operation completed' });

      } catch (error) {
        console.error('Error executing MCP operation:', error);
        this.sendStreamResponse(res, requestId, 'error', null, error instanceof Error ? error.message : 'Unknown error');
      }

      res.end();
    });

    // Legacy endpoints for backward compatibility
    this.app.get('/tools', (req, res) => {
      res.json(list_of_tools);
    });

    // Execute a tool with streaming response (legacy)
    this.app.post('/tools/execute', async (req, res) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Set headers for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      try {
        // Get fresh asana client with token from request
        const asanaToken = req.headers['x-asana-token'] as string || process.env.ASANA_ACCESS_TOKEN;
        if (!asanaToken) {
          this.sendStreamResponse(res, requestId, 'error', null, 'Asana access token required');
          res.end();
          return;
        }

        const asanaClient = new AsanaClientWrapper(asanaToken);
        const toolHandler = tool_handler(asanaClient);

        const { toolName, arguments: toolArgs } = req.body;

        if (!toolName) {
          this.sendStreamResponse(res, requestId, 'error', null, 'Tool name is required');
          res.end();
          return;
        }

        // Find the tool
        const tool = list_of_tools.find(t => t.name === toolName);
        if (!tool) {
          this.sendStreamResponse(res, requestId, 'error', null, `Tool '${toolName}' not found`);
          res.end();
          return;
        }

        // Send initial response
        this.sendStreamResponse(res, requestId, 'data', { 
          message: `Starting execution of tool: ${toolName}`,
          tool: tool.name,
          arguments: toolArgs
        });

        // Execute the tool
        const result = await toolHandler({
          jsonrpc: "2.0",
          id: requestId,
          method: "tools/call",
          params: {
            name: toolName,
            arguments: toolArgs || {}
          }
        });

        // Send the result
        this.sendStreamResponse(res, requestId, 'data', result);

        // Send completion
        this.sendStreamResponse(res, requestId, 'complete', { message: 'Tool execution completed' });

      } catch (error) {
        console.error('Error executing tool:', error);
        this.sendStreamResponse(res, requestId, 'error', null, error instanceof Error ? error.message : 'Unknown error');
      }

      res.end();
    });

    // Execute a tool without streaming (for compatibility)
    this.app.post('/tools/:toolName', async (req, res) => {
      try {
        const { toolName } = req.params;
        const toolArgs = req.body;

        const asanaToken = req.headers['x-asana-token'] as string || process.env.ASANA_ACCESS_TOKEN;
        if (!asanaToken) {
          return res.status(401).json({ error: 'Asana access token required' });
        }

        const asanaClient = new AsanaClientWrapper(asanaToken);
        const toolHandler = tool_handler(asanaClient);

        const tool = list_of_tools.find(t => t.name === toolName);
        if (!tool) {
          return res.status(404).json({ error: `Tool '${toolName}' not found` });
        }

        const result = await toolHandler({
          jsonrpc: "2.0",
          id: `req_${Date.now()}`,
          method: "tools/call",
          params: {
            name: toolName,
            arguments: toolArgs || {}
          }
        });

        res.json(result);
      } catch (error) {
        console.error('Error executing tool:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Get prompts
    this.app.get('/prompts', async (req, res) => {
      try {
        const asanaToken = req.headers['x-asana-token'] as string || process.env.ASANA_ACCESS_TOKEN;
        if (!asanaToken) {
          return res.status(401).json({ error: 'Asana access token required' });
        }

        const asanaClient = new AsanaClientWrapper(asanaToken);
        const promptHandlers = createPromptHandlers(asanaClient);
        
        const result = await promptHandlers.listPrompts({
          jsonrpc: "2.0",
          id: "prompts_list",
          method: "prompts/list",
          params: {}
        });

        res.json(result);
      } catch (error) {
        console.error('Error listing prompts:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Get a specific prompt
    this.app.get('/prompts/:promptName', async (req, res) => {
      try {
        const { promptName } = req.params;
        
        const asanaToken = req.headers['x-asana-token'] as string || process.env.ASANA_ACCESS_TOKEN;
        if (!asanaToken) {
          return res.status(401).json({ error: 'Asana access token required' });
        }

        const asanaClient = new AsanaClientWrapper(asanaToken);
        const promptHandlers = createPromptHandlers(asanaClient);
        
        const result = await promptHandlers.getPrompt({
          jsonrpc: "2.0",
          id: "prompt_get",
          method: "prompts/get",
          params: { name: promptName }
        });

        res.json(result);
      } catch (error) {
        console.error('Error getting prompt:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Error handling middleware
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  private sendStreamResponse(res: express.Response, id: string, type: 'data' | 'error' | 'complete', data?: any, error?: string) {
    const response: StreamResponse = {
      id,
      type,
      data,
      error
    };
    
    res.write(`data: ${JSON.stringify(response)}\n\n`);
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`Asana MCP HTTP Server running on port ${this.port}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
      console.log(`Tools list: http://localhost:${this.port}/tools`);
      console.log(`Execute tool: POST http://localhost:${this.port}/tools/execute`);
    });
  }
}

// Main execution
async function main() {
  const port = parseInt(process.env.PORT || '3000', 10);
  const server = new AsanaHttpServer(port);
  server.start();
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
