//! WebSocket sync endpoint for real-time cross-app communication.
// Uses ws library attached to the Node.js HTTP server via serverExternalPackages.

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@ultraia/core';
import { getConnectedCount, getConnectedClients } from '@/lib/ws-handler';

/** GET /api/sync — returns connection status (WS upgrade handled by instrumentation). */
export async function GET(_req: NextRequest) {
  const orch = getOrchestrator();
  return NextResponse.json({
    status: 'ok',
    message: 'WebSocket upgrade endpoint. Connect via ws://host/api/sync?token=<token>&appId=<id>',
    connectedClients: getConnectedCount(),
    clientIds: getConnectedClients(),
    apps: orch.getConnectedApps(),
  });
}
