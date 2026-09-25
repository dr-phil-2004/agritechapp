import { NotificationGateway, DeliveryResult } from './gateway';

export class SimulatedGateway implements NotificationGateway {
  private smsLog: Array<{ to: string; message: string; timestamp: Date }> = [];
  private callLog: Array<{ to: string; audioUrl: string; lang: string; timestamp: Date }> = [];

  async sendSms(to: string, message: string): Promise<DeliveryResult> {
    const sms = {
      to,
      message,
      timestamp: new Date(),
    };
    this.smsLog.push(sms);
    console.log('[SIMULATED SMS]', sms);
    
    return {
      success: true,
      messageId: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async placeVoiceCall(to: string, audioUrl: string, lang: string): Promise<DeliveryResult> {
    const call = {
      to,
      audioUrl,
      lang,
      timestamp: new Date(),
    };
    this.callLog.push(call);
    console.log('[SIMULATED CALL]', call);
    
    return {
      success: true,
      messageId: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  getSmsLog() {
    return this.smsLog;
  }

  getCallLog() {
    return this.callLog;
  }

  clearLogs() {
    this.smsLog = [];
    this.callLog = [];
  }
}
