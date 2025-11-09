module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          browsers: [">0.2%", "not dead", "not op_mini all"]
        }
      }
    ],
    "@babel/preset-react",
    "@babel/preset-typescript"
  ],
  plugins: [
    [
      "@babel/plugin-transform-runtime",
      {
        regenerator: true
      }
    ],
    [
      "@babel/plugin-transform-class-properties",
      {
        loose: true
      }
    ],
    "@babel/plugin-proposal-object-rest-spread",
    "@babel/plugin-proposal-optional-chaining",
    "@babel/plugin-proposal-nullish-coalescing-operator"
  ]
};