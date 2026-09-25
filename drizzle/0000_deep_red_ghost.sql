CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_message` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`llm_calls` integer DEFAULT 0 NOT NULL,
	`decision_calls` integer DEFAULT 0 NOT NULL,
	`tool_calls` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`latency_ms` integer,
	`estimated_cost` real,
	`routing` text,
	`answer` text,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `agent_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`provider` text,
	`model` text,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`latency_ms` integer,
	`input_tokens` integer,
	`output_tokens` integer,
	`parallel_group` text,
	`input` text,
	`output` text,
	FOREIGN KEY (`run_id`) REFERENCES `agent_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `investment_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`run_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `model_settings` (
	`agent` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tool_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`step_id` text,
	`tool` text NOT NULL,
	`input` text,
	`output` text,
	`latency_ms` integer,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `agent_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`step_id`) REFERENCES `agent_steps`(`id`) ON UPDATE no action ON DELETE no action
);
