module.exports = {
    collectCoverageFrom: [
        'extension/lib/**/*.js'
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/'
    ],
    coverageThreshold: {
        global: {
            statements: 94,
            branches: 83,
            functions: 98,
            lines: 96
        }
    },
    forceExit: true
};
