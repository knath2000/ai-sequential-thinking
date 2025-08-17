export function createErrorLogger(analyticsClient: any) {
  return async (error: Error, context: any = {}) => {
    try {
      await analyticsClient.logError({
        error_type: error.name || 'UnknownError',
        error_message: error.message,
        stack_trace: error.stack,
        context: {
          ...context,
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  };
}
