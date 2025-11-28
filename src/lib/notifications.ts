import * as OneSignal from '@onesignal/node-onesignal'

const app_key_provider = {
    getToken() {
        return (process.env.ONESIGNAL_API_KEY || process.env.ONESIGNAL_REST_API_KEY)!;
    }
};

const configuration = OneSignal.createConfiguration({
    authMethods: {
        app_key: {
            tokenProvider: app_key_provider
        }
    }
} as any);

const client = new OneSignal.DefaultApi(configuration);

type NotificationType = 'note' | 'event' | 'photo'

interface NotificationPayload {
  type: NotificationType
  targetUserId: string
  title: string
  message: string
  data?: any
}

export async function sendNotification({ type, targetUserId, title, message, data }: NotificationPayload) {
  const appId = process.env.ONESIGNAL_APP_ID || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_API_KEY || process.env.ONESIGNAL_REST_API_KEY

  console.log('[sendNotification] Checking credentials...')
  console.log('[sendNotification] App ID present:', !!appId)
  console.log('[sendNotification] API Key present:', !!apiKey)

  if (!appId || !apiKey) {
    console.warn('OneSignal credentials missing (App ID or API Key)')
    return
  }

  try {
    const notification = new OneSignal.Notification();
    notification.app_id = appId;
    // v5 uses include_aliases for external_id
    notification.include_aliases = {
        external_id: [targetUserId]
    };
    notification.headings = {
      en: title,
      fr: title,
    };
    notification.contents = {
      en: message,
      fr: message,
    };
    notification.data = {
      type,
      ...data
    };
    // Priority 10 is high
    notification.priority = 10;

    const response = await client.createNotification(notification);
    console.log(`[Notification] Sent ${type} to ${targetUserId}:`, response)
    return response
  } catch (e: any) {
    console.error('[Notification] Error sending:', e)
  }
}
