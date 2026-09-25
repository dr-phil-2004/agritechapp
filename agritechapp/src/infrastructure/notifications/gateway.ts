export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationGateway {
  sendSms(to: string, message: string): Promise<DeliveryResult>;
  placeVoiceCall(to: string, audioUrl: string, lang: string): Promise<DeliveryResult>;
}

export type Lang = 'fr' | 'fon' | 'bariba';
