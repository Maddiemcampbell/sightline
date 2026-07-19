import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from "@/features/email/provider";
import { EmailProviderError } from "@/features/email/provider";

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const response = await this.fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!response.ok) {
      const providerMessage = await readProviderError(response);
      throw new EmailProviderError(
        providerMessage
          ? `Resend rejected the email: ${providerMessage}`
          : `Resend rejected the email with status ${response.status}.`,
        response.status === 429 || response.status >= 500,
      );
    }
    const payload: unknown = await response.json();
    if (!isSendResponse(payload)) {
      throw new EmailProviderError(
        "Resend returned an invalid response.",
        true,
      );
    }
    return { providerMessageId: payload.id };
  }
}

async function readProviderError(response: Response): Promise<string | null> {
  try {
    const payload: unknown = await response.json();
    if (
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
    ) {
      return payload.message.slice(0, 500);
    }
  } catch {
    // The status code remains useful when the provider returns a non-JSON body.
  }
  return null;
}

function isSendResponse(value: unknown): value is { id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  );
}
