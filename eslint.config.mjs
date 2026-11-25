import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

export default [
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      "**/*.js",
      "**/*.mjs",
      "**/*.cjs",
      "**/*.ts",
    ],
  },
  firebaseRulesPlugin.configs["flat/recommended"],
];
