export interface IWhatsAppService {
  /**
   * Send a plain text message. Phone must be in E.164 format ("+94771234567").
   * The service prepends "whatsapp:" internally.
   */
  sendTextMessage(
    to: string,
    body: string,
  ): Promise<{ messageSid: string }>;

  /**
   * Send a message with a media attachment (image/PDF URL).
   */
  sendMediaMessage(
    to: string,
    body: string,
    mediaUrl: string,
  ): Promise<{ messageSid: string }>;
}

/**
 * Optional context attached to each outbound message for the WhatsAppLog
 * row. Used so admin UI can link a log entry back to the appointment it
 * relates to.
 */
export interface SendContext {
  appointmentId?: string;
}
