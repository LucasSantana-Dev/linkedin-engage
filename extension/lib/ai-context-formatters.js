(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInAIContextFormatters = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        /**
         * Format reaction counts into a readable string.
         * Returns empty string if no reactions or not an object.
         * @param {Object} reactions - Object with reaction type keys and count values
         * @returns {string} Formatted reaction context
         */
        function formatReactionContext(reactions) {
            if (!reactions || typeof reactions !== 'object') {
                return '';
            }
            var parts = [];
            if (reactions.ENTERTAINMENT)
                parts.push(reactions.ENTERTAINMENT + ' Funny');
            if (reactions.PRAISE)
                parts.push(reactions.PRAISE + ' Celebrate');
            if (reactions.EMPATHY)
                parts.push(reactions.EMPATHY + ' Support');
            if (reactions.INTEREST)
                parts.push(reactions.INTEREST + ' Insightful');
            if (reactions.APPRECIATION)
                parts.push(reactions.APPRECIATION + ' Love');
            if (reactions.LIKE)
                parts.push(reactions.LIKE + ' Like');
            if (parts.length === 0) return '';
            return '\nReactions: ' + parts.join(', ');
        }

        /**
         * Infer the author's role and tone from their title.
         * Returns empty string if no title provided.
         * @param {string} authorTitle - The author's title
         * @returns {string} Inferred role tone
         */
        function inferAuthorRoleTone(authorTitle) {
            var title = (authorTitle || '').toLowerCase();
            if (!title) return '';
            if (/recruit|talent|hr|people ops/.test(title)) {
                return 'career and people-focused';
            }
            if (/founder|ceo|coo|cfo|director|head of|vp/.test(title)) {
                return 'strategic and leadership-focused';
            }
            if (/engineer|developer|architect|devops|data|cto/.test(title)) {
                return 'technical peer-to-peer';
            }
            if (/product|designer|ux|ui/.test(title)) {
                return 'product and execution-focused';
            }
            return 'professional and practical';
        }

        /**
         * Format comment thread style context.
         * Returns empty string if no summary or count.
         * @param {Object} commentThreadSummary - Thread summary object
         * @returns {string} Formatted thread style context
         */
        function formatThreadStyleContext(commentThreadSummary) {
            if (!commentThreadSummary ||
                !commentThreadSummary.count) {
                return '';
            }
            var openers = commentThreadSummary.commonOpeners;
            var openerText = Array.isArray(openers) &&
                openers.length
                ? '\nCommon openings: ' +
                    openers.slice(0, 2).join(' | ')
                : '';
            return '\nComment thread style:' +
                '\n- dominant tone: ' +
                    commentThreadSummary.styleHint +
                '\n- dominant sentiment: ' +
                    commentThreadSummary.dominantSentiment +
                '\n- length style: ' +
                    commentThreadSummary.brevity +
                '\n- energy: ' +
                    commentThreadSummary.energy +
                openerText;
        }

        /**
         * Format comment thread topic context.
         * Returns empty string if no summary or count.
         * @param {Object} commentThreadSummary - Thread summary object
         * @returns {string} Formatted thread topic context
         */
        function formatThreadTopicContext(commentThreadSummary) {
            if (!commentThreadSummary ||
                !commentThreadSummary.count) {
                return '';
            }
            var keywords = Array.isArray(
                commentThreadSummary.keywords
            ) ? commentThreadSummary.keywords.slice(0, 6) : [];
            var phrases = Array.isArray(
                commentThreadSummary.samplePhrases
            ) ? commentThreadSummary.samplePhrases.slice(0, 2) : [];
            var keywordCtx = keywords.length
                ? '\nThread keywords: ' + keywords.join(', ')
                : '';
            var phraseCtx = phrases.length
                ? '\nThread phrase samples: ' +
                    phrases.join(' | ')
                : '';
            return keywordCtx + phraseCtx;
        }

        /**
         * Format image context from image signals.
         * Returns empty string if no image signals or no image present.
         * @param {Object} imageSignals - Image signals object
         * @returns {string} Formatted image context
         */
        function formatImageContext(imageSignals) {
            if (!imageSignals || !imageSignals.hasImage) {
                return '';
            }
            var cues = Array.isArray(imageSignals.cues)
                ? imageSignals.cues : [];
            var samples = Array.isArray(imageSignals.samples)
                ? imageSignals.samples : [];
            var cueText = cues.length
                ? '\nImage cues: ' + cues.join(', ')
                : '';
            var sampleText = samples.length
                ? '\nImage text hints: ' +
                    samples.slice(0, 2).join(' | ')
                : '';
            return '\nVisual context: post has image(s).' +
                cueText + sampleText;
        }

        /**
         * Format engagement context from reaction summary.
         * Returns empty string if no summary or no total reactions.
         * @param {Object} reactionSummary - Reaction summary object
         * @returns {string} Formatted engagement context
         */
        function formatEngagementContext(reactionSummary) {
            if (!reactionSummary ||
                !reactionSummary.total) {
                return '';
            }
            return '\nEngagement context:' +
                '\n- total reactions: ' + reactionSummary.total +
                '\n- dominant reaction: ' +
                    (reactionSummary.dominant || 'LIKE') +
                '\n- intensity: ' +
                    (reactionSummary.intensity || 'low');
        }

        /**
         * Format pattern profile context.
         * Returns empty string if no pattern profile.
         * @param {Object} patternProfile - Pattern profile object
         * @param {Object} guidance - Guidance object with optional properties
         * @returns {string} Formatted pattern profile context
         */
        function formatPatternProfileContext(patternProfile, guidance) {
            if (!patternProfile) return '';
            var openers = Array.isArray(guidance?.preferredOpeners)
                ? guidance.preferredOpeners.slice(0, 3) : [];
            var ngrams = Array.isArray(guidance?.topNgrams)
                ? guidance.topNgrams.slice(0, 8) : [];
            var openerCtx = openers.length
                ? '\n- preferred openers: ' + openers.join(' | ')
                : '';
            var ngramCtx = ngrams.length
                ? '\n- thread phrase atoms: ' + ngrams.join(', ')
                : '';
            return '\n\nTHREAD PATTERN PROFILE (primary):' +
                '\n- confidence: ' +
                    Number(patternProfile.patternConfidence || 0) +
                '\n- style family: ' +
                    (guidance?.styleFamily || 'neutral-ack') +
                '\n- length band: ' +
                    (guidance?.lengthBand || 'short') +
                '\n- tone intensity: ' +
                    (guidance?.toneIntensity || 'low') +
                '\n- punctuation rhythm: ' +
                    (guidance?.punctuationRhythm || 'balanced') +
                openerCtx +
                ngramCtx;
        }

        /**
         * Format learned pattern context from pattern memory.
         * Returns empty string if no bucket.
         * @param {Object} bucket - Pattern memory bucket
         * @param {Object} guidance - Guidance object with optional properties
         * @returns {string} Formatted learned pattern context
         */
        function formatLearnedPatternContext(bucket, guidance) {
            if (!bucket) return '';
            var openers = Array.isArray(guidance?.preferredOpeners)
                ? guidance.preferredOpeners.slice(0, 2) : [];
            var ngrams = Array.isArray(guidance?.topNgrams)
                ? guidance.topNgrams.slice(0, 6) : [];
            var openerCtx = openers.length
                ? '\n- learned openers: ' + openers.join(' | ')
                : '';
            var ngramCtx = ngrams.length
                ? '\n- learned n-grams: ' + ngrams.join(', ')
                : '';
            return '\n\nLEARNED MEMORY GUIDANCE (secondary):' +
                '\n- bucket confidence: ' +
                    Number(bucket.confidenceEma || 0) +
                '\n- preferred style family: ' +
                    (guidance?.styleFamily || 'neutral-ack') +
                '\n- preferred length: ' +
                    (guidance?.lengthBand || 'short') +
                openerCtx +
                ngramCtx;
        }

        return Object.freeze({
            formatReactionContext,
            inferAuthorRoleTone,
            formatThreadStyleContext,
            formatThreadTopicContext,
            formatImageContext,
            formatEngagementContext,
            formatPatternProfileContext,
            formatLearnedPatternContext
        });
    }
);
