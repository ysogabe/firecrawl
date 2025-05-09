import { logger as _logger } from "../logger";
import { updateDeepResearch } from "./deep-research-redis";
import { searchAndScrapeSearchResult } from "../../controllers/v1/search";
import { ResearchLLMService, ResearchStateManager } from "./research-manager";
import { logJob } from "../../services/logging/log_job";
import { billTeam } from "../../services/billing/credit_billing";
import { ExtractOptions } from "../../controllers/v1/types";
import { CostTracking } from "../extract/extraction-service";
import { getACUCTeam } from "../../controllers/auth";
interface DeepResearchServiceOptions {
  researchId: string;
  teamId: string;
  query: string;
  maxDepth: number;
  maxUrls: number;
  timeLimit: number;
  analysisPrompt: string;
  systemPrompt: string;
  formats: string[];
  jsonOptions: ExtractOptions;
  subId?: string;
}

export async function performDeepResearch(options: DeepResearchServiceOptions) {
  const costTracking = new CostTracking();
  const { researchId, teamId, timeLimit, subId, maxUrls } = options;
  const startTime = Date.now();
  let currentTopic = options.query;
  let urlsAnalyzed = 0;

  const logger = _logger.child({
    module: "deep-research",
    method: "performDeepResearch",
    researchId,
  });

  logger.debug("[Deep Research] Starting research with options:", { options });

  const state = new ResearchStateManager(
    researchId,
    teamId,
    options.maxDepth,
    logger,
    options.query,
  );
  const llmService = new ResearchLLMService(logger);

  const acuc = await getACUCTeam(teamId);

  try {
    while (!state.hasReachedMaxDepth() && urlsAnalyzed < maxUrls) {
      logger.debug("[Deep Research] Current depth:", state.getCurrentDepth());
      const timeElapsed = Date.now() - startTime;
      if (timeElapsed >= timeLimit * 1000) {
        logger.debug("[Deep Research] Time limit reached, stopping research");
        break;
      }

      await state.incrementDepth();

      // Search phase
      await state.addActivity([{
        type: "search",
        status: "processing",
        message: `Generating deeper search queries for "${currentTopic}"`,
        timestamp: new Date().toISOString(),
        depth: state.getCurrentDepth(),
      }]);

      const nextSearchTopic = state.getNextSearchTopic();
      logger.debug("[Deep Research] Next search topic:", { nextSearchTopic });

      const searchQueries = (
        await llmService.generateSearchQueries(
          nextSearchTopic,
          state.getFindings(),
          costTracking,
        )
      ).slice(0, 3);

      logger.debug("[Deep Research] Generated search queries:", { searchQueries });

      await state.addActivity([{
        type: "search",
        status: "processing",
        message: `Starting ${searchQueries.length} parallel searches for "${currentTopic}"`,
        timestamp: new Date().toISOString(),
        depth: state.getCurrentDepth(),
      }]);
      await state.addActivity(searchQueries.map(searchQuery => ({
        type: "search",
        status: "processing", 
        message: `Searching for "${searchQuery.query}" - Goal: ${searchQuery.researchGoal}`,
        timestamp: new Date().toISOString(),
        depth: state.getCurrentDepth(),
      })))

      // Run all searches in parallel
      const searchPromises = searchQueries.map(async (searchQuery) => {

        const response = await searchAndScrapeSearchResult(searchQuery.query, {
          teamId: options.teamId,
          origin: "deep-research",
          timeout: 10000,
          scrapeOptions: {
            formats: ["markdown"],
            onlyMainContent: true,
            waitFor: 0,
            mobile: false,
            parsePDF: false,
            useMock: "none",
            skipTlsVerification: false,
            removeBase64Images: false,
            fastMode: false,
            blockAds: false,
          },
        }, logger, costTracking, acuc?.flags ?? null);
        return response.length > 0 ? response : [];
      });

      const searchResultsArrays = await Promise.all(searchPromises);
      const searchResults = searchResultsArrays.flat();

      logger.debug(
        "[Deep Research] Search results count:",
        { count: searchResults.length },
      );

      if (!searchResults || searchResults.length === 0) {
        logger.debug(
          "[Deep Research] No results found for topic:",
          { currentTopic },
        );
        await state.addActivity([{
          type: "search",
          status: "error",
          message: `No results found for any queries about "${currentTopic}"`,
          timestamp: new Date().toISOString(),
          depth: state.getCurrentDepth(),
        }]);
        continue;
      }

      // Filter out already seen URLs and track new ones
      const newSearchResults = searchResults.filter(async (result) => {
        if (!result.url || state.hasSeenUrl(result.url)) {
          return false;
        }
        state.addSeenUrl(result.url);
        
        urlsAnalyzed++;
        return true;
      });

      await state.addSources(newSearchResults.map((result) => ({
        url: result.url ?? "",
        title: result.title ?? "",
        description: result.description ?? "",
        icon: result.metadata?.favicon ?? "",
      })));
      logger.debug(
        "[Deep Research] New unique results count:",
        { length: newSearchResults.length },
      );

      if (newSearchResults.length === 0) {
        logger.debug(
          "[Deep Research] No new unique results found for topic:",
          { currentTopic },
        );
        await state.addActivity([{
          type: "search",
          status: "error",
          message: `Found ${searchResults.length} results but all URLs were already processed for "${currentTopic}"`,
          timestamp: new Date().toISOString(),
          depth: state.getCurrentDepth(),
        }]);
        continue;
      }

      await state.addActivity([{
        type: "search",
        status: "complete",
        message: `Found ${newSearchResults.length} new relevant results across ${searchQueries.length} parallel queries`,
        timestamp: new Date().toISOString(),
        depth: state.getCurrentDepth(),
      }]);

      await state.addFindings(
        newSearchResults.map((result) => ({
          text: result.markdown ?? "",
          source: result.url ?? "",
        })),
      );

      // Analysis phase
      await state.addActivity([{
        type: "analyze",
        status: "processing",
        message: "Analyzing findings and planning next steps",
        timestamp: new Date().toISOString(),
        depth: state.getCurrentDepth(),
      }]);

      const timeRemaining = timeLimit * 1000 - (Date.now() - startTime);
      logger.debug("[Deep Research] Time remaining (ms):", { timeRemaining });

      const analysis = await llmService.analyzeAndPlan(
        state.getFindings(),
        currentTopic,
        timeRemaining,
        options.systemPrompt ?? "",
        costTracking,
      );

      if (!analysis) {
        logger.debug("[Deep Research] Analysis failed");
        await state.addActivity([{
          type: "analyze",
          status: "error",
          message: "Failed to analyze findings",
          timestamp: new Date().toISOString(),
          depth: state.getCurrentDepth(),
        }]);

        state.incrementFailedAttempts();
        if (state.hasReachedMaxFailedAttempts()) {
          logger.debug("[Deep Research] Max failed attempts reached");
          break;
        }
        continue;
      }

      logger.debug("[Deep Research] Analysis result:", {
        nextTopic: analysis.nextSearchTopic,
        shouldContinue: analysis.shouldContinue,
        gapsCount: analysis.gaps.length,
      });

      state.setNextSearchTopic(analysis.nextSearchTopic || "");

      await state.addActivity([{
        type: "analyze",
        status: "complete",
        message: "Analyzed findings",
        timestamp: new Date().toISOString(),
        depth: state.getCurrentDepth(),
      }]);

      if (!analysis.shouldContinue || analysis.gaps.length === 0) {
        logger.debug("[Deep Research] No more gaps to research, ending search");
        break;
      }

      currentTopic = analysis.gaps[0] || currentTopic;
      logger.debug("[Deep Research] Next topic to research:", { currentTopic });
    }

    // Final synthesis
    logger.debug("[Deep Research] Starting final synthesis");
    await state.addActivity([{
      type: "synthesis",
      status: "processing",
      message: "Preparing final analysis",
      timestamp: new Date().toISOString(),
      depth: state.getCurrentDepth(),
    }]);

    let finalAnalysis = "";
    let finalAnalysisJson = null;
    if(options.formats.includes('json')) {
      finalAnalysisJson = await llmService.generateFinalAnalysis(
        options.query,
        state.getFindings(),
        state.getSummaries(),
        options.analysisPrompt,
        costTracking,
        options.formats,
        options.jsonOptions,
      );
    }
    if(options.formats.includes('markdown')) {
      finalAnalysis = await llmService.generateFinalAnalysis(
        options.query,
        state.getFindings(),
        state.getSummaries(),
        options.analysisPrompt,
        costTracking,
      );
    }

    await state.addActivity([{
      type: "synthesis",
      status: "complete",
      message: "Research completed",
      timestamp: new Date().toISOString(),
      depth: state.getCurrentDepth(),
    }]);

    const progress = state.getProgress();
    logger.debug("[Deep Research] Research completed successfully");

    // Log job with token usage and sources
    await logJob({
      job_id: researchId,
      success: true,
      message: "Research completed",
      num_docs: 1,
      docs: [{ finalAnalysis: finalAnalysis, sources: state.getSources(), json: finalAnalysisJson }],
      time_taken: (Date.now() - startTime) / 1000,
      team_id: teamId,
      mode: "deep-research",
      url: options.query,
      scrapeOptions: options,
      origin: "api",
      num_tokens: 0,
      tokens_billed: 0,
      cost_tracking: costTracking,
    });
    await updateDeepResearch(researchId, {
      status: "completed",
      finalAnalysis: finalAnalysis,
      json: finalAnalysisJson,
    });
    // Bill team for usage based on URLs analyzed
    billTeam(teamId, subId, Math.min(urlsAnalyzed, options.maxUrls), logger).catch(
      (error) => {
        logger.error(
          `Failed to bill team ${teamId} for ${urlsAnalyzed} URLs analyzed`, { teamId, count: urlsAnalyzed, error },
        );
      },
    );
    return {
      success: true,
      data: {
        finalAnalysis: finalAnalysis,
        sources: state.getSources(),
        json: finalAnalysisJson,
      },
    };
  } catch (error: any) {
    logger.error("Deep research error", { error });
    await updateDeepResearch(researchId, {
      status: "failed",
      error: error.message,
    });
    throw error;
  }
}
