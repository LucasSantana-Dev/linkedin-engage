function gaussianRandom(mean, stdDev) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) *
        Math.cos(2.0 * Math.PI * v);
    return mean + z * stdDev;
}

function humanDelay(baseMs, varianceMs) {
    const base = baseMs || 2000;
    const variance = varianceMs || base * 0.4;
    const delay = Math.max(
        500,
        gaussianRandom(base, variance)
    );
    if (Math.random() < 0.08) {
        return delay + gaussianRandom(5000, 2000);
    }
    return Math.round(delay);
}

function scrollVariation() {
    const base = window.innerHeight * 0.8;
    const variation = base * (0.6 + Math.random() * 0.8);
    return Math.round(variation);
}

function scrollBehavior() {
    const behaviors = ['smooth', 'smooth', 'auto'];
    return behaviors[
        Math.floor(Math.random() * behaviors.length)
    ];
}

function sessionProfile() {
    const avgDelay = 2000 + Math.random() * 3000;
    const burstChance = 0.05 + Math.random() * 0.1;
    const pauseChance = 0.03 + Math.random() * 0.07;
    const scrollMultiplier = 0.7 + Math.random() * 0.6;
    return {
        avgDelay,
        burstChance,
        pauseChance,
        scrollMultiplier
    };
}

function shouldTakePause(profile, actionCount) {
    if (actionCount > 0 && actionCount % 7 === 0) {
        if (Math.random() < 0.4) return true;
    }
    const chance = profile?.pauseChance ?? 0.05;
    if (chance <= 0) return false;
    return Math.random() < chance;
}

function pauseDuration() {
    return Math.round(
        gaussianRandom(15000, 5000)
    );
}

function actionDelay(profile) {
    const base = profile?.avgDelay || 3000;
    let d = humanDelay(base, base * 0.3);
    if (Math.random() < (profile?.burstChance || 0.08)) {
        d = humanDelay(800, 300);
    }
    return d;
}

function mouseJitter() {
    return {
        x: Math.round(gaussianRandom(0, 3)),
        y: Math.round(gaussianRandom(0, 3))
    };
}

function typingDelay(textLength) {
    const charMs = gaussianRandom(45, 15);
    const thinkMs = gaussianRandom(500, 200);
    return Math.round(
        Math.max(300, thinkMs + textLength * charMs)
    );
}

function shouldSimulateReading(textLength) {
    if (textLength < 50) return false;
    return Math.random() < 0.6;
}

function readingDuration(textLength) {
    const wpm = gaussianRandom(220, 40);
    const words = textLength / 5;
    const ms = (words / wpm) * 60000;
    return Math.round(
        Math.max(800, Math.min(ms, 8000))
    );
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        gaussianRandom,
        humanDelay,
        scrollVariation,
        scrollBehavior,
        sessionProfile,
        shouldTakePause,
        pauseDuration,
        actionDelay,
        mouseJitter,
        typingDelay,
        shouldSimulateReading,
        readingDuration
    };
}
