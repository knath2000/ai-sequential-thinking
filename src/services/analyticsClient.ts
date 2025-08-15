/**
 * Analytics client for sending data to the admin backend
 */
import axios, { AxiosError } from 'axios';

interface UsageEventData {
  session_id?: string;
  event_type: string;
  tool_name?: string;
  response_time_ms?: number;
  success: boolean;
  error_message?: string;
  user_agent?: string;
  ip_address?: string;
  meta?: Record<string, any>;
}

interface PerformanceMetricData {
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  tags?: Record<string, any>;
}

interface ErrorLogData {
  session_id?: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  request_path?: string;
  request_method?: string;
  user_agent?: string;
  ip_address?: string;
  context?: Record<string, any>;
}

interface CostTrackingData {
  service_name: string;
  operation_type: string;
  tokens_used?: number;
  cost_usd: number;
  session_id?: string;
  request_id?: string;
  meta?: Record<string, any>;
}

class AnalyticsClient {
  private adminBackendUrl: string;
  private apiKey: string;
  private enabled: boolean;

  constructor() {
    this.adminBackendUrl = process.env.ADMIN_BACKEND_URL || '';
    this.apiKey = process.env.ADMIN_API_KEY || '';
    this.enabled = Boolean(this.adminBackendUrl && this.apiKey);
    
    if (!this.enabled) {
      console.warn('[AnalyticsClient] Admin backend URL or API key not configured. Analytics disabled.');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  private async makeRequest(endpoint: string, data: any): Promise<void> {
    if (!this.enabled) return;

    try {
      await axios.post(`${this.adminBackendUrl}/api/v1/analytics/${endpoint}`, data, {
        headers: this.getHeaders(),
        timeout: 5000
      });
    } catch (error) {
      // Log analytics errors but don't throw - we don't want analytics to break the main flow
      if (error instanceof AxiosError) {
        console.warn(`[AnalyticsClient] Failed to send ${endpoint}:`, error.message);
      } else {
        console.warn(`[AnalyticsClient] Unexpected error sending ${endpoint}:`, error);
      }
    }
  }

  async logUsageEvent(data: UsageEventData): Promise<void> {
    await this.makeRequest('events', data);
  }

  async logPerformanceMetric(data: PerformanceMetricData): Promise<void> {
    await this.makeRequest('metrics', data);
  }

  async logError(data: ErrorLogData): Promise<void> {
    await this.makeRequest('errors', data);
  }

  async logCost(data: CostTrackingData): Promise<void> {
    await this.makeRequest('costs', data);
  }

  // Convenience methods for common events
  async logToolCall(
    sessionId: string,
    toolName: string,
    responseTimeMs: number,
    success: boolean,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logUsageEvent({
      session_id: sessionId,
      event_type: 'tool_call',
      tool_name: toolName,
      response_time_ms: responseTimeMs,
      success,
      error_message: errorMessage,
      meta: metadata
    });
  }

  async logWebhookEvent(
    sessionId: string,
    webhookType: string,
    success: boolean,
    processingTimeMs?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logUsageEvent({
      session_id: sessionId,
      event_type: 'webhook',
      tool_name: webhookType,
      response_time_ms: processingTimeMs,
      success,
      meta: metadata
    });
  }

  async logModalCost(
    sessionId: string,
    operationType: string,
    tokensUsed?: number,
    costUsd?: number,
    requestId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (costUsd !== undefined) {
      await this.logCost({
        service_name: 'modal',
        operation_type: operationType,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        session_id: sessionId,
        request_id: requestId,
        meta: metadata
      });
    }
  }

  async logLangDBCost(
    sessionId: string,
    model: string,
    tokensUsed?: number,
    costUsd?: number,
    requestId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (costUsd !== undefined) {
      await this.logCost({
        service_name: 'langdb',
        operation_type: 'chat_completion',
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        session_id: sessionId,
        request_id: requestId,
        meta: { model, ...metadata }
      });
    }
  }

  async logSystemMetric(
    metricName: string,
    value: number,
    unit?: string,
    tags?: Record<string, any>
  ): Promise<void> {
    await this.logPerformanceMetric({
      metric_name: metricName,
      metric_value: value,
      metric_unit: unit,
      tags
    });
  }
}

// Singleton instance
export const analyticsClient = new AnalyticsClient();
