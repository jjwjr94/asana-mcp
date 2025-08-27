# Asana MCP HTTP Server

A REST API server that exposes all Asana MCP tools via HTTP endpoints with streaming support, designed for integration with n8n and other automation platforms.

## Features

- **REST API**: All Asana MCP tools exposed as HTTP endpoints
- **Streaming Support**: Real-time updates via Server-Sent Events (SSE)
- **n8n Integration**: Designed specifically for n8n workflow automation
- **Authentication**: Support for Asana tokens via headers or environment variables
- **Docker Support**: Containerized deployment
- **Render Deployment**: Cloud deployment ready

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

4. **Deploy**: Render will automatically deploy your service

### Option 2: Docker Deployment

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-server-asana.git
cd mcp-server-asana

# Set your Asana token
export ASANA_ACCESS_TOKEN=your_token_here

# Build and run with docker-compose
docker-compose up -d

# Or build manually
docker build -t asana-mcp-http .
docker run -p 3000:3000 -e ASANA_ACCESS_TOKEN=$ASANA_ACCESS_TOKEN asana-mcp-http
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

# Start server
npm run start:http
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

Body: {
  "method": "prompts/list"
}

Body: {
  "method": "prompts/get",
  "params": {
    "name": "task-summary"
  }
}
```

### Legacy Endpoints (Backward Compatibility)

#### List Tools
```
GET /tools
```

#### Execute Tool (Legacy)
```
POST /tools/execute
Headers: x-asana-token: YOUR_ASANA_TOKEN
Body: {
  "toolName": "asana_search_tasks",
  "arguments": {
    "text": "project planning"
  }
}
```

#### Execute Tool (Direct)
```
POST /tools/asana_search_tasks
Headers: x-asana-token: YOUR_ASANA_TOKEN
Body: {
  "text": "project planning",
  "workspace": "1234567890"
}
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

#### List Available Tools
```
1. HTTP Request Node:
   - Method: POST
   - URL: https://your-service-name.onrender.com/mcp
   - Headers: x-asana-token: {{ $secret.asana_token }}
   - Body: {
       "method": "tools/list"
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

For complete list, call `GET /tools`

## Authentication

### Method 1: Request Header (Recommended for n8n)
```
x-asana-token: your_asana_token_here
```

### Method 2: Environment Variable
```bash
ASANA_ACCESS_TOKEN=your_asana_token_here
```

## Error Handling

The server returns appropriate HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized (invalid/missing token)
- `404` - Tool not found
- `500` - Internal server error

Error responses include JSON with `error` field:
```json
{
  "error": "Asana access token required"
}
```

## Streaming Support

The `/tools/execute` endpoint returns Server-Sent Events:

```
data: {"id":"req_123","type":"data","data":{"message":"Starting execution..."}}
data: {"id":"req_123","type":"data","data":{"result":{...}}}
data: {"id":"req_123","type":"complete","data":{"message":"Completed"}}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` (local), `10000` (Render) |
| `ASANA_ACCESS_TOKEN` | Asana personal access token | Required |
| `NODE_ENV` | Environment | `production` |
| `READ_ONLY_MODE` | Enable read-only mode | `false` |

## Troubleshooting

### Common Issues

1. **401 Unauthorized**:
   - Verify Asana token is valid
   - Check token has proper permissions
   - Ensure token is passed in `x-asana-token` header

2. **404 Tool Not Found**:
   - Call `GET /tools` to see available tools
   - Check tool name spelling

3. **CORS Issues**:
   - Server is configured for n8n domains
   - If using custom domain, update CORS settings

4. **Render Deployment Issues**:
   - Check build logs in Render dashboard
   - Verify environment variables are set
   - Ensure `PORT` is set to `10000`

### Debug Mode

For local development with detailed logging:
```bash
npm run dev:http
```

### Health Check

Test server status:
```bash
curl https://your-service-name.onrender.com/health
```

## Security Considerations

1. **Token Security**: Store Asana tokens as n8n secrets, never in code
2. **HTTPS**: Always use HTTPS in production (Render provides this)
3. **CORS**: Server restricts origins to trusted domains
4. **Rate Limiting**: Consider adding rate limiting for production use

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally: `npm run dev:http`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
