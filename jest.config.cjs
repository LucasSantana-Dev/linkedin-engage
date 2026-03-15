module.exports = {
    collectCoverageFrom: [
        'extension/lib/**/*.js'
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/'
    ],
    coverageThreshold: {
        global: {
            statements: 84,
            branches: 70,
            functions: 90,
            lines: 88
        }
    }
};
