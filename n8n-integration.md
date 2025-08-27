# Asana MCP Server - n8n Integration Guide

This guide explains how to integrate the Asana MCP HTTP Server with n8n for workflow automation.

## Overview

The Asana MCP HTTP Server exposes all Asana MCP tools via REST API endpoints with streaming support, making it compatible with n8n's HTTP Request nodes.

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and version information.

### List Available Tools
```
GET /tools
```
Returns a list of all available Asana tools.

### Execute Tool (MCP HTTP Streaming)
```
POST /mcp
Headers: x-asana-token: YOUR_ASANA_TOKEN
Content-Type: application/json

{
  "method": "tools/call",
  "params": {
    "name": "asana_search_tasks",
    "arguments": {
      "text": "project planning"
    }
  }
}
```

### List Tools (MCP HTTP Streaming)
```
POST /mcp
Headers: x-asana-token: YOUR_ASANA_TOKEN
Content-Type: application/json

{
  "method": "tools/list"
}
```

### Legacy Execute Tool (Non-streaming)
```
POST /tools/{toolName}
Headers: x-asana-token: YOUR_ASANA_TOKEN
Content-Type: application/json

{
  "workspace": "1234567890",
  "text": "project planning"
}
```

### List Prompts
```
GET /prompts
Headers: x-asana-token: YOUR_ASANA_TOKEN
```

### Get Specific Prompt
```
GET /prompts/{promptName}
Headers: x-asana-token: YOUR_ASANA_TOKEN
```

## n8n Workflow Examples

### Example 1: Create a Task When a Form is Submitted

1. **Webhook Node** - Receive form data
2. **HTTP Request Node** - Create Asana task
   - Method: POST
   - URL: `http://your-server:3000/mcp`
   - Headers: 
     - `x-asana-token`: `{{ $secret.asana_token }}`
   - Body:
     ```json
     {
       "method": "tools/call",
       "params": {
         "name": "asana_create_task",
         "arguments": {
           "name": "{{ $json.title }}",
           "notes": "{{ $json.description }}",
           "projects": ["1234567890"],
           "due_on": "{{ $json.due_date }}"
         }
       }
     }
     ```

### Example 2: Get Task Updates with Streaming

1. **Cron Node** - Trigger every hour
2. **HTTP Request Node** - Get tasks with streaming
   - Method: POST
   - URL: `http://your-server:3000/mcp`
   - Headers:
     - `x-asana-token`: `{{ $secret.asana_token }}`
   - Body:
     ```json
     {
       "method": "tools/call",
       "params": {
         "name": "asana_search_tasks",
         "arguments": {
           "text": "updated today",
           "workspace": "1234567890"
         }
       }
     }
     ```
   - Response Format: Server-Sent Events (SSE)

### Example 3: Task Status Monitoring

1. **Cron Node** - Trigger every 30 minutes
2. **HTTP Request Node** - Get project tasks
   - Method: POST
   - URL: `http://your-server:3000/mcp`
   - Headers:
     - `x-asana-token`: `{{ $secret.asana_token }}`
   - Body:
     ```json
     {
       "method": "tools/call",
       "params": {
         "name": "asana_get_project_task_counts",
         "arguments": {
           "project_gid": "1234567890"
         }
       }
     }
     ```
3. **IF Node** - Check if tasks are overdue
4. **Slack Node** - Send notification

## Available Tools

### Task Management
- `asana_search_tasks` - Search for tasks
- `asana_get_task` - Get specific task details
- `asana_create_task` - Create a new task
- `asana_update_task` - Update task details
- `asana_create_subtask` - Create a subtask
- `asana_get_multiple_tasks_by_gid` - Get multiple tasks

### Project Management
- `asana_search_projects` - Search for projects
- `asana_get_project` - Get project details
- `asana_get_project_task_counts` - Get project statistics
- `asana_get_project_sections` - Get project sections

### Status Updates
- `asana_get_project_status` - Get project status
- `asana_get_project_statuses` - Get all project statuses
- `asana_create_project_status` - Create status update
- `asana_delete_project_status` - Delete status update

### Stories and Comments
- `asana_get_stories_for_task` - Get task stories
- `asana_create_task_story` - Add comment to task

### Relationships
- `asana_add_task_dependencies` - Add task dependencies
- `asana_add_task_dependents` - Add task dependents
- `asana_set_parent_for_task` - Set task parent

### Tags and Workspaces
- `asana_get_tasks_for_tag` - Get tasks by tag
- `asana_get_tags_for_workspace` - Get workspace tags
- `asana_list_workspaces` - List workspaces

## Error Handling

The server returns appropriate HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing parameters)
- `401` - Unauthorized (invalid or missing token)
- `404` - Tool not found
- `500` - Internal server error

Error responses include a JSON object with an `error` field containing the error message.

## Authentication

Two ways to authenticate:

1. **Environment Variable**: Set `ASANA_ACCESS_TOKEN` in your server environment
2. **Request Header**: Pass `x-asana-token` header with each request

For n8n workflows, use the second method and store your Asana token as an n8n secret.

## Streaming Support

The `/tools/execute` endpoint returns Server-Sent Events (SSE) format:

```
data: {"id":"req_1234567890","type":"data","data":{"message":"Starting execution..."}}
data: {"id":"req_1234567890","type":"data","data":{"result":{...}}}
data: {"id":"req_1234567890","type":"complete","data":{"message":"Tool execution completed"}}
```

This allows n8n to receive real-time updates during long-running operations.

## Deployment Options

### Docker
```bash
# Build and run with docker-compose
docker-compose up -d

# Or build manually
docker build -t asana-mcp-http .
docker run -p 3000:3000 -e ASANA_ACCESS_TOKEN=your_token asana-mcp-http
```

### Direct Node.js
```bash
# Install dependencies
npm install

# Build
npm run build

# Start server
npm run start:http
```

### Environment Variables
- `PORT` - Server port (default: 3000)
- `ASANA_ACCESS_TOKEN` - Your Asana personal access token
- `NODE_ENV` - Environment (development/production)
- `READ_ONLY_MODE` - Enable read-only mode (true/false)

## Security Considerations

1. **Token Management**: Use n8n secrets to store your Asana token
2. **Network Security**: Deploy behind a reverse proxy with HTTPS
3. **Access Control**: Consider implementing IP whitelisting if needed
4. **Rate Limiting**: Add rate limiting middleware for production use

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your Asana token is valid and has proper permissions
2. **404 Tool Not Found**: Verify the tool name is correct (check `/tools` endpoint)
3. **400 Bad Request**: Ensure all required parameters are provided
4. **Connection Issues**: Verify the server is running and accessible from n8n

### Debug Mode

Run the server in development mode for detailed logging:
```bash
npm run dev:http
```

### Health Check

Use the health check endpoint to verify server status:
```bash
curl http://your-server:3000/health
```
