import { Document, ScrapeOptions, URLTrace, scrapeOptions } from "../../controllers/v1/types";
import { logger } from "../logger";
import { getScrapeQueue } from "../../services/queue-service";
import { waitForJob } from "../../services/queue-jobs";
import { addScrapeJob } from "../../services/queue-jobs";
import { getJobPriority } from "../job-priority";
import type { Logger } from "winston";
import { getJobFromGCS } from "../gcs-jobs";

interface ScrapeDocumentOptions {
  url: string;
  teamId: string;
  origin: string;
  timeout: number;
  isSingleUrl?: boolean;
}

export async function scrapeDocument(
  options: ScrapeDocumentOptions,
  urlTraces: URLTrace[],
  logger: Logger,
  internalScrapeOptions: Partial<ScrapeOptions> = { onlyMainContent: false },
): Promise<Document | null> {
  const trace = urlTraces.find((t) => t.url === options.url);
  if (trace) {
    trace.status = "scraped";
    trace.timing.scrapedAt = new Date().toISOString();
  }

  async function attemptScrape(timeout: number) {
    const jobId = crypto.randomUUID();
    const jobPriority = await getJobPriority({
      team_id: options.teamId,
      basePriority: 10,
      from_extract: true,
    });

    await addScrapeJob(
      {
        url: options.url,
        mode: "single_urls",
        team_id: options.teamId,
        scrapeOptions: scrapeOptions.parse({ ...internalScrapeOptions }),
        internalOptions: {
          useCache: true,
          teamId: options.teamId,
          saveScrapeResultToGCS: process.env.GCS_FIRE_ENGINE_BUCKET_NAME ? true : false,
        },
        origin: options.origin,
        is_scrape: true,
        from_extract: true,
      },
      {},
      jobId,
      jobPriority,
    );

    const doc = await waitForJob(jobId, timeout);

    await getScrapeQueue().remove(jobId);

    if (trace) {
      trace.timing.completedAt = new Date().toISOString();
      trace.contentStats = {
        rawContentLength: doc.markdown?.length || 0,
        processedContentLength: doc.markdown?.length || 0,
        tokensUsed: 0,
      };
    }

    return doc;
  }

  try {
    try {
      logger.debug("Attempting scrape...");
      const x = await attemptScrape(options.timeout);
      logger.debug("Scrape finished!");
      return x;
    } catch (timeoutError) {
      logger.warn("Scrape failed.", { error: timeoutError });

      if (options.isSingleUrl) {
        // For single URLs, try again with double timeout
        logger.debug("Attempting scrape...");
        const x = await attemptScrape(options.timeout * 2);
        logger.debug("Scrape finished!");
        return x;
      }
      
      throw timeoutError;
    }
  } catch (error) {
    logger.error(`error in scrapeDocument`, { error });
    if (trace) {
      trace.status = "error";
      trace.error = error.message;
    }
    return null;
  }
}
