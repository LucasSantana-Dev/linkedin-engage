module.exports = {
    collectCoverageFrom: [
        'extension/lib/**/*.js'
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/'
    ],
    coverageThreshold: {
        global: {
            statements: 93,
            branches: 81,
            functions: 98,
            lines: 95
        }
    },
    forceExit: true
};
