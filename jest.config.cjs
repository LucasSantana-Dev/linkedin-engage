module.exports = {
    collectCoverageFrom: [
        'extension/lib/**/*.js'
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/'
    ],
    coverageThreshold: {
        global: {
            statements: 91,
            branches: 78,
            functions: 96,
            lines: 93
        }
    },
    forceExit: true
};
