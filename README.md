# Asana MCP Server

A Model Context Protocol (MCP) server for Asana that provides HTTP streaming capabilities for n8n integration and other automation platforms.

## Features

- **MCP Protocol**: Full Model Context Protocol implementation
- **HTTP Streaming**: REST API with Server-Sent Events (SSE) support
- **n8n Integration**: Designed specifically for n8n workflow automation
- **Asana Integration**: Complete access to Asana API via MCP tools
- **Cloud Deployment**: Ready for Render, Docker, and other platforms
- **Authentication**: Support for Asana tokens via headers or environment variables

## Quick Start

### Option 1: Deploy to Render (Recommended)

1. **Fork/Clone this repository**
2. **Connect to Render**:
   - Go to [render.com](https://render.com)
   - Create a new Web Service
   - Connect your GitHub repository
   - Set build command: `npm ci && npm run build`
   - Set start command: `npm run start:http`
   - Add environment variable: `ASANA_ACCESS_TOKEN` with your Asana token

3. **Configure Environment Variables**:
   - `ASANA_ACCESS_TOKEN`: Your Asana personal access token
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render default)

### Option 2: Docker Deployment

```bash
# Build and run with docker-compose
docker-compose up -d

# Or build manually
docker build -t asana-mcp-http .
docker run -p 3000:3000 -e ASANA_ACCESS_TOKEN=your_token asana-mcp-http
```

### Option 3: Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env
# Edit .env with your Asana token

# Build
npm run build

# Start HTTP server
npm run start:http

# Or start MCP server (stdio)
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### MCP HTTP Streaming (Primary Endpoint)
```
POST /mcp
Headers: x-asana-token: YOUR_ASANA_TOKEN
Content-Type: application/json

Body: {
  "method": "tools/list"
}

Body: {
  "method": "tools/call",
  "params": {
    "name": "asana_search_tasks",
    "arguments": {
      "text": "project planning"
    }
  }
}
```

### Legacy Endpoints (Backward Compatibility)
```
GET /tools                    # List all tools
POST /tools/execute           # Execute tool with streaming
POST /tools/{toolName}        # Execute specific tool
GET /prompts                  # List prompts
GET /prompts/{name}           # Get specific prompt
```

## n8n Integration

### Basic Setup

1. **Get your Render URL**: After deployment, your service will be available at `https://your-service-name.onrender.com`

2. **Create n8n Workflow**:
   - Add an HTTP Request node
   - Set URL: `https://your-service-name.onrender.com/mcp`
   - Add header: `x-asana-token: {{ $secret.asana_token }}`

3. **Store Asana Token as n8n Secret**:
   - Go to Settings → Secrets
   - Add new secret named `asana_token`
   - Value: Your Asana personal access token

### Example Workflows

#### Create Task from Form
```
1. Webhook Node (receive form data)
2. HTTP Request Node:
   - Method: POST
   - URL: https://your-service-name.onrender.com/mcp
   - Headers: x-asana-token: {{ $secret.asana_token }}
   - Body: {
       "method": "tools/call",
       "params": {
         "name": "asana_create_task",
         "arguments": {
           "name": "{{ $json.title }}",
           "notes": "{{ $json.description }}",
           "projects": ["1234567890"]
         }
       }
     }
```

#### Monitor Project Tasks
```
1. Cron Node (every hour)
2. HTTP Request Node:
   - Method: POST
   - URL: https://your-service-name.onrender.com/mcp
   - Headers: x-asana-token: {{ $secret.asana_token }}
   - Body: {
       "method": "tools/call",
       "params": {
         "name": "asana_get_project_task_counts",
         "arguments": {
           "project_gid": "1234567890"
         }
       }
     }
```

## Available Tools

### Task Management
- `asana_search_tasks` - Search for tasks
- `asana_get_task` - Get task details
- `asana_create_task` - Create task
- `asana_update_task` - Update task
- `asana_create_subtask` - Create subtask

### Project Management
- `asana_search_projects` - Search projects
- `asana_get_project` - Get project details
- `asana_get_project_task_counts` - Get project stats

### Status & Comments
- `asana_get_stories_for_task` - Get task comments
- `asana_create_task_story` - Add comment
- `asana_create_project_status` - Create status update

### Relationships
- `asana_add_task_dependencies` - Add dependencies
- `asana_set_parent_for_task` - Set parent task

For complete list, call `POST /mcp` with `{"method": "tools/list"}`

## Authentication

### Method 1: Request Header (Recommended for n8n)
```
x-asana-token: your_asana_token_here
```

### Method 2: Environment Variable
```bash
ASANA_ACCESS_TOKEN=your_asana_token_here
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ASANA_ACCESS_TOKEN` | Yes | Asana personal access token |
| `PORT` | No | Server port (default: 3000, Render: 10000) |
| `NODE_ENV` | No | Environment (production/development) |
| `READ_ONLY_MODE` | No | Enable read-only mode (true/false) |

## Scripts

```bash
npm start              # Start MCP server (stdio)
npm run start:http     # Start HTTP server
npm run dev            # Development mode (stdio)
npm run dev:http       # Development mode (HTTP)
npm run build          # Build project
npm run test           # Test HTTP server
```

## Testing

```bash
# Test health
curl https://your-service.onrender.com/health

# List tools via MCP endpoint
curl -H "x-asana-token: YOUR_TOKEN" \
     -X POST https://your-service.onrender.com/mcp \
     -H "Content-Type: application/json" \
     -d '{"method": "tools/list"}'

# Test tool execution
curl -H "x-asana-token: YOUR_TOKEN" \
     -X POST https://your-service.onrender.com/mcp \
     -H "Content-Type: application/json" \
     -d '{"method": "tools/call", "params": {"name": "asana_list_workspaces"}}'
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**:
   - Verify Asana token is valid
   - Check token has proper permissions
   - Ensure token is passed in `x-asana-token` header

2. **404 Tool Not Found**:
   - Call `POST /mcp` with `{"method": "tools/list"}` to see available tools
   - Check tool name spelling

3. **CORS Issues**:
   - Server is configured for n8n domains
   - If using custom domain, update CORS settings

4. **Render Deployment Issues**:
   - Check build logs in Render dashboard
   - Verify environment variables are set
   - Ensure `PORT` is set to `10000`

## Security Considerations

1. **Token Security**: Store Asana tokens as n8n secrets, never in code
2. **HTTPS**: Always use HTTPS in production (Render provides this)
3. **CORS**: Server restricts origins to trusted domains
4. **Rate Limiting**: Consider adding rate limiting for production use

## License

MIT License - see LICENSE file for details.
