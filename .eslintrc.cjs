module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	extends: [
		"plugin:@typescript-eslint/recommended",
		"plugin:svelte/recommended",
		"eslint:recommended",
		"prettier",
	],
	plugins: ["@typescript-eslint"],
	ignorePatterns: ["*.cjs"],
	overrides: [
		{
			files: ["*.svelte"],
			parser: "svelte-eslint-parser",
			parserOptions: {
				parser: "@typescript-eslint/parser",
			},
		},
		{
			files: ["*.ts", "*.tsx"],
			rules: {
				"no-undef": "off", // TypeScript가 타입 체크를 수행하므로 비활성화
			},
		},
		{
			files: ["*.js", "*.jsx"],
			rules: {
				"no-undef": "error", // JavaScript 파일에 대해서는 활성화
			},
		},
	],
	parserOptions: {
		sourceType: "module",
		ecmaVersion: 2020,
		extraFileExtensions: [".svelte"],
	},
	rules: {
		"no-empty": "off",
		"require-yield": "off",
		"no-undef": "off", // TypeScript가 타입 체크를 수행하므로 비활성화
		"@typescript-eslint/no-explicit-any": "error",
		"@typescript-eslint/no-non-null-assertion": "error",
		"@typescript-eslint/no-unused-vars": [
			// prevent variables with a _ prefix from being marked as unused
			"error",
			{
				argsIgnorePattern: "^_",
			},
		],
		// Enforce safer, consistent TS/JS patterns across src/
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
	env: {
		browser: true,
		es2017: true,
		node: true,
	},
	globals: {
		HeadersInit: "readonly",
		AbortSignal: "readonly",
		AbortController: "readonly",
		FormData: "readonly",
		File: "readonly",
		Response: "readonly",
		Request: "readonly",
		ReadableStream: "readonly",
		TextDecoderStream: "readonly",
		Buffer: "readonly",
		fetch: "readonly",
		setTimeout: "readonly",
		clearTimeout: "readonly",
		console: "readonly",
		NodeJS: "readonly",
		App: "readonly",
	},
};
