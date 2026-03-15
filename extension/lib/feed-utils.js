if (typeof require === 'function' &&
    typeof module !== 'undefined' &&
    typeof POST_CATEGORIES === 'undefined') {
    var {
        POST_CATEGORIES, CATEGORY_TEMPLATES,
        CATEGORY_TEMPLATES_PT,
        CATEGORY_FOLLOW_UPS,
        CATEGORY_FOLLOW_UPS_PT,
        OPENERS, OPENERS_PT,
        TOPIC_MAP, HIGH_SIGNAL_CATEGORIES,
        PT_MARKERS, CONCEPT_PATTERNS,
        COMPOSED_EN, COMPOSED_PT
    } = require('./templates.js');
    var {
        normalizeCopyGuardText, assessCommentCopyRisk
    } = require('./feed-copy-guard.js');
    var {
        extractTopic, detectLanguage, extractKeyPhrase,
        extractConcepts
    } = require('./feed-nlp-utils.js');
    var {
        classifyCommentSentiment, summarizeCommentThread,
        SENTIMENT_PATTERNS
    } = require('./feed-comment-analysis.js');
    var {
        getReactionType, classifyPost, isPolemicPost,
        detectCareerTransitionSignals
    } = require('./feed-post-classification.js');
    var {
        isReactablePost, shouldSkipPost, isCompanyFollowText,
        getPostText, getPostAuthor, getPostAuthorTitle,
        getPostReactions, getPostUrn, isLikeButton,
        isCommentButton, summarizeReactions,
        getPostImageSignals, getPostCommentSignal,
        getExistingComments, BOILERPLATE_RE
    } = require('./feed-dom-extraction.js');
    var {
        analyzeCommentPatterns, validateCommentPatternFit
    } = require('./feed-comment-patterns.js');
    var {
        isLowQualityComment, validateGeneratedCommentSafety,
        assessStrangerDistanceRisk
    } = require('./feed-safety-guards.js');
    var {
        humanize, buildCommentFromPost
    } = require('./feed-comment-generation.js');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getReactionType,
        classifyPost,
        buildCommentFromPost,
        extractTopic,
        extractKeyPhrase,
        extractConcepts,
        humanize,
        detectLanguage,
        isReactablePost,
        shouldSkipPost,
        isCompanyFollowText,
        getPostText,
        getPostAuthor,
        getPostAuthorTitle,
        getPostReactions,
        getPostUrn,
        isLowQualityComment,
        validateGeneratedCommentSafety,
        detectCareerTransitionSignals,
        isLikeButton,
        isCommentButton,
        getExistingComments,
        classifyCommentSentiment,
        summarizeCommentThread,
        analyzeCommentPatterns,
        summarizeReactions,
        getPostImageSignals,
        getPostCommentSignal,
        assessCommentCopyRisk,
        assessStrangerDistanceRisk,
        validateCommentPatternFit,
        isPolemicPost,
        BOILERPLATE_RE,
        SENTIMENT_PATTERNS,
        POST_CATEGORIES,
        CATEGORY_TEMPLATES,
        CATEGORY_TEMPLATES_PT,
        TOPIC_MAP
    };
}
