import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import sveltePlugin from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import prettierConfig from "eslint-config-prettier";

export default [
	js.configs.recommended,
	{
		files: ["**/*.{js,mjs,cjs,ts}"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				sourceType: "module",
				ecmaVersion: 2020,
			},
			globals: {
				browser: true,
				es2017: true,
				node: true,
			},
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			// TypeScript가 전역 타입/값을 체크하므로 no-undef는 비활성화
			// (Request, Response, Buffer 등 환경별 전역 때문에 pre-commit 훅이 실패하지 않도록 함)
			"no-undef": "off",
			"no-empty": "off",
			"require-yield": "off",
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-non-null-assertion": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports", fixStyle: "separate-type-imports" },
			],
			eqeqeq: ["error", "smart"],
			"no-console": ["warn", { allow: ["warn", "error"] }],
			"no-debugger": "error",
			"prefer-const": "error",
			"no-var": "error",
			curly: ["error", "all"],
			"object-shorthand": ["error", "always"],
		},
	},
	{
		files: ["**/*.svelte"],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser,
			},
		},
		plugins: {
			svelte: sveltePlugin,
		},
		rules: {
			...sveltePlugin.configs.recommended.rules,
		},
	},
	{
		ignores: ["*.cjs", "build/**", ".svelte-kit/**", "node_modules/**"],
	},
	prettierConfig,
];
