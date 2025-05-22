import axios from "axios";
import { logger as _logger } from "../lib/logger";
import { supabase_rr_service, supabase_service } from "./supabase";
import { WebhookEventType } from "../types";
import { configDotenv } from "dotenv";
import { z } from "zod";
import { webhookSchema } from "../controllers/v1/types";
configDotenv();

export const callWebhook = async (
  teamId: string,
  id: string,
  data: any | null,
  specified?: z.infer<typeof webhookSchema>,
  v1 = false,
  eventType: WebhookEventType = "crawl.page",
  awaitWebhook: boolean = false,
) => {
  const logger = _logger.child({
    module: "webhook",
    method: "callWebhook",
    teamId, team_id: teamId,
    crawlId: id,
    eventType,
    awaitWebhook,
    webhook: specified,
    isV1: v1,
  });

  if (specified) {
    let subType = eventType.split(".")[1];
    if (!specified.events.includes(subType as any)) {
      logger.debug("Webhook event type not in specified events", {
        subType,
        specified,
      });
      return false;
    }
  }

  try {
    const selfHostedUrl = process.env.SELF_HOSTED_WEBHOOK_URL?.replace(
      "{{JOB_ID}}",
      id,
    );
    const useDbAuthentication = process.env.USE_DB_AUTHENTICATION === "true";
    let webhookUrl =
      specified ??
      (selfHostedUrl ? webhookSchema.parse({ url: selfHostedUrl }) : undefined);

    // Only fetch the webhook URL from the database if the self-hosted webhook URL and specified webhook are not set
    // and the USE_DB_AUTHENTICATION environment variable is set to true
    if (!webhookUrl && useDbAuthentication) {
      const { data: webhooksData, error } = await supabase_rr_service
        .from("webhooks")
        .select("url")
        .eq("team_id", teamId)
        .limit(1);
      if (error) {
        logger.error(
          `Error fetching webhook URL for team`,
          {
            error,
          },
        );
        return null;
      }

      if (!webhooksData || webhooksData.length === 0) {
        return null;
      }

      webhookUrl = webhooksData[0].url;
    }

    logger.debug("Calling webhook...", {
      webhookUrl,
    });

    if (!webhookUrl) {
      return null;
    }

    let dataToSend: any[] = [];
    if (
      data &&
      data.result &&
      data.result.links &&
      data.result.links.length !== 0
    ) {
      for (let i = 0; i < data.result.links.length; i++) {
        if (v1) {
          dataToSend.push(data.result.links[i].content);
        } else {
          dataToSend.push({
            content: data.result.links[i].content.content,
            markdown: data.result.links[i].content.markdown,
            metadata: data.result.links[i].content.metadata,
          });
        }
      }
    }

    if (awaitWebhook) {
      try {
        await axios.post(
          webhookUrl.url,
          {
            success: !v1
              ? data.success
              : eventType === "crawl.page"
                ? data.success
                : true,
            type: eventType,
            [v1 ? "id" : "jobId"]: id,
            data: dataToSend,
            error: !v1
              ? data?.error || undefined
              : eventType === "crawl.page"
                ? data?.error || undefined
                : undefined,
            metadata: webhookUrl.metadata || undefined,
          },
          {
            headers: {
              "Content-Type": "application/json",
              ...webhookUrl.headers,
            },
            timeout: v1 ? 10000 : 30000, // 10 seconds timeout (v1)
          },
        );
      } catch (error) {
        logger.error(
          `Failed to send webhook`,
          {
            error,
          },
        );
      }
    } else {
      axios
        .post(
          webhookUrl.url,
          {
            success: !v1
              ? data.success
              : eventType === "crawl.page"
                ? data.success
                : true,
            type: eventType,
            [v1 ? "id" : "jobId"]: id,
            data: dataToSend,
            error: !v1
              ? data?.error || undefined
              : eventType === "crawl.page"
                ? data?.error || undefined
                : undefined,
            metadata: webhookUrl.metadata || undefined,
          },
          {
            headers: {
              "Content-Type": "application/json",
              ...webhookUrl.headers,
            },
          },
        )
        .catch((error) => {
          logger.error(
            `Failed to send webhook`,
            {
              error,
            },
          );
        });
    }
  } catch (error) {
    logger.debug(
      `Error sending webhook`,
      {
        error,
      },
    );
  }
};
