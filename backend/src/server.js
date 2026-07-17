import { Hono } from 'hono';

const app = new Hono();

// Simple health check route
app.get('/', (c) => {
    return c.text('GameKart Authoritative Bun Server Running!');
});

console.log("GameServer starting on port 4000...");

// Export the Bun.serve configuration
export default {
    port: 4000,
    fetch: app.fetch,
    websocket: {
        open(ws) {
            console.log('WebSocket connection opened');
            ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to GameServer' }));
        },
        message(ws, message) {
            console.log(`Received message: ${message}`);
            ws.send(JSON.stringify({ type: 'echo', data: message }));
        },
        close(ws, code, message) {
            console.log(`WebSocket connection closed: ${code} - ${message}`);
        }
    }
};
